/**
 * CuttingToolsAI Weekly Research Agent — Cloudflare Worker
 * =========================================================
 * Cron: her Pazartesi 06:00 UTC ("0 6 * * 1")
 *
 * Akış:
 *   1. RESEARCH_SOURCES index sayfalarını çek, aday makale linklerini çıkar (kaynak başına max 5)
 *   2. URL SHA-256 hash'i TA_RESEARCH KV'de varsa atla (dedup)
 *   3. Yeni makaleyi çek → tag'leri soy → ~8000 karaktere kes
 *   4. Anthropic API ile değerlendir (why-layer perspektifinden, strict JSON)
 *   5. Sonuçları tek HTML e-posta olarak Resend ile Murat'a gönder
 *   6. Başarıyla işlenen URL hash'lerini KV'ye yaz (TTL yok)
 *
 * Hiçbir şey otomatik commit edilmez — e-posta sadece öneri içerir.
 *
 * Manuel tetikleme: POST https://<worker-url>/run
 * Durum:           GET  https://<worker-url>/status
 *
 * Gerekli Secrets (wrangler secret put <KEY>):
 *   ANTHROPIC_API_KEY — makale değerlendirme
 *   RESEND_API_KEY    — e-posta gönderimi
 */

'use strict';

const ANTHROPIC_MODEL    = 'claude-sonnet-4-20250514';
const MAX_LINKS_PER_SOURCE = 5;
const ARTICLE_TEXT_LIMIT   = 8000;
const MAX_EMAIL_ITEMS      = 8; // e-postaya giren max madde; fazlası KV'de işaretli kalır

// ─── Kaynaklar ─────────────────────────────────────────────────────────────
// linkHint: href'in eşleşmesi beklenen alt-string/regex ipucu. Sayfa yapıları
// farklı olduğundan çıkarım toleranslıdır; eşleşme yoksa kaynak sessizce boş döner.

const RESEARCH_SOURCES = [
  {
    name: 'Sandvik Coromant',
    indexUrl: 'https://www.sandvik.coromant.com/en-gb/knowledge',
    linkHint: /\/knowledge\/[a-z0-9-]+/i
  },
  {
    name: 'ISCAR',
    indexUrl: 'https://www.iscar.com/Media.aspx',
    linkHint: /(article|media|newitem|techinfo)/i
  },
  {
    name: 'Walter',
    indexUrl: 'https://www.walter-tools.com/en-gb/press/media-portal',
    linkHint: /\/(press|news|stories|media-portal)\/[a-z0-9-]+/i
  },
  {
    name: 'Seco',
    indexUrl: 'https://www.secotools.com/article',
    linkHint: /\/article\/[a-z0-9-]+/i
  },
  {
    name: 'Kennametal',
    indexUrl: 'https://www.kennametal.com/us/en/resources.html',
    linkHint: /\/(resources|blog|engineering)\/[a-z0-9-]+/i
  }
];

// ─── Why-Layer İlkeleri ────────────────────────────────────────────────────
// Keep in sync with agent_docs/why-layer.md

const WHY_LAYER_PRINCIPLES = `
1. Plowing signature on hard materials — Over-reinforced edges on hard materials show a plowing signature (sound change, chip/tool visual change, edge discoloration without coolant, degrading feed on the display); the fix is backing off edge prep, not speed.
2. Diagnostic chain & material-relative chip reading — Diagnose in order: sound → chip form → finished-part dimension/surface. Chip reading is material-relative: soft gummy materials need SHORT chips, on hard materials a LONG chip is a health sign. Never judge chip length without asking the material first.
3. Drill point geometry is a package — Point angle is never an isolated choice; it ships with relief, helix, facet style and backward taper as one designed package. Never recommend a point angle alone; regrinding only the point degrades the design intent.
4. Aluminum smearing is a secondary symptom — On N-group, chip smearing usually follows outer-corner wear: the dulled corner plows instead of shearing and the chip welds. First question: "is the outer corner still sharp?" — before coolant or parameters.
5. Single-unit trial adoption — Small/mid-size shops decide by numbers, not brand habit: frame every equivalent recommendation as a low-risk single-unit trial on a real job, never a bulk switch.
6. Premium brand + application support for high-volume OEMs — Large-volume series production rationally defaults to established brands because the premium buys on-site application support. Brand-neutral means being honest about this too.
7. A tool is better FOR a process chain — A tool is never better in isolation; an outstanding finish can be a defect (e.g. paint adhesion failure). Always ask what happens to the surface next (coating, painting, bonding, fits).
`.trim();

// ─── Entry Point ───────────────────────────────────────────────────────────

export default {
  async scheduled(event, env, ctx) {
    // event.cron üzerinden dallan: ileride başka cron eklenirse akışlar ayrı kalır
    if (event.cron === '0 6 * * 1') {
      ctx.waitUntil(runWeeklyResearch(env));
    }
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/run' && request.method === 'POST') {
      // waitUntil HTTP isteklerinde erken kesilebiliyor; manuel testte sonuna kadar bekle
      const summary = await runWeeklyResearch(env);
      return json({ ok: true, ...summary });
    }

    if (url.pathname === '/status') {
      const lastRun = await env.TA_RESEARCH.get('research_last_run');
      const log     = await env.TA_RESEARCH.get('research_log');
      return json({ lastRun, log });
    }

    return new Response(
      'CuttingToolsAI Weekly Research Worker\n' +
      'POST /run    — manuel tetikle\n' +
      'GET  /status — son çalıştırma bilgisi',
      { status: 200, headers: { 'Content-Type': 'text/plain' } }
    );
  }
};

// ─── Ana Akış ──────────────────────────────────────────────────────────────

async function runWeeklyResearch(env) {
  const startTime = Date.now();
  const logs = [];
  const log = (...msg) => { const line = msg.join(' '); console.log(line); logs.push(line); };

  log(`Weekly research start ${new Date().toISOString()}`);

  const items = [];        // { source, url, title, eval: {...} }
  const parseFailed = [];  // { source, url, reason }
  const sourceErrors = []; // { source, reason }

  for (const source of RESEARCH_SOURCES) {
    try {
      const links = await collectLinks(source, log);
      for (const link of links) {
        const hash = await sha256Hex(link);
        try {
          if (await env.TA_RESEARCH.get(hash)) {
            log(`  skip (seen): ${link}`);
            continue;
          }

          const article = await fetchArticleText(link);
          if (!article.text) {
            parseFailed.push({ source: source.name, url: link, reason: 'empty article body' });
            continue;
          }

          const evaluation = await evaluateArticle(env, source.name, link, article.text);
          if (evaluation === null) {
            // JSON parse hatası — sessizce kaybetme, e-postada "parse failed" altında raporla.
            // Hash YAZILMAZ ki gelecek hafta yeniden denensin.
            parseFailed.push({ source: source.name, url: link, reason: 'Claude JSON parse failed' });
            continue;
          }

          await env.TA_RESEARCH.put(hash, new Date().toISOString());

          if (evaluation.relevant === true) {
            items.push({ source: source.name, url: link, title: article.title || link, eval: evaluation });
            log(`  + relevant: ${link}`);
          } else {
            log(`  - not relevant: ${link}`);
          }
        } catch (e) {
          parseFailed.push({ source: source.name, url: link, reason: e.message });
          log(`  ! article error: ${link} — ${e.message}`);
        }
      }
    } catch (e) {
      sourceErrors.push({ source: source.name, reason: e.message });
      log(`! source failed: ${source.name} — ${e.message}`);
    }
  }

  // E-posta — sıfır sonuçta bile gönder ki sessizlik ≠ bozuk cron
  try {
    await sendEmail(env, items, parseFailed, sourceErrors);
    log(`email sent: ${items.length} items, ${parseFailed.length} parse-failed`);
  } catch (e) {
    log(`! email failed: ${e.message}`);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  log(`done in ${elapsed}s`);
  await env.TA_RESEARCH.put('research_last_run', new Date().toISOString());
  await env.TA_RESEARCH.put('research_log', logs.slice(-30).join('\n'));

  return {
    items: items.length,
    parseFailed: parseFailed.length,
    sourceErrors: sourceErrors.length,
    elapsedSeconds: elapsed,
    log: logs
  };
}

// ─── Link Toplama ──────────────────────────────────────────────────────────

async function collectLinks(source, log) {
  log(`source: ${source.name}`);
  const res = await fetch(source.indexUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CuttingToolsAI-Research/1.0)',
      'Accept': 'text/html'
    },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`index fetch ${res.status}`);
  const html = await res.text();

  const base = new URL(source.indexUrl);
  const seen = new Set();
  const links = [];

  // Toleranslı çıkarım: tüm href'leri tara, ipucuyla filtrele. DOM kütüphanesi yok.
  const hrefRe = /href\s*=\s*["']([^"'#]+)["']/gi;
  let m;
  while ((m = hrefRe.exec(html)) !== null && links.length < MAX_LINKS_PER_SOURCE) {
    let href = m[1].trim();
    if (/^(mailto:|tel:|javascript:)/i.test(href)) continue;
    if (/\.(pdf|jpe?g|png|gif|svg|css|js|zip|mp4|webp|ico)(\?|$)/i.test(href)) continue;

    let abs;
    try { abs = new URL(href, base).href; } catch { continue; }

    const u = new URL(abs);
    if (u.hostname.replace(/^www\./, '') !== base.hostname.replace(/^www\./, '')) continue;
    if (!source.linkHint.test(u.pathname + u.search)) continue;
    if (abs === source.indexUrl || abs === source.indexUrl + '/') continue;

    const norm = abs.replace(/\/$/, '');
    if (seen.has(norm)) continue;
    seen.add(norm);
    links.push(norm);
  }

  log(`  ${links.length} candidate link(s)`);
  return links;
}

// ─── Makale Metni ──────────────────────────────────────────────────────────

async function fetchArticleText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CuttingToolsAI-Research/1.0)',
      'Accept': 'text/html'
    },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`article fetch ${res.status}`);
  const html = await res.text();

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1]).trim().slice(0, 200) : null;

  const text = decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ').trim().slice(0, ARTICLE_TEXT_LIMIT);

  return { title, text };
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

// ─── Anthropic Değerlendirme ───────────────────────────────────────────────

const EVAL_SYSTEM = `You are a research evaluator for CuttingToolsAI, an AI-powered cutting tool
recommendation engine. Its knowledge edge is the "why layer": shop-floor judgment knowledge that
does not exist in catalogs — why a choice works, when the catalog value lies, what the operator
actually sees at the machine. It is NEVER product/SKU data, pricing, or marketing.

The current why-layer principles:

${WHY_LAYER_PRINCIPLES}

You evaluate manufacturer technical articles. An article is "relevant" ONLY if it contains
judgment-layer technical insight (mechanics, failure modes, trade-offs, field corrections) —
not product announcements, corporate news, or catalog-style spec listings.

Respond with STRICT JSON only — no markdown fences, no commentary. Schema:
{
  "relevant": true/false,
  "usefulness": 1-10 integer (how much judgment-layer value this adds beyond the existing principles; 0 if not relevant),
  "summary": "2-3 sentence technical summary",
  "related_principle": "principle name or null",
  "new_principle_candidate": true/false,
  "proposed_why_layer_text": "ready-to-paste markdown block in the voice and format of why-layer.md (a single '- [x] ...' bullet with the insight written as field judgment), or null if not relevant"
}`;

async function evaluateArticle(env, sourceName, url, text) {
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: EVAL_SYSTEM,
      messages: [{
        role: 'user',
        content: `Source: ${sourceName}\nURL: ${url}\n\nArticle text (truncated):\n${text}`
      }]
    })
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = await res.json();
  const raw = (data.content || []).map(b => b.text || '').join('');

  // Strict JSON beklenir; yine de ilk {...} bloğunu toleranslı yakala.
  let parsed = tryParseJSON(raw);
  if (!parsed) {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) parsed = tryParseJSON(m[0]);
  }
  if (!parsed || typeof parsed.relevant !== 'boolean') return null; // parse failed
  return parsed;
}

function tryParseJSON(s) {
  try { return JSON.parse(s); } catch { return null; }
}

// ─── E-posta (Resend) ──────────────────────────────────────────────────────

async function sendEmail(env, items, parseFailed, sourceErrors) {
  if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY missing');

  const date = new Date().toISOString().slice(0, 10);
  const subject = `[CuttingToolsAI] Weekly Research – ${date}`;

  // Faydaya göre sırala, e-postayı MAX_EMAIL_ITEMS ile sınırla.
  // Kesilenler de değerlendirilmiş ve hash'leri KV'ye yazılmıştır.
  const ranked  = [...items].sort((a, b) => (b.eval.usefulness || 0) - (a.eval.usefulness || 0));
  const shown   = ranked.slice(0, MAX_EMAIL_ITEMS);
  const skipped = ranked.length - shown.length;

  const itemHtml = shown.map(it => `
    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0 0 16px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#0ea5e9;margin-bottom:6px;">${esc(it.source)}</div>
      <div style="font-size:15px;font-weight:600;margin-bottom:8px;">
        <a href="${esc(it.url)}" style="color:#0f172a;text-decoration:none;">${esc(it.title)}</a>
      </div>
      <div style="font-size:13px;color:#334155;line-height:1.5;margin-bottom:10px;">${esc(it.eval.summary || '')}</div>
      <div style="margin-bottom:10px;">
        ${it.eval.related_principle
          ? `<span style="display:inline-block;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:999px;font-size:11px;padding:2px 10px;">İlke: ${esc(it.eval.related_principle)}</span>`
          : ''}
        ${it.eval.new_principle_candidate
          ? `<span style="display:inline-block;background:#fef3c7;color:#92400e;border:1px solid #fde68a;border-radius:999px;font-size:11px;padding:2px 10px;margin-left:6px;">Yeni ilke adayı</span>`
          : ''}
      </div>
      ${it.eval.proposed_why_layer_text
        ? `<pre style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px;font-size:12px;white-space:pre-wrap;word-break:break-word;color:#0f172a;margin:0;">${esc(it.eval.proposed_why_layer_text)}</pre>`
        : ''}
    </div>`).join('');

  const failedHtml = parseFailed.length ? `
    <h3 style="font-size:14px;color:#b91c1c;margin:24px 0 8px;">Parse failed (${parseFailed.length})</h3>
    <ul style="font-size:12px;color:#475569;padding-left:18px;">
      ${parseFailed.map(f => `<li><a href="${esc(f.url)}" style="color:#0ea5e9;">${esc(f.url)}</a> — ${esc(f.source)}: ${esc(f.reason)}</li>`).join('')}
    </ul>` : '';

  const sourceErrHtml = sourceErrors.length ? `
    <h3 style="font-size:14px;color:#b45309;margin:24px 0 8px;">Source errors (${sourceErrors.length})</h3>
    <ul style="font-size:12px;color:#475569;padding-left:18px;">
      ${sourceErrors.map(s => `<li>${esc(s.source)}: ${esc(s.reason)}</li>`).join('')}
    </ul>` : '';

  const body = shown.length
    ? itemHtml
    : `<p style="font-size:14px;color:#334155;">No new technical content this week.</p>`;

  const skippedNote = skipped > 0
    ? `<div style="margin-top:6px;">${skipped} more item(s) evaluated but cut for brevity, stored in KV.</div>`
    : '';

  const html = `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a;">
    <h2 style="font-size:18px;margin:0 0 4px;">CuttingToolsAI — Weekly Research</h2>
    <div style="font-size:12px;color:#64748b;margin-bottom:20px;">${date} · ${shown.length} of ${ranked.length} relevant item(s)</div>
    ${body}
    ${failedHtml}
    ${sourceErrHtml}
    <div style="border-top:1px solid #e2e8f0;margin-top:24px;padding-top:12px;font-size:12px;color:#64748b;">
      Nothing is auto-committed. Review and add manually to <code>agent_docs/why-layer.md</code>.
      ${skippedNote}
    </div>
  </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.RESEND_FROM || 'CuttingToolsAI Research <research@cuttingtoolsai.eu>',
      to: [env.REPORT_TO || 'memmizgezgin@gmail.com'],
      subject,
      html
    })
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

// ─── Yardımcılar ───────────────────────────────────────────────────────────

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
