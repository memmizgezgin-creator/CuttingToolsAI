#!/usr/bin/env node
// verify-bulk-approval.mjs — scripted verification of the validated bulk
// approval flow. Prints PASS/FAIL per check. Self-cleaning: uses a staging
// FIXTURE (a copy of an archived review.json) so it works even when real
// staging is empty, runs ONLY dry-run approve-batch (confirm is never sent),
// and removes the fixture afterwards. The product DB and audit trail must be
// byte-identical before/after.
//
// Usage: node scripts/verify-bulk-approval.mjs

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CANDIDATES  = path.join(ROOT, 'data/extracted-productdb-candidates.json');
const ARCHIVE     = path.join(ROOT, 'ingestion/approved-archive');
const FIXTURE_DIR = path.join(ROOT, 'ingestion/output/claude-extracted/sandvik-c-1020-18-pdf/run-verify-fixture');
const FIXTURE     = path.join(FIXTURE_DIR, 'review.json');
const PORT = 4799;
const BASE = `http://127.0.0.1:${PORT}`;

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
};

// ── fixture setup ────────────────────────────────────────────────────────────
const archived = fs.readdirSync(ARCHIVE).find(f => f.startsWith('sandvik-c-1020-18-pdf__') && f.endsWith('__review.json'));
if (!archived) { console.log('FAIL setup: no archived sandvik review.json to use as fixture'); process.exit(1); }
fs.mkdirSync(FIXTURE_DIR, { recursive: true });
fs.copyFileSync(path.join(ARCHIVE, archived), FIXTURE);
const fixtureCount = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')).length;
console.log(`setup: fixture staged from ${archived} (${fixtureCount} records)`);

const dbBefore      = fs.readFileSync(CANDIDATES, 'utf8');
const fixtureBefore = fs.readFileSync(FIXTURE, 'utf8');

// ── server ───────────────────────────────────────────────────────────────────
const server = spawn('node', ['ingestion/serve-review.js'], {
  cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore',
});

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try { await fetch(`${BASE}/api/staging`); return true; }
    catch { await new Promise(r => setTimeout(r, 250)); }
  }
  return false;
}

try {
  check('server-start', await waitForServer(), `serve-review.js answering on :${PORT}`);

  // 1. grouped endpoint
  const groups = await (await fetch(`${BASE}/api/staging?group=source_file`)).json();
  const g = [...groups].sort((a, b) => b.total - a.total)[0];
  check('group-endpoint', Array.isArray(groups) && !!g && g.total > 0,
    g ? `largest source "${g.source_file}": total=${g.total} clean=${g.clean} flagged=${g.flagged}` : 'no groups returned');
  check('group-counts-consistent', !!g && g.clean + g.flagged === g.total,
    g ? `clean ${g.clean} + flagged ${g.flagged} = total ${g.total}` : 'n/a');
  check('group-sample', !!g && g.cleanSample.length === Math.min(5, g.clean) &&
      g.cleanSample.every(r => r.source_page != null),
    g ? `${g.cleanSample.length} clean sample record(s), all with source_page` : 'n/a');
  check('group-flagged-reasons', !!g && g.flaggedRecords.every(r => r.reasons.length > 0),
    g ? `${g.flaggedRecords.length} flagged record(s), all carry reason codes` : 'n/a');

  // 2. dry-run approve-batch on the largest source (NO confirm field)
  const dry = await (await fetch(`${BASE}/api/approve-batch`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source_file: g.source_file }),
  })).json();
  check('dryrun-response', dry.dryRun === true && dry.wouldMerge === g.clean && dry.flaggedKept === g.flagged,
    `dryRun=${dry.dryRun} wouldMerge=${dry.wouldMerge} flaggedKept=${dry.flaggedKept} (expected ${g.clean}/${g.flagged})`);

  // 3. nothing changed anywhere
  check('db-unchanged', fs.readFileSync(CANDIDATES, 'utf8') === dbBefore,
    `product DB byte-identical after dry run (${JSON.parse(dbBefore).tools.length} tools)`);
  check('staging-unchanged', fs.readFileSync(FIXTURE, 'utf8') === fixtureBefore,
    'fixture staging file byte-identical after dry run');
  check('audit-unchanged', !fs.existsSync(path.join(FIXTURE_DIR, 'rejected.json')),
    'no rejected.json (audit trail) entries created by dry run');
} catch (e) {
  failures++;
  console.log(`FAIL unexpected-error: ${e.message}`);
} finally {
  server.kill();
  fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
  const cleaned = !fs.existsSync(FIXTURE_DIR) && fs.readFileSync(CANDIDATES, 'utf8') === dbBefore;
  check('cleanup', cleaned, 'fixture removed, product DB untouched');
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
