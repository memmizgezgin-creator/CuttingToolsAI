#!/usr/bin/env node
/**
 * Verify the fixed Quality Inspector evaluation prompt.
 *
 * Checks:
 * 1. "stenless" answer (clarifying questions) scores compliance >= 4   → PASS/FAIL
 * 2. "cnmg" answer (geometry explanation) scores compliance >= 4       → PASS/FAIL
 * 3. "reply with the single word OK" pre-filtered as TEST              → PASS/FAIL
 * 4. Test query excluded from weak-answer count                        → PASS/FAIL
 *
 * Usage:
 *   ANTHROPIC_API_KEY=... node scripts/verify-quality-inspector.mjs
 *   ANTHROPIC_API_KEY=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *     node scripts/verify-quality-inspector.mjs   # fetches real stored answers
 */

import { DEPARTMENTS } from '../agents-shared/departments.js';

const ANTHROPIC_KEY    = process.env.ANTHROPIC_API_KEY || '';
const SUPABASE_URL     = (process.env.SUPABASE_URL     || '').replace(/\/$/, '');
const SERVICE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!ANTHROPIC_KEY) {
  console.error('FAIL: ANTHROPIC_API_KEY is required');
  process.exit(1);
}

// ── Fetch stored advisor answers (best-effort; falls back to built-ins) ───

async function fetchStoredAnswer(querySnippet) {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/advisor_queries` +
    `?select=query_text,ai_answer&query_text=ilike.*${encodeURIComponent(querySnippet)}*` +
    `&ai_answer=not.is.null&order=created_at.desc&limit=1`,
    {
      headers: {
        apikey:        SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows.length ? rows[0] : null;
}

// Representative answers that reflect CORRECT advisor behavior.
// If Supabase has a real stored answer, that is used instead.
const FALLBACK_ANSWERS = {
  stenless: {
    query_text: 'stenless',
    ai_answer:
      'Could you clarify a bit more? I want to make sure I recommend the right tool.\n\n' +
      '- What operation are you planning — turning, milling, or drilling?\n' +
      '- Which stainless family? Austenitic (304/316), martensitic (420), duplex (2205/2507), or precipitation-hardened (17-4)?\n\n' +
      'Each behaves very differently: austenitic work-hardens aggressively and needs positive rake ' +
      'and high Vc to stay ahead of the hardened layer; duplex is tougher and needs higher feed ' +
      'to avoid rubbing; PH grades machine more like alloy steel. One word will get you a generic ' +
      'answer — one more detail gets you a usable one.',
    db_hit: false,
    matched_records: 0,
  },
  cnmg: {
    query_text: 'cnmg',
    ai_answer:
      'CNMG is an ISO 1832 turning insert designation — here is what each letter means:\n\n' +
      '- **C** — Insert shape: 80° rhombic (diamond). Two usable corners. Common for general turning ' +
      'and facing, good strength compared to sharper shapes like D (55°) or V (35°).\n' +
      '- **N** — Clearance angle: 0°. The insert relies on the toolholder for its effective clearance ' +
      '(negative-rake holder). Strong edge, suitable for interrupted cuts and scale.\n' +
      '- **M** — Tolerance class: ±0.05–0.15 mm on inscribed circle and thickness. General-purpose; ' +
      'tighter G-class inserts exist for finishing.\n' +
      '- **G** — Chip breaker / clamping: double-sided with chip groove.\n\n' +
      'The numbers that follow (e.g. CNMG120408) give size (12 = 12 mm IC), thickness (04 = 4.76 mm), ' +
      'and corner radius (08 = 0.8 mm).\n\n' +
      'If you tell me the material and operation, I can recommend a specific grade and cutting data.',
    db_hit: false,
    matched_records: 0,
  },
};

// ── Build the scoring prompt (mirrors fixed scoreAnswer() in worker) ──────

function buildSystem() {
  return (
    `${DEPARTMENTS.quality_inspector.role}\n\n` +
    `You are scoring one advisor interaction. Be concise — one justification line per criterion.\n` +
    `Respond with STRICT JSON only — no markdown fences, no commentary. Schema:\n` +
    `{\n` +
    `  "grounding":        { "score": <1-5>, "justification": "<one line>" },\n` +
    `  "judgment_quality": { "score": <1-5>, "justification": "<one line>" },\n` +
    `  "relevance":        { "score": <1-5>, "justification": "<one line>" },\n` +
    `  "compliance":       { "score": <1-5>, "justification": "<one line>" },\n` +
    `  "invented_data":    <true|false>,\n` +
    `  "db_gap":           <true|false>,\n` +
    `  "ux_issue":         <true|false>\n` +
    `}\n` +
    `invented_data: true if the answer names a grade, tool code, or cutting spec that appears\n` +
    `  fabricated (not traceable to a known manufacturer or the DB records shown).\n` +
    `db_gap: true if the question could NOT be answered from verified DB data and represents\n` +
    `  a real ingestion gap (not a hallucination — just missing coverage).\n` +
    `ux_issue: true ONLY if: (1) a tool recommendation WAS made but the answer is an\n` +
    `  impenetrable wall of prose with no readable structure; OR (2) units are given\n` +
    `  only in imperial (SFM/inch) with no metric equivalent at all.\n` +
    `  Do NOT set true for clarifying questions, concept explanations, or answers that\n` +
    `  mention imperial alongside metric as a secondary reference.`
  );
}

function buildUser(row) {
  return (
    `MACHINIST QUERY:\n${(row.query_text || '').slice(0, 500)}\n\n` +
    `AI ANSWER:\n${(row.ai_answer || '').slice(0, 1500)}\n\n` +
    `DB HIT: ${row.db_hit ? 'yes' : 'no'} (${row.matched_records || 0} verified records matched)`
  );
}

// ── Claude call ───────────────────────────────────────────────────────────

async function callClaude(system, user) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const raw  = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  // Strip markdown fences if model slips
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  const parsed  = JSON.parse(cleaned);
  return parsed;
}

// ── Test query pre-filter (mirrors worker) ────────────────────────────────

const TEST_QUERY_RE = /\breply with the single word\b|\bsmoke[\s_-]?test\b|\bprod[\s_-]?verify\b/i;
function looksLikeTestQuery(text) { return TEST_QUERY_RE.test(text || ''); }

// ── Simulate the inspector scoring loop ──────────────────────────────────
// Returns { scores, testSkipped, weakCount }

async function runInspectorLogic(rows) {
  const scores    = [];
  let testSkipped = 0;

  for (const row of rows) {
    if (looksLikeTestQuery(row.query_text)) {
      testSkipped++;
      continue;
    }
    const result = await callClaude(buildSystem(), buildUser(row));
    scores.push({ query: row.query_text, result });
  }

  const weakCount = scores.filter(s =>
    s.result.grounding?.score      <= 2 ||
    s.result.judgment_quality?.score <= 2 ||
    s.result.relevance?.score      <= 2 ||
    s.result.compliance?.score     <= 2
  ).length;

  return { scores, testSkipped, weakCount };
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  let allPass = true;

  function check(name, pass, detail) {
    if (!pass) allPass = false;
    console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
  }

  // Resolve answers: real Supabase rows or fallbacks
  const stenlessRow = (await fetchStoredAnswer('stenless')) || FALLBACK_ANSWERS.stenless;
  const cnmgRow     = (await fetchStoredAnswer('cnmg'))     || FALLBACK_ANSWERS.cnmg;
  const testRow     = { query_text: 'reply with the single word OK', ai_answer: 'OK', db_hit: false, matched_records: 0 };

  const source = (SUPABASE_URL && SERVICE_KEY) ? 'Supabase' : 'built-in representative answer';
  console.log(`\nUsing ${source} for stenless/cnmg answers.`);
  console.log(`stenless query  : "${stenlessRow.query_text.slice(0, 80)}"`);
  console.log(`cnmg query      : "${cnmgRow.query_text.slice(0, 80)}"\n`);

  // Score stenless and cnmg through the fixed inspector
  const { scores, testSkipped, weakCount } = await runInspectorLogic([
    stenlessRow,
    cnmgRow,
    testRow,
  ]);

  // Check 1 & 2: compliance >= 4
  for (const { query, result } of scores) {
    const c = result.compliance?.score ?? 0;
    const j = result.compliance?.justification ?? '';
    const label = query.slice(0, 30);
    check(
      `"${label}" compliance >= 4`,
      c >= 4,
      `score=${c}/5  justification: ${j}`
    );
    console.log(`       grounding=${result.grounding?.score} judgment=${result.judgment_quality?.score} relevance=${result.relevance?.score} compliance=${c} ux_issue=${result.ux_issue}`);
  }

  // Check 3: test query pre-filtered
  check(
    '"reply with the single word OK" classified TEST',
    testSkipped === 1,
    `testSkipped=${testSkipped} (expected 1)`
  );

  // Check 4: test query excluded from weak count
  // weakCount covers only the two real queries; test row was never scored
  check(
    'test query excluded from weak-answer count',
    scores.length === 2 && testSkipped === 1,
    `scored=${scores.length} test_skipped=${testSkipped} weak=${weakCount}`
  );

  console.log(`\n${allPass ? 'ALL PASS' : 'FAILURES PRESENT'}`);
  return allPass;
}

main()
  .then(ok => process.exit(ok ? 0 : 1))
  .catch(err => { console.error('ERROR:', err.message); process.exit(1); });
