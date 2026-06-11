/**
 * CuttingToolsAI Daily Agents — Cloudflare Worker
 * ================================================
 * Üç cron, tek worker (event.cron üzerinden dallanır):
 *
 *   07:00 UTC — COLLECT  : site_dev + market_intel ajanları bulgularını üretir,
 *                          ikinci bir Claude çağrısıyla yönlendirilebilir event'lere
 *                          çevirir ve Supabase agent_events'e yazar.
 *   07:20 UTC — EVALUATE : status='new' event'leri to_agent'a göre gruplar, hedef
 *                          departmanın rol prompt'uyla değerlendirir:
 *                          evaluated (FYI) | escalated (Murat kararı gerekli).
 *   07:40 UTC — DIGEST   : chief-of-staff günlük HTML e-postası (Resend):
 *                          1) Decisions needed  2) Routed and evaluated
 *                          3) Department reports. Konu: "CuttingToolsAI Daily - {date}"
 *
 * Yaz saati notu: 07:00 UTC = 09:00 Europe/Amsterdam (CEST). Kışın kayar — wrangler.toml'a bak.
 *
 * Güvenlik/idempotans:
 *   - Bir event asla iki kez değerlendirilmez (PATCH ... &status=eq.new guard).
 *   - Claude/API hatası akışı düşürmez: event 'new' kalır, digest footer'da
 *     "X events deferred" olarak raporlanır.
 *   - Hiçbir event içeriği repoya/why-layer'a otomatik commit edilmez —
 *     her şey Murat'a öneri olarak gider.
 *
 * Manuel tetikleme:
 *   POST /run/collect | /run/evaluate | /run/digest
 *   GET  /status
 *
 * Gerekli Secrets (wrangler secret put <KEY>):
 *   ANTHROPIC_API_KEY, RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

'use strict';

import {
  DEPARTMENTS, DEPARTMENT_IDS, EVENT_TYPES, PRIORITIES,
  supabaseHeaders, insertAgentEvents
} from '../agents-shared/departments.js';

const ANTHROPIC_MODEL   = 'claude-sonnet-4-20250514';
const MAX_EVENTS_PER_RUN = 100;  // evaluation pass üst sınırı (kalan ertesi güne kalır)
const MAX_DIGEST_ITEMS   = 40;

const CRON_COLLECT  = '0 7 * * *';
const CRON_EVALUATE = '20 7 * * *';
const CRON_DIGEST   = '40 7 * * *';

// ─── Entry Point ───────────────────────────────────────────────────────────

export default {
  async scheduled(event, env, ctx) {
    if (event.cron === CRON_COLLECT)  ctx.waitUntil(runCollectors(env));
    if (event.cron === CRON_EVALUATE) ctx.waitUntil(runEvaluationPass(env));
    if (event.cron === CRON_DIGEST)   ctx.waitUntil(runDigest(env));
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'POST') {
      // waitUntil HTTP isteklerinde erken kesilebiliyor; manuel testte sonuna kadar bekle
      if (url.pathname === '/run/collect')  return json(await runCollectors(env));
      if (url.pathname === '/run/evaluate') return json(await runEvaluationPass(env));
      if (url.pathname === '/run/digest')   return json(await runDigest(env));
    }

    if (url.pathname === '/status') {
      const lastRun = await env.TA_AGENT_BUS.get('bus_last_run');
      const log     = await env.TA_AGENT_BUS.get('bus_log');
      return json({ lastRun, log });
    }

    return new Response(
      'CuttingToolsAI Daily Agents Worker\n' +
      'POST /run/collect  — toplayıcıları çalıştır (site_dev + market_intel)\n' +
      'POST /run/evaluate — evaluation pass\n' +
      'POST /run/digest   — chief-of-staff digest e-postası\n' +
      'GET  /status       — son çalıştırma bilgisi',
      { status: 200, headers: { 'Content-Type': 'text/plain' } }
    );
  }
};

// ═══ 1. COLLECTORS ═════════════════════════════════════════════════════════

const COLLECTORS = [
  {
    id: 'site_dev',
    async gatherInput(env) {
      // Canlı siteden ana sayfa metni — ajan gerçek yüzeye bakarak öneri üretir
      const site = env.SITE_URL || 'https://cuttingtoolsai.eu';
      const res = await fetch(site, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CuttingToolsAI-Agents/1.0)', 'Accept': 'text/html' },
        redirect: 'follow'
      });
      if (!res.ok) throw new Error(`site fetch ${res.status}`);
      const text = stripHtml(await res.text()).slice(0, 12000);
      return `Live homepage text of ${site} (tags stripped, truncated):\n\n${text}`;
    },
    analysisSystem: `${DEPARTMENTS.site_dev.role}

Task: produce today's site improvement suggestions. Look at the live homepage text you
are given and reason about UX, copy honesty, conversion to the AI advisor, SEO surface
and obvious gaps. 3 to 6 concrete suggestions, each independently actionable.

Respond with STRICT JSON only — no markdown fences. Schema:
{
  "summary": "2-3 sentence department report for today",
  "findings": [
    { "title": "short imperative title",
      "detail": "one paragraph: what, why it matters, concrete suggestion",
      "source_ref": "URL or page/section reference, or null" }
  ]
}`,
    tools: null
  },
  {
    id: 'market_intel',
    async gatherInput() {
      const today = new Date().toISOString().slice(0, 10);
      return `Today is ${today}. Research the last few days of cutting-tool / machining
industry news: competitor moves (Sandvik, Iscar, Walter, Seco, Kennametal, machining
software/AI advisors), pricing or positioning shifts, and demand signals relevant to a
freemium AI cutting-tool advisor in the EU. Use web search. Then report.`;
    },
    analysisSystem: `${DEPARTMENTS.market_intel.role}

Task: produce today's market intelligence report using web search. 2 to 5 findings,
each with a verifiable source link. Skip generic evergreen content — only signals.

After your research, your FINAL message must be STRICT JSON only — no markdown fences,
no commentary around it. Schema:
{
  "summary": "2-3 sentence department report for today",
  "findings": [
    { "title": "short title",
      "detail": "one paragraph: the signal and why it matters for CuttingToolsAI",
      "source_ref": "source URL" }
  ]
}`,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }]
  }
];

async function runCollectors(env) {
  const { logs, log } = makeLogger();
  const date = today();
  log(`collect start ${new Date().toISOString()}`);

  const results = [];
  const errors  = [];

  for (const c of COLLECTORS) {
    try {
      const input = await c.gatherInput(env);

      // 1. çağrı — departmanın mevcut analiz mantığı (bulgular + günlük özet)
      const raw = await callClaude(env, {
        system: c.analysisSystem,
        user: input,
        tools: c.tools,
        max_tokens: 2048
      });
      const report = parseJsonLoose(raw);
      if (!report || !Array.isArray(report.findings)) throw new Error('analysis JSON parse failed');

      log(`${c.id}: ${report.findings.length} finding(s)`);

      // Günlük özet → digest'in "Department reports" bölümü
      await env.TA_AGENT_BUS.put(`summary:${date}:${c.id}`,
        String(report.summary || '').slice(0, 1500), { expirationTtl: 3 * 86400 });

      // 2. çağrı — bulguları yönlendirilebilir event'lere çevir
      let routed = 0;
      if (report.findings.length) {
        const events = await routeFindings(env, c.id, report.findings);
        routed = await insertAgentEvents(env, c.id, events);
      }
      log(`${c.id}: ${routed} event(s) inserted`);
      results.push({ agent: c.id, findings: report.findings.length, events: routed });
    } catch (e) {
      // Bir ajanın arızası diğerini düşürmez; digest footer'da raporlanır
      errors.push({ agent: c.id, reason: e.message });
      log(`! ${c.id} failed: ${e.message}`);
    }
  }

  if (errors.length) {
    await env.TA_AGENT_BUS.put(`collector_errors:${date}`, JSON.stringify(errors), { expirationTtl: 2 * 86400 });
  }
  await finishRun(env, 'collect', logs);
  return { ok: true, results, errors, log: logs };
}

// Bulgular → event'ler (hedef departman(lar), tip, öncelik, tek paragraf body)
async function routeFindings(env, fromAgent, findings) {
  const deptOverview = DEPARTMENT_IDS
    .map(id => `- ${id}: ${DEPARTMENTS[id].name}`)
    .join('\n');

  const system = `You are the routing layer of CuttingToolsAI's inter-agent event bus.
You convert one department's raw findings into routable events.

Departments:
${deptOverview}

Rules:
- For each finding decide the target department(s) — usually ONE; use two only when a
  finding genuinely concerns two departments. Findings the sender itself should act on
  go to chief_of_staff (the sender does not message itself).
- event_type: one of ${EVENT_TYPES.join(', ')}.
- priority: one of ${PRIORITIES.join(', ')} — "high" only for user-visible breakage,
  founder decisions, or time-sensitive signals.
- body: exactly one paragraph, self-contained (the evaluator will not see the original report).
- Keep source_ref from the finding if present.

Respond with STRICT JSON only — no markdown fences. Schema:
{ "events": [ { "to_agent": "...", "event_type": "...", "priority": "...",
                "title": "...", "body": "...", "source_ref": "... or null" } ] }`;

  const raw = await callClaude(env, {
    system,
    user: `Sender department: ${fromAgent}\n\nFindings:\n${JSON.stringify(findings, null, 2)}`,
    max_tokens: 2048
  });
  const parsed = parseJsonLoose(raw);
  if (!parsed || !Array.isArray(parsed.events)) throw new Error('routing JSON parse failed');
  return parsed.events;
}

// ═══ 2. EVALUATION PASS ════════════════════════════════════════════════════

async function runEvaluationPass(env) {
  const { logs, log } = makeLogger();
  log(`evaluate start ${new Date().toISOString()}`);

  const newEvents = await fetchEvents(env,
    `status=eq.new&order=created_at.asc&limit=${MAX_EVENTS_PER_RUN}`);
  log(`${newEvents.length} new event(s)`);

  // to_agent'a göre grupla — her event hedef departmanın rol prompt'uyla değerlendirilir
  const byAgent = new Map();
  for (const ev of newEvents) {
    const key = DEPARTMENT_IDS.includes(ev.to_agent) ? ev.to_agent : 'chief_of_staff';
    if (!byAgent.has(key)) byAgent.set(key, []);
    byAgent.get(key).push(ev);
  }

  let evaluated = 0, escalated = 0, deferred = 0;

  for (const [agentId, events] of byAgent) {
    for (const ev of events) {
      try {
        const verdict = await evaluateEvent(env, agentId, ev);

        // İdempotans: status=eq.new guard'ı — başka bir koşu işlediyse 0 satır döner
        const updated = await patchEvent(env, ev.id, {
          status: verdict.escalate ? 'escalated' : 'evaluated',
          evaluation: verdict.evaluation,
          recommended_action: verdict.recommended_action
        });
        if (!updated) { log(`skip (already evaluated): ${ev.id}`); continue; }

        verdict.escalate ? escalated++ : evaluated++;
      } catch (e) {
        // Event 'new' kalır → digest footer "X events deferred", ertesi koşuda yeniden denenir
        deferred++;
        log(`! defer ${ev.id} (${agentId}): ${e.message}`);
      }
    }
  }

  log(`evaluated=${evaluated} escalated=${escalated} deferred=${deferred}`);
  await finishRun(env, 'evaluate', logs);
  return { ok: true, evaluated, escalated, deferred, log: logs };
}

async function evaluateEvent(env, agentId, ev) {
  const system = `${DEPARTMENTS[agentId].role}

You are evaluating one incoming event addressed to your department on the inter-agent
event bus. Murat (solo founder) is the only human; his attention is scarce.

Respond with STRICT JSON only — no markdown fences. Schema:
{
  "evaluation": "2-4 sentences: your department's judgment of this event",
  "recommended_action": "ONE concrete recommendation: a specific fix, a Claude Code task suggestion, a content idea, or 'dismiss: <reason>'",
  "needs_murat_decision": true/false  // true ONLY if a founder decision is required; false = FYI
}`;

  const user =
    `Event from: ${ev.from_agent}\n` +
    `Type: ${ev.event_type} | Priority: ${ev.priority}\n` +
    `Title: ${ev.title}\n` +
    `Body: ${ev.body}\n` +
    `Source: ${ev.source_ref || '—'}`;

  const raw = await callClaude(env, { system, user, max_tokens: 1024 });
  const parsed = parseJsonLoose(raw);
  if (!parsed || typeof parsed.evaluation !== 'string' || typeof parsed.recommended_action !== 'string') {
    throw new Error('evaluation JSON parse failed');
  }
  return {
    evaluation: parsed.evaluation.slice(0, 1500),
    recommended_action: parsed.recommended_action.slice(0, 1000),
    escalate: parsed.needs_murat_decision === true
  };
}

// ═══ 3. CHIEF OF STAFF DIGEST ══════════════════════════════════════════════

async function runDigest(env) {
  const { logs, log } = makeLogger();
  const date = today();
  log(`digest start ${new Date().toISOString()}`);

  // Değerlendirilmiş ama henüz digest'e girmemiş event'ler (KV işaretiyle dedup —
  // escalated satırlar Murat aksiyon alana kadar escalated kalır, yeniden listelenmez)
  const candidates = await fetchEvents(env,
    `status=in.(escalated,evaluated)&order=created_at.desc&limit=${MAX_DIGEST_ITEMS * 2}`);

  const fresh = [];
  for (const ev of candidates) {
    if (await env.TA_AGENT_BUS.get(`digested:${ev.id}`)) continue;
    fresh.push(ev);
    if (fresh.length >= MAX_DIGEST_ITEMS) break;
  }

  const decisions = fresh.filter(e => e.status === 'escalated');
  const routed    = fresh.filter(e => e.status === 'evaluated');

  // Departman raporları (collector özetleri) + haftalık tech_research notu KV'de değil,
  // event olarak gelir — özet bölümü sadece günlük toplayıcılar içindir.
  const reports = [];
  for (const c of COLLECTORS) {
    const s = await env.TA_AGENT_BUS.get(`summary:${date}:${c.id}`);
    if (s) reports.push({ agent: c.id, name: DEPARTMENTS[c.id].name, summary: s });
  }

  // Footer: hâlâ 'new' kalan event'ler = bu koşuda değerlendirilemeyenler
  const deferredCount = await countEvents(env, 'status=eq.new');
  const collectorErrors = JSON.parse(await env.TA_AGENT_BUS.get(`collector_errors:${date}`) || '[]');

  const html = buildDigestHtml({ date, decisions, routed, reports, deferredCount, collectorErrors });

  await sendDigestEmail(env, date, html);
  log(`email sent: ${decisions.length} decision(s), ${routed.length} evaluated, ${deferredCount} deferred`);

  // E-posta BAŞARILI olduktan sonra işaretle — gönderim düşerse ertesi gün tekrar gelir
  for (const ev of fresh) {
    await env.TA_AGENT_BUS.put(`digested:${ev.id}`, date, { expirationTtl: 60 * 86400 });
  }

  await finishRun(env, 'digest', logs);
  return { ok: true, decisions: decisions.length, routed: routed.length, deferred: deferredCount, html, log: logs };
}

function buildDigestHtml({ date, decisions, routed, reports, deferredCount, collectorErrors }) {
  const decisionsHtml = decisions.length ? decisions.map(ev => `
    <div style="border:1px solid #fca5a5;border-left:4px solid #dc2626;border-radius:8px;padding:16px;margin:0 0 14px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#dc2626;margin-bottom:6px;">
        ${esc(ev.from_agent)} → ${esc(ev.to_agent)} · ${esc(ev.event_type)} · ${esc(ev.priority)}
      </div>
      <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:#0f172a;">${esc(ev.title)}</div>
      <div style="font-size:13px;color:#334155;line-height:1.5;margin-bottom:10px;">${esc(ev.body)}</div>
      <div style="font-size:13px;color:#0f172a;line-height:1.5;margin-bottom:10px;"><b>Evaluation:</b> ${esc(ev.evaluation || '')}</div>
      <div style="background:#fef2f2;border-radius:6px;padding:10px 12px;font-size:13px;color:#7f1d1d;"><b>Recommended:</b> ${esc(ev.recommended_action || '')}</div>
      ${ev.source_ref ? `<div style="font-size:12px;margin-top:8px;"><a href="${esc(ev.source_ref)}" style="color:#0ea5e9;">${esc(ev.source_ref)}</a></div>` : ''}
    </div>`).join('')
    : `<p style="font-size:13px;color:#64748b;">No decisions needed today.</p>`;

  const routedHtml = routed.length ? `
    <table style="border-collapse:collapse;width:100%;font-size:13px;">
      ${routed.map(ev => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #f1f5f9;vertical-align:top;white-space:nowrap;color:#64748b;font-size:11px;text-transform:uppercase;">${esc(ev.from_agent)}→${esc(ev.to_agent)}</td>
        <td style="padding:8px;border-bottom:1px solid #f1f5f9;vertical-align:top;">
          <div style="font-weight:600;color:#0f172a;">${esc(ev.title)}</div>
          <div style="color:#475569;margin-top:2px;">${esc(ev.recommended_action || ev.evaluation || '')}</div>
        </td>
      </tr>`).join('')}
    </table>`
    : `<p style="font-size:13px;color:#64748b;">Nothing routed today.</p>`;

  const reportsHtml = reports.length ? reports.map(r => `
    <div style="border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin:0 0 10px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#0ea5e9;margin-bottom:4px;">${esc(r.name)}</div>
      <div style="font-size:13px;color:#334155;line-height:1.5;">${esc(r.summary)}</div>
    </div>`).join('')
    : `<p style="font-size:13px;color:#64748b;">No department reports today (collectors may have failed — see footer).</p>`;

  const errNote = collectorErrors.length
    ? `<div style="margin-top:6px;color:#b91c1c;">Collector errors: ${collectorErrors.map(e => `${esc(e.agent)} (${esc(e.reason)})`).join(', ')}</div>`
    : '';
  const deferredNote = deferredCount > 0
    ? `<div style="margin-top:6px;">${deferredCount} event(s) deferred — evaluation will retry on the next run.</div>`
    : '';

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a;">
    <h2 style="font-size:18px;margin:0 0 4px;">CuttingToolsAI — Daily</h2>
    <div style="font-size:12px;color:#64748b;margin-bottom:20px;">${esc(date)} · ${decisions.length} decision(s) needed · ${routed.length} evaluated</div>

    <h3 style="font-size:14px;color:#dc2626;margin:0 0 10px;">Decisions needed (${decisions.length})</h3>
    ${decisionsHtml}

    <h3 style="font-size:14px;color:#0f172a;margin:24px 0 10px;">Routed and evaluated (${routed.length})</h3>
    ${routedHtml}

    <h3 style="font-size:14px;color:#0f172a;margin:24px 0 10px;">Department reports</h3>
    ${reportsHtml}

    <div style="border-top:1px solid #e2e8f0;margin-top:24px;padding-top:12px;font-size:12px;color:#64748b;">
      Nothing is auto-committed. Every item above is a recommendation only.
      ${deferredNote}
      ${errNote}
    </div>
  </div>`;
}

async function sendDigestEmail(env, date, html) {
  if (!env.RESEND_API_KEY) throw new Error('RESEND_API_KEY missing');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.RESEND_FROM || 'CuttingToolsAI Daily <research@cuttingtoolsai.eu>',
      to: [env.REPORT_TO || 'memmizgezgin@gmail.com'],
      subject: `CuttingToolsAI Daily - ${date}`,
      html
    })
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

// ─── Supabase REST ─────────────────────────────────────────────────────────

async function fetchEvents(env, query) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase secrets missing');
  }
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/agent_events?select=*&${query}`, {
    headers: supabaseHeaders(env)
  });
  if (!res.ok) throw new Error(`agent_events fetch ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function countEvents(env, query) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/agent_events?select=id&${query}`, {
    headers: supabaseHeaders(env, { 'Prefer': 'count=exact', 'Range': '0-0' })
  });
  if (!res.ok) return 0; // footer istatistiği — best effort
  const range = res.headers.get('content-range') || '';
  const total = range.split('/')[1];
  return Number(total) || 0;
}

// status=eq.new guard'ıyla güncelle; gerçekten güncellenen satır sayısını döndür
async function patchEvent(env, id, fields) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/agent_events?id=eq.${encodeURIComponent(id)}&status=eq.new`, {
      method: 'PATCH',
      headers: supabaseHeaders(env, { 'Prefer': 'return=representation' }),
      body: JSON.stringify(fields)
    });
  if (!res.ok) throw new Error(`agent_events patch ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const rows = await res.json();
  return rows.length;
}

// ─── Anthropic ─────────────────────────────────────────────────────────────

async function callClaude(env, { system, user, tools = null, max_tokens = 1024 }) {
  if (!env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing');

  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens,
    system,
    messages: [{ role: 'user', content: user }]
  };
  if (tools) body.tools = tools;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const data = await res.json();
  // web_search kullanılırsa content text dışı bloklar da içerir; sadece text'i birleştir
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
}

// Strict JSON beklenir; yine de ilk {...} bloğunu toleranslı yakala (research-worker deseni)
function parseJsonLoose(raw) {
  let parsed = tryParseJSON(raw);
  if (!parsed) {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) parsed = tryParseJSON(m[0]);
  }
  return parsed;
}

function tryParseJSON(s) {
  try { return JSON.parse(s); } catch { return null; }
}

// ─── Yardımcılar ───────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

function makeLogger() {
  const logs = [];
  const log = (...msg) => { const line = msg.join(' '); console.log(line); logs.push(line); };
  return { logs, log };
}

async function finishRun(env, phase, logs) {
  try {
    await env.TA_AGENT_BUS.put('bus_last_run', `${phase} ${new Date().toISOString()}`);
    const prev = await env.TA_AGENT_BUS.get('bus_log') || '';
    await env.TA_AGENT_BUS.put('bus_log', (prev + '\n' + logs.join('\n')).split('\n').slice(-60).join('\n'));
  } catch { /* log yazımı asla akışı düşürmesin */ }
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ').trim();
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
