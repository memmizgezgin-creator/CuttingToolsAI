#!/usr/bin/env node
// Advisor prompt regression harness — tests/regression/run-regression.mjs
// Node 20+, ESM, built-ins only (global fetch). No npm dependencies.
//
//   node tests/regression/run-regression.mjs --dry-run   # validate + print questions, no network
//   node tests/regression/run-regression.mjs             # full run against prod + Haiku scoring
//
// Env (full run):
//   ANTHROPIC_API_KEY   required — Haiku scoring (also read from repo-root .env)
//   ADMIN_TEST_KEY      optional — X-Admin-Key quota bypass (also read from repo-root .env)
//   REGRESSION_ENDPOINT optional — default https://cuttingtoolsai.eu/api/chat

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const ENDPOINT = process.env.REGRESSION_ENDPOINT || 'https://cuttingtoolsai.eu/api/chat';
const SCORING_MODEL = 'claude-haiku-4-5-20251001';
const DELAY_MS = 2000;
const REQUEST_TIMEOUT_MS = 65000; // proxy upstream timeout is 50s

// ── .env fallback (repo root), never overrides real env ─────────────────────
function loadDotEnv() {
  try {
    const raw = readFileSync(join(REPO_ROOT, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* no .env — fine */ }
}

// ── questions.json validation ────────────────────────────────────────────────
function loadQuestions() {
  const questions = JSON.parse(readFileSync(join(HERE, 'questions.json'), 'utf8'));
  const problems = [];
  if (!Array.isArray(questions)) problems.push('questions.json is not an array');
  if (questions.length !== 15) problems.push(`expected 15 questions, found ${questions.length}`);
  const ids = new Set();
  for (const q of questions) {
    if (!q.id || typeof q.id !== 'string') problems.push(`missing/invalid id: ${JSON.stringify(q)}`);
    else if (ids.has(q.id)) problems.push(`duplicate id: ${q.id}`);
    else ids.add(q.id);
    if (!q.question || typeof q.question !== 'string' || !q.question.trim()) problems.push(`empty question for id ${q.id}`);
    if (!q.category) problems.push(`missing category for id ${q.id}`);
  }
  if (problems.length) {
    console.error('questions.json INVALID:\n  - ' + problems.join('\n  - '));
    process.exit(1);
  }
  return questions;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── prod advisor call ────────────────────────────────────────────────────────
async function askAdvisor(question, adminKey) {
  const headers = { 'Content-Type': 'application/json' };
  if (adminKey) headers['X-Admin-Key'] = adminKey;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      signal: ctrl.signal,
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: question }],
      }),
    });
    let body = {};
    try { body = await res.json(); } catch { /* non-JSON */ }
    return {
      status: res.status,
      answer: body.answer ?? null,
      plan: body.plan ?? null,
      db_hit: body.db_hit ?? null,
      sources: body.sources ?? [],
      error: body.error ?? (res.ok ? null : `http_${res.status}`),
    };
  } finally {
    clearTimeout(timer);
  }
}

// ── Haiku scoring ────────────────────────────────────────────────────────────
const SCORE_KEYS = ['grounding', 'judgment', 'relevance', 'source_attribution'];

function extractJson(text) {
  // strict parse first, then first {...} block, defensively
  try { return JSON.parse(text); } catch { /* fall through */ }
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* fall through */ } }
  return null;
}

async function scoreAnswer(apiKey, q, result) {
  const prompt = `You are scoring an AI cutting-tool advisor's answer. Score each criterion 1-5 (5 = best).

Criteria:
- grounding: no invented grades, SKUs or specs; claims consistent with the retrieval metadata below. If the answer flags non-database items as web-sourced, that is GOOD grounding.
- judgment: asks a clarifying question when the query is vague ("${q.category}" === "vague" means a clarifying question scores 5); answers directly when the query is specific. A query of category "system-test" just needs literal compliance.
- relevance: addresses the actual question asked (material, operation, constraint).
- source_attribution: claims tied to the retrieved catalog data where applicable (db_hit=${result.db_hit}, sources=${JSON.stringify(result.sources)}). If db_hit is false and the answer honestly says the catalog has no direct match, score 5.

Question (category: ${q.category}): ${q.question}

Answer:
${result.answer}

Reply with STRICT JSON only, no prose, exactly:
{"grounding": n, "judgment": n, "relevance": n, "source_attribution": n, "note": "one short sentence"}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: SCORING_MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json().catch(() => ({}));
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const parsed = extractJson(text) || {};
  const scores = {};
  for (const k of SCORE_KEYS) {
    const v = Number(parsed[k]);
    scores[k] = Number.isInteger(v) && v >= 1 && v <= 5 ? v : null; // null = unscorable
  }
  return { ...scores, note: typeof parsed.note === 'string' ? parsed.note : '', raw: text.slice(0, 500) };
}

// ── main ─────────────────────────────────────────────────────────────────────
const dryRun = process.argv.includes('--dry-run');
const questions = loadQuestions();

if (dryRun) {
  console.log(`questions.json valid: 15 questions, unique ids, all non-empty.\n`);
  for (const q of questions) console.log(`  [${q.id}] (${q.category}) ${q.question}`);
  console.log('\nDry run complete — no network calls made.');
  process.exit(0);
}

loadDotEnv();
const apiKey = process.env.ANTHROPIC_API_KEY;
const adminKey = process.env.ADMIN_TEST_KEY || null;
if (!apiKey) {
  console.error('ANTHROPIC_API_KEY missing (env or repo-root .env) — full run cannot score. Aborting.');
  process.exit(1);
}
if (!adminKey) console.warn('ADMIN_TEST_KEY not found — running WITHOUT X-Admin-Key, free-quota calls will be consumed.');

const today = new Date().toISOString().slice(0, 10);
const resultsDir = join(HERE, 'results');
if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });

const transcript = [];
for (const q of questions) {
  process.stdout.write(`→ [${q.id}] asking ... `);
  let result;
  try {
    result = await askAdvisor(q.question, adminKey);
  } catch (e) {
    result = { status: 0, answer: null, plan: null, db_hit: null, sources: [], error: String(e.message || e) };
  }
  let scores = null;
  if (result.answer) {
    try { scores = await scoreAnswer(apiKey, q, result); }
    catch (e) { scores = { error: String(e.message || e) }; }
  }
  console.log(result.answer ? `ok (${result.status}, db_hit=${result.db_hit})` : `ERROR ${result.error}`);
  transcript.push({ ...q, result, scores });
  await sleep(DELAY_MS);
}

const jsonPath = join(resultsDir, `${today}.json`);
writeFileSync(jsonPath, JSON.stringify({ date: today, endpoint: ENDPOINT, admin_key_used: !!adminKey, entries: transcript }, null, 2));

const lines = [
  `# Advisor regression — ${today}`,
  '',
  `Endpoint: ${ENDPOINT} · admin key: ${adminKey ? 'yes' : 'no'} · scoring: ${SCORING_MODEL}`,
  '',
  '| id | category | grounding | judgment | relevance | source-attr | flag |',
  '|---|---|---|---|---|---|---|',
];
let flagged = 0, failed = 0;
for (const t of transcript) {
  const s = t.scores || {};
  const vals = SCORE_KEYS.map(k => s[k] ?? '—');
  const isFail = !t.result.answer;
  const isFlag = SCORE_KEYS.some(k => Number(s[k]) <= 2) || isFail;
  if (isFail) failed++;
  if (isFlag) flagged++;
  lines.push(`| ${t.id} | ${t.category} | ${vals.join(' | ')} | ${isFail ? `NO ANSWER (${t.result.error})` : isFlag ? '⚠ low score' : ''} |`);
}
lines.push('', `Flagged (any score ≤ 2 or no answer): ${flagged}/15 · transport failures: ${failed}/15`, '');
const mdPath = join(resultsDir, `${today}-summary.md`);
writeFileSync(mdPath, lines.join('\n'));

console.log(`\nWrote ${jsonPath}\nWrote ${mdPath}`);
process.exit(failed > 0 ? 2 : 0);
