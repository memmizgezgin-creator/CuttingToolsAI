#!/usr/bin/env node
/**
 * upload-to-kv.js — Yerel pipeline sonuçlarını Cloudflare KV'ye yükle
 * ====================================================================
 * Yerel crawl+extract çalıştırdıktan sonra bu scripti çalıştır.
 * Worker cron'u (03:17 UTC) KV'deki veriyi okuyup merge+deploy yapar.
 *
 * Kullanım:
 *   node cloudflare-worker/upload-to-kv.js
 *   node cloudflare-worker/upload-to-kv.js --candidates-only  (mevcut candidates.json'u yükle)
 *   node cloudflare-worker/upload-to-kv.js --dry-run
 *
 * Gerekli env değişkenleri (.env veya shell):
 *   CF_ACCOUNT_ID   — Cloudflare account ID
 *   CF_KV_ID        — PIPELINE_KV namespace ID
 *   CF_API_TOKEN    — KV:Edit iznine sahip API token
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT         = path.resolve(__dirname, '..');
const CANDIDATES   = path.join(ROOT, 'data/extracted-productdb-candidates.json');
const EXTRACTED_OUT = path.join(ROOT, 'ingestion/output/claude-extracted');

const args         = process.argv.slice(2);
const dryRun       = args.includes('--dry-run');
const candidatesOnly = args.includes('--candidates-only');

// ─── Config ────────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.+)/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  }
}

loadEnv();

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_KV_ID      = process.env.CF_KV_ID;
const CF_API_TOKEN  = process.env.CF_API_TOKEN;

if (!CF_ACCOUNT_ID || !CF_KV_ID || !CF_API_TOKEN) {
  console.error('❌ Eksik env değişkeni: CF_ACCOUNT_ID, CF_KV_ID, CF_API_TOKEN gerekli');
  console.error('   .env dosyana ekle veya shell\'de export et');
  process.exit(1);
}

// ─── KV API ────────────────────────────────────────────────────────────────

async function kvPut(key, value) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_ID}/values/${encodeURIComponent(key)}`;
  const body = typeof value === 'string' ? value : JSON.stringify(value);

  if (dryRun) {
    console.log(`  [dry-run] KV.put("${key}") — ${Math.round(body.length / 1024)}KB`);
    return;
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`KV put "${key}" başarısız (${res.status}): ${err.slice(0, 200)}`);
  }
}

// ─── candidates.json → KV ─────────────────────────────────────────────────

async function uploadCandidates() {
  console.log('\n📦 candidates.json → KV');
  if (!fs.existsSync(CANDIDATES)) {
    console.log('  ⚠ candidates.json bulunamadı:', CANDIDATES);
    return 0;
  }
  const raw  = JSON.parse(fs.readFileSync(CANDIDATES, 'utf8'));
  const tools = Array.isArray(raw) ? raw : (raw.tools || []);
  console.log(`  ${tools.length} kayıt yükleniyor...`);
  await kvPut('candidates', { total: tools.length, tools });
  console.log(`  ✅ candidates KV'ye yazıldı`);
  return tools.length;
}

// ─── pending extractions → KV ─────────────────────────────────────────────

async function uploadPendingExtractions() {
  console.log('\n📤 Yeni extraction sonuçları → KV (pending_extractions)');

  if (!fs.existsSync(EXTRACTED_OUT)) {
    console.log('  ⚠ Extraction output klasörü yok');
    return 0;
  }

  const allRecords = [];
  const pdfDirs = fs.readdirSync(EXTRACTED_OUT).filter(d =>
    fs.statSync(path.join(EXTRACTED_OUT, d)).isDirectory()
  );

  for (const pdfDir of pdfDirs) {
    const pdfPath = path.join(EXTRACTED_OUT, pdfDir);
    const runs = fs.readdirSync(pdfPath).filter(d => d.startsWith('run-')).sort().reverse();
    if (runs.length === 0) continue;

    const runPath = path.join(pdfPath, runs[0]);
    for (const filename of ['approved.json', 'review.json']) {
      const file = path.join(runPath, filename);
      if (!fs.existsSync(file)) continue;
      try {
        const records = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (Array.isArray(records)) {
          allRecords.push(...records);
          console.log(`  + ${pdfDir}/${filename}: ${records.length} kayıt`);
        }
      } catch (e) {
        console.log(`  ⚠ ${file} okunamadı:`, e.message);
      }
    }
  }

  if (allRecords.length === 0) {
    console.log('  → Yüklenecek kayıt yok');
    return 0;
  }

  await kvPut('pending_extractions', allRecords);
  console.log(`  ✅ ${allRecords.length} kayıt pending_extractions'a yazıldı`);
  return allRecords.length;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔════════════════════════════════════╗');
  console.log('║  KV Upload — ToolAdvisor Pipeline  ║');
  console.log('╚════════════════════════════════════╝');
  if (dryRun) console.log('⚠  DRY-RUN — KV\'ye yazmayacak\n');

  let total = 0;

  if (candidatesOnly) {
    total = await uploadCandidates();
  } else {
    await uploadCandidates();
    total = await uploadPendingExtractions();
  }

  console.log(`\n✅ Tamamlandı — ${total} kayıt KV'ye yüklendi`);
  console.log('   Worker cron\'u (03:17 UTC) otomatik merge+deploy yapacak.');
  console.log('   Manuel tetiklemek için: curl -X POST https://<worker-url>/run');
}

main().catch(e => {
  console.error('❌ Hata:', e.message);
  process.exit(1);
});
