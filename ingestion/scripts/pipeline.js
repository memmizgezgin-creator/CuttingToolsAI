#!/usr/bin/env node
/**
 * ToolAdvisor Full Automation Pipeline
 * =====================================
 * Adım 1: Üretici kataloglarını indir (catalogue-crawler)
 * Adım 2: Yeni PDF'leri Claude API ile işle (claude-extract)
 * Adım 3: Onaylı kayıtları birleştir (merge)
 * Adım 4: directory-data-extracted.js üret
 * Adım 5: Cloudflare Pages'e deploy et
 *
 * Kullanım:
 *   node ingestion/scripts/pipeline.js
 *   node ingestion/scripts/pipeline.js --no-crawl    → sadece merge+deploy
 *   node ingestion/scripts/pipeline.js --no-deploy   → crawl+extract+merge ama deploy etme
 *   node ingestion/scripts/pipeline.js --dry-run     → sadece ne yapacağını göster
 *
 * Cron (her gün 03:17):
 *   17 3 * * * /opt/homebrew/bin/node /Users/muratonder/Desktop/ToolAdvisor/ingestion/scripts/pipeline.js >> /tmp/tooladvisor-pipeline-daily.log 2>&1
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const { execSync, spawnSync } = require('child_process');

// ─── Paths ─────────────────────────────────────────────────────────────────
const ROOT          = path.resolve(__dirname, '../..');
const CANDIDATES    = path.join(ROOT, 'data/extracted-productdb-candidates.json');
const EXTRACTED_JS  = path.join(ROOT, 'directory-data-extracted.js');
const DEPLOY_DIR    = '/tmp/tooladvisor-deploy';
const EXTRACTED_OUT = path.join(ROOT, 'ingestion/output/claude-extracted');
const CRAWLER       = path.join(__dirname, 'catalogue-crawler.js');
const EXTRACT       = path.join(__dirname, 'claude-extract.js');
const INBOX_DIR     = path.join(ROOT, 'ingestion/inbox');
const PROCESSED_DIR = path.join(ROOT, 'ingestion/output/processed');

// ─── Args ──────────────────────────────────────────────────────────────────
const args      = process.argv.slice(2);
const noCrawl   = args.includes('--no-crawl');
const noDeploy  = args.includes('--no-deploy');
const dryRun    = args.includes('--dry-run');

// ─── Logging ───────────────────────────────────────────────────────────────
const LOG_FILE = `/tmp/pipeline-${Date.now()}.log`;
function log(...msg) {
  const line = msg.join(' ');
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

// ─── API Key ───────────────────────────────────────────────────────────────
function getApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const envPath = path.join(ROOT, '.env');
  if (fs.existsSync(envPath)) {
    const m = fs.readFileSync(envPath, 'utf8').match(/ANTHROPIC_API_KEY=(.+)/);
    if (m) return m[1].trim();
  }
  return null;
}

// ─── Step 1: Crawl + Extract ───────────────────────────────────────────────
function stepCrawl() {
  log('\n📥 ADIM 1: Katalog indir + extract');
  if (dryRun) { log('  [dry-run] katalog-crawler atlandı'); return; }

  const apiKey = getApiKey();
  const env = { ...process.env };
  if (apiKey) env.ANTHROPIC_API_KEY = apiKey;

  const result = spawnSync('node', [CRAWLER], {
    cwd: ROOT,
    env,
    stdio: 'inherit',
    timeout: 4 * 60 * 60 * 1000 // 4 saat max
  });

  if (result.status !== 0) {
    log('  ⚠  Crawler hata döndürdü (status', result.status, ')— devam ediyoruz');
  } else {
    log('  ✅ Crawler tamamlandı');
  }
}

// ─── Step 1b: Process inbox PDFs ───────────────────────────────────────────
function stepInbox() {
  log('\n📥 ADIM 1B: Inbox PDF\'leri işle');

  if (!fs.existsSync(INBOX_DIR)) {
    log('  ℹ inbox klasörü yok');
    return;
  }

  const pdfFiles = fs.readdirSync(INBOX_DIR)
    .filter(f => f.toLowerCase().endsWith('.pdf'));

  if (pdfFiles.length === 0) {
    log('  ℹ inbox klasöründe PDF yok');
    return;
  }

  log(`  📁 ${pdfFiles.length} PDF bulundu`);

  const apiKey = getApiKey();
  if (!apiKey) {
    log('  ⚠ API key bulunamadı, inbox atlandı');
    return;
  }

  const env = { ...process.env };
  if (apiKey) env.ANTHROPIC_API_KEY = apiKey;

  // Her PDF'i işle
  let processed = 0;
  for (const pdfFile of pdfFiles) {
    const pdfPath = path.join(INBOX_DIR, pdfFile);
    log(`  📄 İşleniyor: ${pdfFile}`);

    if (dryRun) {
      log(`    [dry-run] claude-extract atlandı`);
      processed++;
      continue;
    }

    // claude-extract.js'i çalıştır
    const result = spawnSync('node', [EXTRACT, pdfPath], {
      cwd: ROOT,
      env,
      stdio: 'inherit',
      timeout: 4 * 60 * 60 * 1000 // 4 saat max
    });

    if (result.status === 0) {
      // İşlenmiş PDF'i processed/ klasörüne taşı
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('Z')[0];
      if (!fs.existsSync(PROCESSED_DIR)) {
        fs.mkdirSync(PROCESSED_DIR, { recursive: true });
      }

      const destPath = path.join(PROCESSED_DIR, `${timestamp}_${pdfFile}`);
      fs.renameSync(pdfPath, destPath);
      log(`  ✅ ${pdfFile} işlendi ve archived`);
      processed++;
    } else {
      log(`  ⚠ ${pdfFile} işlenemedi (status ${result.status})`);
    }
  }

  log(`  📊 ${processed}/${pdfFiles.length} PDF başarıyla işlendi`);
}

// ─── Step 2: Merge all approved records ────────────────────────────────────
// Confidence eşiği: 70+ otomatik kabul (eski 85 çok katıydı)
const CONF_MERGE_MIN = 70;

function detectFamily(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('drill') || t.includes('boring bar') || t.includes('countersink')) return 'Drilling';
  if (t.includes('tap') || t.includes('thread mill') || t.includes('threading')) return 'Threading';
  if (t.includes('ream')) return 'Reaming';
  if (t.includes('groove') || t.includes('parting') || t.includes('cut-off')) return 'Grooving';
  if (t.includes('turning') || t.includes('insert') || t.includes('cnmg') || t.includes('cngg')) return 'Turning';
  if (t.includes('mill') || t.includes('end mill') || t.includes('slot') || t.includes('face mill')) return 'Milling';
  return 'Drilling';
}

function mapRawRecord(r, id) {
  if (!r.article_number && !r.product_name) return null;
  const ms = r.material_suitability || {};
  const isoAll = ['P','M','K','N','S','H'].filter(k => ms[k] === true);
  const brand = r.brand || 'Gühring';
  const family = detectFamily((r.family || '') + ' ' + (r.product_name || ''));
  const opMap = { Drilling:'Solid', Threading:'Internal', Reaming:'Finishing',
                  Turning:'Mixed', Milling:'Solid', Grooving:'External' };
  const bestFor = [r.product_name, r.family, r.shank_form, r.depth_multiplier]
    .filter(Boolean).join(' | ').slice(0, 200);
  return {
    id, brand,
    code: r.article_number || '',
    grade: r.material_grade || '',
    shape: '-', tone: 'iso-p',
    iso: isoAll[0] || (ms.P !== false ? 'P' : 'K'),
    iso_all: isoAll.length > 0 ? isoAll : null,
    family,
    op: opMap[family] || 'Solid',
    vcMin: r.cutting_data?.vc_min || null,
    vcMax: r.cutting_data?.vc_max || null,
    fMin: r.cutting_data?.feed_min || null,
    fMax: r.cutting_data?.feed_max || null,
    apMin: null, apMax: null,
    coolant: '', stability: '', bestFor,
    confidence: Math.round(r.confidence || 70),
    supply: 3, equivalents: 0, equivIds: [], betterValueId: null,
    source: r.source || 'initial-import',
    dateAdded: r.dateAdded || '2025-01-01',
    lastVerified: new Date().toISOString().slice(0, 10),
    article: String(r.article_number || ''),
    source_pdf: r.source_pdf || ''
  };
}

function stepMerge() {
  log('\n🔀 ADIM 2: Onaylı kayıtları birleştir (conf >= ' + CONF_MERGE_MIN + ')');

  // Load existing candidates
  let existing = [];
  if (fs.existsSync(CANDIDATES)) {
    try {
      const raw = JSON.parse(fs.readFileSync(CANDIDATES, 'utf8'));
      existing = Array.isArray(raw) ? raw : (raw.tools || []);
      log(`  Mevcut kayıt: ${existing.length}`);
    } catch (e) {
      log('  ⚠ candidates.json okunamadı:', e.message);
    }
  }

  // De-dup by article+source_pdf (more robust than id alone)
  const existingIds = new Set(existing.map(r => r.id));
  const existingKeys = new Set(existing.map(r => (r.article || '') + '|' + (r.source_pdf || '')));
  let idCounter = existing.length + 1;

  let newRecords = [];
  if (!fs.existsSync(EXTRACTED_OUT)) {
    log('  ⚠ Extraction output klasörü yok, merge atlandı');
    return existing;
  }

  const pdfDirs = fs.readdirSync(EXTRACTED_OUT).filter(d =>
    fs.statSync(path.join(EXTRACTED_OUT, d)).isDirectory()
  );

  for (const pdfDir of pdfDirs) {
    const pdfPath = path.join(EXTRACTED_OUT, pdfDir);
    const runs = fs.readdirSync(pdfPath)
      .filter(d => d.startsWith('run-'))
      .sort()
      .reverse(); // en yeni run önce

    if (runs.length === 0) continue;
    const latestRun = runs[0];
    const runPath = path.join(pdfPath, latestRun);

    // Read approved.json (already mapped to our schema) AND review.json (raw format, needs mapping)
    const filesToCheck = [
      { file: path.join(runPath, 'approved.json'), raw: false },
      { file: path.join(runPath, 'review.json'), raw: true },
    ];

    let pdfAdded = 0;
    for (const { file, raw } of filesToCheck) {
      if (!fs.existsSync(file)) continue;
      try {
        const records = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (!Array.isArray(records) || records.length === 0) continue;

        for (const r of records) {
          const conf = r.confidence || 0;
          if (conf < CONF_MERGE_MIN) continue;
          if (r.auto_approved && !raw) {
            // approved.json: use as-is (already has our id)
            if (!r.id || existingIds.has(r.id)) continue;
            existingIds.add(r.id);
            newRecords.push(r);
            pdfAdded++;
          } else if (raw) {
            // review.json: map to our schema
            const key = (r.article_number || '') + '|' + (r.source_pdf || '');
            if (existingKeys.has(key)) continue;
            existingKeys.add(key);
            const id = 'X' + String(idCounter++).padStart(4, '0');
            const mapped = mapRawRecord(r, id);
            if (!mapped) continue;
            existingIds.add(id);
            newRecords.push(mapped);
            pdfAdded++;
          }
        }
      } catch (e) {
        log(`  ⚠ ${file} okunamadı:`, e.message);
      }
    }
    if (pdfAdded > 0) log(`  + ${pdfDir}: ${pdfAdded} yeni kayıt`);
  }

  if (newRecords.length === 0) {
    log('  → Yeni kayıt yok');
    return existing;
  }

  const merged = [...existing, ...newRecords];
  log(`  ✅ ${newRecords.length} yeni kayıt eklendi → toplam ${merged.length}`);

  if (!dryRun) {
    fs.writeFileSync(CANDIDATES, JSON.stringify({ total: merged.length, tools: merged }, null, 2));
    log(`  💾 ${CANDIDATES} güncellendi`);
  }

  return merged;
}

// ─── Step 3: Generate directory-data-extracted.js ──────────────────────────
function sanitize(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, ' ')
    .replace(/\t/g, ' ')
    .trim();
}

function toolToJS(t) {
  const isoAll = Array.isArray(t.iso_all)
    ? `[${t.iso_all.map(x => `'${x}'`).join(',')}]`
    : 'null';

  return `  {
    id:'${sanitize(t.id)}', brand:'${sanitize(t.brand)}', code:'${sanitize(t.code||'')}',
    grade:'${sanitize(t.grade||'')}', shape:'${sanitize(t.shape||'-')}', tone:'${sanitize(t.tone||'iso-p')}',
    iso:'${sanitize(t.iso||'P')}', iso_all:${isoAll},
    family:'${sanitize(t.family||'Drilling')}', op:'${sanitize(t.op||'')}',
    vcMin:${t.vcMin||null}, vcMax:${t.vcMax||null},
    fMin:${t.fMin||null}, fMax:${t.fMax||null},
    apMin:${t.apMin||null}, apMax:${t.apMax||null},
    coolant:'${sanitize(t.coolant||'')}', stability:'${sanitize(t.stability||'')}',
    bestFor:'${sanitize(t.bestFor||'')}',
    confidence:${t.confidence||85}, supply:${t.supply||3}, equivalents:${t.equivalents||0},
    equivIds:${Array.isArray(t.equivIds) ? JSON.stringify(t.equivIds) : '[]'},
    betterValueId:${t.betterValueId ? `'${sanitize(t.betterValueId)}'` : 'null'},
    source:'${sanitize(t.source||'initial-import')}',
    dateAdded:'${sanitize(t.dateAdded||'2025-01-01')}',
    lastVerified:'${sanitize(t.lastVerified||new Date().toISOString().slice(0,10))}',
    article:'${sanitize(String(t.article||''))}'
  }`;
}

function stepGenerateJS(tools) {
  log(`\n📝 ADIM 3: directory-data-extracted.js üret (${tools.length} kayıt)`);

  const jsEntries = tools.map(t => toolToJS(t)).join(',\n');
  const output = `// ToolAdvisor — Extracted tool records (${tools.length} tools from manufacturer catalogues)
// Auto-generated ${new Date().toISOString().slice(0,10)} by pipeline.js — DO NOT edit manually
(function () {
  if (!window.TA_TOOLS) window.TA_TOOLS = [];
  const EXTRACTED = [
${jsEntries}
  ];
  window.TA_TOOLS = window.TA_TOOLS.concat(EXTRACTED);
})();
`;

  // Syntax check before writing
  try {
    // Write to temp file and check with node --check
    const tmpFile = `/tmp/ta-syntax-check-${Date.now()}.js`;
    fs.writeFileSync(tmpFile, output.replace(/window\./g, 'global.'));
    const check = spawnSync('node', ['--check', tmpFile], { timeout: 10000 });
    fs.unlinkSync(tmpFile);
    if (check.status !== 0) {
      const err = (check.stderr || '').toString();
      log('  ❌ Syntax hatası! Dosya yazılmadı:', err.slice(0,200));
      return false;
    }
    log('  ✅ Syntax OK');
  } catch (e) {
    log('  ❌ Syntax kontrol hatası:', e.message);
    return false;
  }

  if (!dryRun) {
    fs.writeFileSync(EXTRACTED_JS, output, 'utf8');
    log(`  💾 ${EXTRACTED_JS} yazıldı (${Math.round(output.length/1024)}KB)`);
  }
  return true;
}

// ─── Step 4: Deploy ────────────────────────────────────────────────────────
function stepDeploy() {
  log('\n🚀 ADIM 4: Cloudflare Pages deploy');
  if (dryRun) { log('  [dry-run] deploy atlandı'); return; }

  // Sync site files to deploy dir
  fs.mkdirSync(DEPLOY_DIR, { recursive: true });

  // Copy all static files
  const extensions = ['.html', '.js', '.jsx', '.css', '.json', '.txt', '.xml', '.png', '.ico', '.svg', '.webmanifest'];
  const staticFiles = ['_headers', '_redirects', 'CNAME'];

  let copied = 0;
  for (const f of fs.readdirSync(ROOT)) {
    const full = path.join(ROOT, f);
    if (!fs.statSync(full).isFile()) continue;
    const ext = path.extname(f);
    if (extensions.includes(ext) || staticFiles.includes(f)) {
      const size = fs.statSync(full).size;
      if (size > 24 * 1024 * 1024) { // skip >24MB files (Cloudflare limit)
        log(`  ⏭  Skipping large file: ${f} (${Math.round(size/1024/1024)}MB)`);
        continue;
      }
      fs.copyFileSync(full, path.join(DEPLOY_DIR, f));
      copied++;
    }
  }

  // Copy assets folder if exists
  const assetsDir = path.join(ROOT, 'assets');
  if (fs.existsSync(assetsDir)) {
    const deployAssets = path.join(DEPLOY_DIR, 'assets');
    fs.mkdirSync(deployAssets, { recursive: true });
    for (const f of fs.readdirSync(assetsDir)) {
      fs.copyFileSync(path.join(assetsDir, f), path.join(deployAssets, f));
    }
  }

  log(`  📁 ${copied} dosya kopyalandı → ${DEPLOY_DIR}`);

  const result = spawnSync('npx', [
    'wrangler', 'pages', 'deploy', DEPLOY_DIR,
    '--project-name=tooladvisor-v2',
    '--branch=main',
    '--commit-dirty=true'
  ], {
    cwd: ROOT,
    stdio: 'inherit',
    timeout: 5 * 60 * 1000 // 5 dk max
  });

  if (result.status === 0) {
    log('  ✅ Deploy başarılı!');
  } else {
    log('  ❌ Deploy başarısız (status', result.status, ')');
    process.exit(1);
  }
}

// ─── Summary ───────────────────────────────────────────────────────────────
function printSummary(startTime, toolCount) {
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  log('\n' + '─'.repeat(60));
  log('🎉 Pipeline tamamlandı!');
  log(`   Süre: ${mins > 0 ? mins+'dk ' : ''}${secs}sn`);
  log(`   Katalogdaki toplam ürün: ${toolCount}`);
  log(`   Log: ${LOG_FILE}`);
  log('─'.repeat(60));
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();

  log('╔═══════════════════════════════════════════╗');
  log('║  ToolAdvisor Automation Pipeline          ║');
  log(`║  ${new Date().toISOString()}  ║`);
  log('╚═══════════════════════════════════════════╝');
  if (dryRun)   log('⚠  DRY-RUN modu — hiçbir şey yazılmayacak');
  if (noCrawl)  log('ℹ  --no-crawl: katalog indirme atlanacak');
  if (noDeploy) log('ℹ  --no-deploy: deploy atlanacak');

  // Step 1: Crawl + Extract
  if (!noCrawl) {
    stepCrawl();
  } else {
    log('\n⏭  ADIM 1 atlandı (--no-crawl)');
  }

  // Step 1b: Inbox (her zaman çalışır, --no-crawl ile atlanmaz)
  stepInbox();

  // Step 2: Merge
  const allTools = stepMerge();

  // Step 3: Generate JS
  if (allTools.length === 0) {
    log('\n⚠  Hiç kayıt yok, deploy atlanıyor');
    return;
  }
  const ok = stepGenerateJS(allTools);
  if (!ok) {
    log('\n❌ JS üretilemedi, pipeline durdu');
    process.exit(1);
  }

  // Step 4: Deploy
  if (!noDeploy) {
    stepDeploy();
  } else {
    log('\n⏭  ADIM 4 atlandı (--no-deploy)');
  }

  printSummary(startTime, allTools.length);
}

main().catch(e => {
  log('❌ Pipeline hatası:', e.message);
  process.exit(1);
});
