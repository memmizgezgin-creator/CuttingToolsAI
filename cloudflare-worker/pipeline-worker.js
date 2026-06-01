/**
 * ToolAdvisor Pipeline — Cloudflare Worker
 * ==========================================
 * Cron: her gün 03:17 UTC
 * Adım 1: KV'den candidates oku + pending extractions birleştir
 * Adım 2: directory-data-extracted.js içeriği üret
 * Adım 3: GitHub API ile push et → CF Pages otomatik build tetiklenir
 *
 * Manuel tetiklemek için:
 *   POST https://<worker-url>/run
 * Son çalıştırma bilgisi:
 *   GET  https://<worker-url>/status
 *
 * Gerekli Worker Secrets (wrangler secret put <KEY>):
 *   GITHUB_TOKEN   — fine-grained PAT, izin: Contents → Read & Write
 *   GITHUB_REPO    — "memmizgezgin-creator/ToolAdvisor"
 *   GITHUB_BRANCH  — "main" (opsiyonel, default: main)
 *
 * Gerekli KV Binding (wrangler.toml'da tanımlandı):
 *   PIPELINE_KV
 *     candidates          → mevcut ürün kayıtları (JSON)
 *     pending_extractions → yerel crawl'dan gelen ham kayıtlar (JSON)
 *     pipeline_last_run   → ISO timestamp
 *     pipeline_log        → son çalıştırma özeti
 */

'use strict';

const CONF_MERGE_MIN   = 70;
const EXTRACTED_JS_PATH = 'directory-data-extracted.js';

// ─── Entry Point ───────────────────────────────────────────────────────────

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runPipeline(env));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/run' && request.method === 'POST') {
      ctx.waitUntil(runPipeline(env));
      return json({ ok: true, message: 'Pipeline tetiklendi' }, 202);
    }

    if (url.pathname === '/status') {
      const lastRun = await env.PIPELINE_KV.get('pipeline_last_run');
      const log     = await env.PIPELINE_KV.get('pipeline_log');
      const count   = await env.PIPELINE_KV.get('pipeline_tool_count');
      return json({ lastRun, toolCount: count ? Number(count) : null, log });
    }

    return new Response(
      'ToolAdvisor Pipeline Worker\n' +
      'POST /run    — manuel tetikle\n' +
      'GET  /status — son çalıştırma bilgisi',
      { status: 200, headers: { 'Content-Type': 'text/plain' } }
    );
  }
};

// ─── Ana Pipeline ──────────────────────────────────────────────────────────

async function runPipeline(env) {
  const startTime = Date.now();
  const logs = [];
  const log = (...msg) => {
    const line = msg.join(' ');
    console.log(line);
    logs.push(line);
  };

  log('╔═══════════════════════════════════════════╗');
  log('║  ToolAdvisor Pipeline Worker               ║');
  log(`║  ${new Date().toISOString()}      ║`);
  log('╚═══════════════════════════════════════════╝');

  try {
    const tools = await stepMerge(env, log);

    if (tools.length === 0) {
      log('\n⚠  Hiç kayıt yok, pipeline durdu');
      await saveLog(env, logs, startTime, 0);
      return;
    }

    const jsContent = stepGenerateJS(tools, log);
    if (!jsContent) {
      log('\n❌ JS üretilemedi');
      await saveLog(env, logs, startTime, tools.length);
      return;
    }

    await stepDeploy(jsContent, env, log);

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    log(`\n✅ Tamamlandı — ${elapsed}s, ${tools.length} ürün`);
    await saveLog(env, logs, startTime, tools.length);

  } catch (e) {
    log('\n❌ Pipeline hatası:', e.message);
    console.error(e.stack);
    await saveLog(env, logs, startTime, 0);
  }
}

// ─── Adım 1: Merge ─────────────────────────────────────────────────────────

async function stepMerge(env, log) {
  log('\n🔀 ADIM 1: Kayıtları birleştir (conf ≥ ' + CONF_MERGE_MIN + ')');

  const raw      = await env.PIPELINE_KV.get('candidates', { type: 'json' });
  const existing = Array.isArray(raw) ? raw : (raw?.tools ?? []);
  log(`  Mevcut kayıt: ${existing.length}`);

  const pendingRaw = await env.PIPELINE_KV.get('pending_extractions', { type: 'json' });
  if (!pendingRaw || !Array.isArray(pendingRaw) || pendingRaw.length === 0) {
    log('  → Bekleyen extraction yok, mevcut kayıtlar kullanılıyor');
    return existing;
  }

  log(`  Pending extractions: ${pendingRaw.length}`);

  const existingKeys = new Set(existing.map(r => `${r.article || ''}|${r.source_pdf || ''}`));
  let idCounter = existing.length + 1;
  const newRecords = [];

  for (const r of pendingRaw) {
    if ((r.confidence || 0) < CONF_MERGE_MIN) continue;
    const key = `${r.article_number || ''}|${r.source_pdf || ''}`;
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    const id     = 'X' + String(idCounter++).padStart(4, '0');
    const mapped = mapRawRecord(r, id);
    if (mapped) newRecords.push(mapped);
  }

  if (newRecords.length === 0) {
    log('  → Yeni kayıt yok');
    await env.PIPELINE_KV.delete('pending_extractions');
    return existing;
  }

  const merged = [...existing, ...newRecords];
  log(`  ✅ ${newRecords.length} yeni kayıt → toplam ${merged.length}`);

  await env.PIPELINE_KV.put('candidates', JSON.stringify({ total: merged.length, tools: merged }));
  await env.PIPELINE_KV.delete('pending_extractions');

  return merged;
}

// ─── Adım 2: JS Üret ───────────────────────────────────────────────────────

function stepGenerateJS(tools, log) {
  log(`\n📝 ADIM 2: directory-data-extracted.js üret (${tools.length} kayıt)`);
  try {
    const jsEntries = tools.map(t => toolToJS(t)).join(',\n');
    const output =
`// ToolAdvisor — Extracted tool records (${tools.length} tools from manufacturer catalogues)
// Auto-generated ${new Date().toISOString().slice(0, 10)} by pipeline-worker.js — DO NOT edit manually
(function () {
  if (!window.TA_TOOLS) window.TA_TOOLS = [];
  const EXTRACTED = [
${jsEntries}
  ];
  window.TA_TOOLS = window.TA_TOOLS.concat(EXTRACTED);
})();
`;
    log(`  ✅ ${Math.round(output.length / 1024)}KB JS üretildi`);
    return output;
  } catch (e) {
    log('  ❌ JS üretim hatası:', e.message);
    return null;
  }
}

// ─── Adım 3: GitHub API ile Deploy ─────────────────────────────────────────
// GitHub'a push → Cloudflare Pages otomatik build tetiklenir

async function stepDeploy(jsContent, env, log) {
  log("\n🚀 ADIM 3: GitHub'a push et → CF Pages build tetiklenir");

  const repo   = env.GITHUB_REPO;
  const branch = env.GITHUB_BRANCH || 'main';
  const token  = env.GITHUB_TOKEN;

  if (!repo || !token) {
    log('  ⚠ GITHUB_REPO veya GITHUB_TOKEN eksik — deploy atlandı');
    log('    wrangler secret put GITHUB_TOKEN');
    log('    wrangler secret put GITHUB_REPO');
    return;
  }

  const apiUrl = `https://api.github.com/repos/${repo}/contents/${EXTRACTED_JS_PATH}`;
  const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'ToolAdvisor-Pipeline-Worker',
    'Content-Type': 'application/json'
  };

  // Mevcut dosyanın SHA'sını al (güncelleme için şart)
  let sha = null;
  const getRes = await fetch(`${apiUrl}?ref=${branch}`, { headers });
  if (getRes.ok) {
    const data = await getRes.json();
    sha = data.sha;
    log(`  SHA alındı: ${sha.slice(0, 7)}`);
  } else if (getRes.status !== 404) {
    log(`  ⚠ SHA alınamadı (${getRes.status})`);
  }

  // UTF-8 güvenli base64 encode
  const contentB64 = btoa(
    encodeURIComponent(jsContent).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );

  const body = {
    message: `chore: auto-update extracted tools data (${new Date().toISOString().slice(0, 10)})`,
    content: contentB64,
    branch
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(apiUrl, { method: 'PUT', headers, body: JSON.stringify(body) });

  if (putRes.ok) {
    log('  ✅ GitHub push başarılı → CF Pages build başlıyor');
  } else {
    const errText = await putRes.text();
    log(`  ❌ GitHub push başarısız (${putRes.status}):`, errText.slice(0, 200));
  }
}

// ─── Yardımcılar ───────────────────────────────────────────────────────────

async function saveLog(env, logs, startTime, toolCount) {
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  await env.PIPELINE_KV.put('pipeline_last_run', new Date().toISOString());
  await env.PIPELINE_KV.put('pipeline_tool_count', String(toolCount));
  await env.PIPELINE_KV.put('pipeline_log',
    `Süre: ${elapsed}s | Ürün: ${toolCount}\n` + logs.slice(-8).join('\n')
  );
}

function detectFamily(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('drill') || t.includes('boring bar') || t.includes('countersink')) return 'Drilling';
  if (t.includes('tap') || t.includes('thread mill') || t.includes('threading'))     return 'Threading';
  if (t.includes('ream'))                                                              return 'Reaming';
  if (t.includes('groove') || t.includes('parting') || t.includes('cut-off'))        return 'Grooving';
  if (t.includes('turning') || t.includes('insert') || t.includes('cnmg') || t.includes('cngg')) return 'Turning';
  if (t.includes('mill') || t.includes('end mill') || t.includes('slot') || t.includes('face mill')) return 'Milling';
  return 'Drilling';
}

function mapRawRecord(r, id) {
  if (!r.article_number && !r.product_name) return null;
  const ms     = r.material_suitability || {};
  const isoAll = ['P', 'M', 'K', 'N', 'S', 'H'].filter(k => ms[k] === true);
  const brand  = r.brand || 'Gühring';
  const family = detectFamily(`${r.family || ''} ${r.product_name || ''}`);
  const opMap  = { Drilling: 'Solid', Threading: 'Internal', Reaming: 'Finishing', Turning: 'Mixed', Milling: 'Solid', Grooving: 'External' };
  const bestFor = [r.product_name, r.family, r.shank_form, r.depth_multiplier].filter(Boolean).join(' | ').slice(0, 200);
  return {
    id, brand,
    code:     r.article_number || '',
    grade:    r.material_grade || '',
    shape:    '-',
    tone:     'iso-p',
    iso:      isoAll[0] || (ms.P !== false ? 'P' : 'K'),
    iso_all:  isoAll.length > 0 ? isoAll : null,
    family,
    op:       opMap[family] || 'Solid',
    vcMin:    r.cutting_data?.vc_min  || null,
    vcMax:    r.cutting_data?.vc_max  || null,
    fMin:     r.cutting_data?.feed_min || null,
    fMax:     r.cutting_data?.feed_max || null,
    apMin: null, apMax: null,
    coolant: '', stability: '', bestFor,
    confidence:   Math.round(r.confidence || 70),
    supply:       3,
    equivalents:  0,
    equivIds:     [],
    betterValueId: null,
    lastVerified: new Date().toISOString().slice(0, 10),
    article:      String(r.article_number || ''),
    source_pdf:   r.source_pdf || ''
  };
}

function sanitize(s) {
  if (typeof s !== 'string') return s;
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ').replace(/\t/g, ' ').trim();
}

function toolToJS(t) {
  const isoAll = Array.isArray(t.iso_all)
    ? `[${t.iso_all.map(x => `'${x}'`).join(',')}]`
    : 'null';
  return `  {
    id:'${sanitize(t.id)}', brand:'${sanitize(t.brand)}', code:'${sanitize(t.code || '')}',
    grade:'${sanitize(t.grade || '')}', shape:'${sanitize(t.shape || '-')}', tone:'${sanitize(t.tone || 'iso-p')}',
    iso:'${sanitize(t.iso || 'P')}', iso_all:${isoAll},
    family:'${sanitize(t.family || 'Drilling')}', op:'${sanitize(t.op || '')}',
    vcMin:${t.vcMin ?? null}, vcMax:${t.vcMax ?? null},
    fMin:${t.fMin ?? null}, fMax:${t.fMax ?? null},
    apMin:${t.apMin ?? null}, apMax:${t.apMax ?? null},
    coolant:'${sanitize(t.coolant || '')}', stability:'${sanitize(t.stability || '')}',
    bestFor:'${sanitize(t.bestFor || '')}',
    confidence:${t.confidence || 85}, supply:${t.supply || 3}, equivalents:${t.equivalents || 0},
    equivIds:${Array.isArray(t.equivIds) ? JSON.stringify(t.equivIds) : '[]'},
    betterValueId:${t.betterValueId ? `'${sanitize(t.betterValueId)}'` : 'null'},
    lastVerified:'${sanitize(t.lastVerified || new Date().toISOString().slice(0, 10))}',
    article:'${sanitize(String(t.article || ''))}'
  }`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
