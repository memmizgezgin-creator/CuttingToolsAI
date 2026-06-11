// CuttingToolsAI — pricing page verification (pro.html launch copy)
// Asserts: all verbatim copy strings present, zero em dashes in pro.html,
// no stale pricing claims in site files, and the pricing-page waitlist CTA
// posts to the same path as the upsell modal in modals.js.
//
// Usage: node scripts/verify-pricing-page.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let allPass = true;
function check(name, pass, detail) {
  if (!pass) allPass = false;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
}

const pro = read('pro.html');

// ── 1. Verbatim copy strings ─────────────────────────────────────────────────
const COPY = [
  'Pro pays for itself the first time it prevents a mistake.',
  'The most expensive moment in machining is a wrong call: feeds and speeds that looked fine on paper, a zero that was off by a tenth. The tool breaks, the spindle stops, the part is scrap, and the schedule slips. One incident like that costs more than a year of this subscription.',
  '1 free answer a day. No account, no card. Ask the question you are stuck on right now.',
  '3 free answers a day. Sign in with your email, no password needed. Enough to check yourself on the jobs that matter.',
  '€29/month',
  'Unlimited answers. The full reasoning behind every recommendation, the catalog source behind every tool we suggest, Visual ID, and AI Chat. First 50 on the waitlist get 50% off at launch.',
  'Join the launch waitlist',
  'No brand pays us. The recommendation is what a 20-year tool specialist would pick for your job: drill, end mill, reamer, tap or insert, across every major manufacturer.',
  'Typical machine-hour rates in NL/DE job shops: CNC lathe 45 to 75 EUR, 3-axis milling 55 to 85 EUR, 5-axis machining 85 to 130 EUR. A broken tool with a stopped spindle and a scrapped part typically costs several hundred euros per incident.',
];
for (const s of COPY) {
  check(`copy: "${s.slice(0, 48)}…"`, pro.includes(s), pro.includes(s) ? 'present' : 'MISSING');
}

// ── 2. Zero em dashes in pro.html ────────────────────────────────────────────
const emDashes = (pro.match(/—/g) || []).length;
check('no em dashes in pro.html', emDashes === 0, `${emDashes} found`);

// ── 3. No stale pricing claims in site files ─────────────────────────────────
const SITE_FILES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'))
  .concat(['modals.js', 'advisor-ai-widget.js', 'page-switcher.js']);
const STALE = [
  /5 queries/i, /5\/day/i, /5 advisor runs/i, /5 free quer/i,
  /14-day free trial/i, /Start 14-day/i, /€79/, /79 \/ seat/i,
];
const hits = [];
for (const f of SITE_FILES) {
  const src = read(f);
  for (const re of STALE) {
    for (const [i, line] of src.split('\n').entries()) {
      if (re.test(line)) hits.push(`${f}:${i + 1} [${re}]: ${line.trim().slice(0, 100)}`);
    }
  }
}
check('no stale pricing claims in site files', hits.length === 0,
  hits.length ? `\n  ${hits.join('\n  ')}` : 'no hits');

// ── 4. Waitlist CTA posts to the same path as the modal ─────────────────────
const modalPath = (read('modals.js').match(/fetch\('([^']+)'\s*,\s*\{\s*\n?\s*method:\s*'POST'/) ||
                   read('modals.js').match(/fetch\('(\/waitlist)'/) || [])[1];
const proPath   = (pro.match(/fetch\('(\/[^']+)'/) || [])[1];
check('waitlist CTA path matches modal', !!modalPath && proPath === modalPath,
  `pro.html posts to "${proPath}", modal posts to "${modalPath}"`);

console.log(allPass ? '\nALL PASS' : '\nFAILURES PRESENT');
process.exit(allPass ? 0 : 1);
