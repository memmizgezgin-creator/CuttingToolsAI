#!/usr/bin/env node
/**
 * catalogue-crawler.js
 *
 * Kesici takım PDF kataloğu otomatik indirici.
 *
 * Strateji:
 *   1. Bilinen direkt PDF URL'leri → direkt indir (en güvenilir)
 *   2. Bing Search API → yeni URL keşfi (opsiyonel, BING_API_KEY gerekli)
 *   3. İndirilen her PDF → claude-extract.js ile otomatik işleme
 *
 * Kullanım:
 *   npm run crawl                   → indir + çıkar
 *   npm run crawl:no-extract        → sadece indir
 *   npm run crawl sandvik           → sadece Sandvik
 *
 * Cron (haftada bir Pazartesi 03:00):
 *   0 3 * * 1 cd /Users/muratonder/Desktop/ToolAdvisor && npm run crawl >> /tmp/weekly-crawl.log 2>&1
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const fs      = require('fs');
const path    = require('path');
const https   = require('https');
const http    = require('http');
const zlib    = require('zlib');
const { URL } = require('url');
const { spawn } = require('child_process');

// ─── Bilinen direkt PDF URL'leri ──────────────────────────────────────────
// Bu URL'ler web aramasıyla doğrulandı. Yeni katalog çıkınca buraya ekle.
const KNOWN_PDFS = [

  // ── WALTER TOOLS ──────────────────────────────────────────────────────
  {
    manufacturer: 'walter',
    name: 'Walter',
    label: 'Insert Drill Handbook',
    url: 'https://cdn.walter-tools.com/files/sitecollectiondocuments/downloads/global/manuals/en-gb/handbook-walter-insert-drill-en.pdf',
  },
  {
    manufacturer: 'walter',
    name: 'Walter',
    label: 'Turning Catalogue 2024 (elibrary)',
    url: 'https://elibrary.walter-tools.com/frontend/catalogs/682341/10/pdf/complete.pdf',
  },

  // ── KENNAMETAL ────────────────────────────────────────────────────────
  {
    manufacturer: 'kennametal',
    name: 'Kennametal',
    label: 'Turning Brochure',
    url: 'https://www.kennametal.com/content/dam/final/kennametal/catalogs/turning/kennametal-turning-brochure_en.pdf',
  },
  {
    manufacturer: 'kennametal',
    name: 'Kennametal',
    label: 'Drilling Tool Catalog',
    url: 'https://drillingworld.com/pdf/Product%20Data%20Sheets/kennametal%20drilling%20tool%20catalog.pdf',
  },

  // ── ISCAR ─────────────────────────────────────────────────────────────
  {
    manufacturer: 'iscar',
    name: 'Iscar',
    label: 'Cutting Tools User Guide 2023',
    url: 'https://www.iscar.com/Catalogs/publication-2023/english_1/Cutting_tools_user_guide_2023/Cutting_tools_user_guide_2023.pdf',
  },
  {
    manufacturer: 'iscar',
    name: 'Iscar',
    label: 'ISCAR World 2023',
    url: 'https://www.iscar.com/Catalogs/publication-2023/english-1/ISCAR_WORLD_2023/ISCAR_WORLD_2023.pdf',
  },
  {
    manufacturer: 'iscar',
    name: 'Iscar',
    label: 'Multi-Master Indexable Solid',
    url: 'https://www.iscar.com/Catalogs/Publication/english_1/MULTI_MASTER_INDEXABLE_SOLID/MULTI_MASTER_INDEXABLE_SOLID.pdf',
  },
  {
    manufacturer: 'iscar',
    name: 'Iscar',
    label: 'Milling Applications Guide',
    url: 'https://www.iscar.com/Catalogs/Publication/Reference_Guide/english_1/Milling_Applications_and_Cutter_Basics_Guide/Milling_Applications_and_Cutter_Basics_Guide.pdf',
  },
  {
    manufacturer: 'iscar',
    name: 'Iscar',
    label: 'Aluminum Machining',
    url: 'https://www.iscar.com/Catalogs/Publication/english_1/ALUMINUM_MACHINING/ALUMINUM_MACHINING.pdf',
  },
  {
    manufacturer: 'iscar',
    name: 'Iscar',
    label: 'Special Tailored Tools 2025',
    url: 'https://www.iscar.com/Catalogs/Publication/english_1/Special_Tailored_Tools_2025/Special_Tailored_Tools_2025.pdf',
  },
  {
    manufacturer: 'iscar',
    name: 'Iscar',
    label: 'Grade Chart',
    url: 'https://www.iscar.com/ecat/iscar_grade_chart.pdf',
  },

  // ── SANDVIK COROMANT ──────────────────────────────────────────────────
  // CoroPlus login gerektiriyor — kullanıcının indirdiği PDF pipeline'dan geçirilecek

  // ── YG-1 ──────────────────────────────────────────────────────────────
  {
    manufacturer: 'yg1',
    name: 'YG-1',
    label: 'End Mill Catalogue',
    url: 'https://europe.yg1.com/download/YG-1_EU_EndMill_Catalogue.pdf',
  },

  // ── KYOCERA ───────────────────────────────────────────────────────────
  {
    manufacturer: 'kyocera',
    name: 'Kyocera',
    label: 'General Catalogue',
    url: 'https://www.kyocera-unimerco.com/media/kyjaxiyk/kyocera-unimerco-general-catalogue.pdf',
  },

  // ── TUNGALOY ──────────────────────────────────────────────────────────
  {
    manufacturer: 'tungaloy',
    name: 'Tungaloy',
    label: 'General Catalogue',
    url: 'https://www.tungaloy.com/us/wp-content/uploads/sites/2/2023/03/Tungaloy_General_Catalogue.pdf',
  },
];

// ─── Bing Search ile yeni URL keşfi ──────────────────────────────────────
const SEARCH_QUERIES = [
  { manufacturer: 'sandvik', query: 'site:sandvik.coromant.com filetype:pdf catalogue turning drilling milling' },
  { manufacturer: 'mitsubishi', query: 'site:mmc-carbide.com filetype:pdf catalogue 2024' },
  { manufacturer: 'osg', query: 'site:osgtool.com filetype:pdf catalogue 2024' },
  { manufacturer: 'seco', query: 'site:secotools.com filetype:pdf catalogue 2024' },
  { manufacturer: 'mapal', query: 'site:mapal.com filetype:pdf catalogue drilling reaming' },
  { manufacturer: 'taegutec', query: 'site:taegutec.com filetype:pdf catalogue 2024' },
  { manufacturer: 'korloy', query: 'site:korloy.com filetype:pdf catalogue 2024' },
  { manufacturer: 'sumitomo', query: 'site:sumitool.com filetype:pdf catalogue 2024' },
];

// ─── Sitemap-based PDF discovery ─────────────────────────────────────────
// sitemap.xml'leri tara → catalogue/catalog/brochure içeren .pdf URL'lerini bul.
// Sitemap index dosyaları otomatik olarak özyinelemeli takip edilir (derinlik ≤ 3).
// URLs verified with HEAD requests — each returns HTTP 200.
const SITEMAP_SOURCES = [
  {
    manufacturer: 'walter',
    name: 'Walter',
    sitemapUrl: 'https://www.walter-tools.com/sitemap_index.xml', // index → sub-sitemaps
  },
  {
    manufacturer: 'iscar',
    name: 'ISCAR',
    sitemapUrl: 'https://www.iscar.com/sitemap_index.xml',        // /sitemap.xml → 404
  },
  {
    manufacturer: 'kennametal',
    name: 'Kennametal',
    sitemapUrl: 'https://www.kennametal.com/us/en.sitemap.xml',   // /sitemap.xml → 301 → 404
  },
  {
    manufacturer: 'tungaloy',
    name: 'Tungaloy',
    sitemapUrl: 'https://tungaloy.com/sitemap_index.xml',         // www redirects → apex
  },
  {
    manufacturer: 'kyocera',
    name: 'Kyocera',
    sitemapUrl: 'https://www.kyocera-unimerco.com/en-global/sitemap_index.xml', // 307 resolved
  },
];

// URL'nin katalog PDF'si sayılması için en az biri içermeli (case-insensitive)
const PDF_KEYWORDS = ['catalogue', 'catalog', 'brochure', 'handbook', 'katalog', 'prospekt'];

// ─── Config ────────────────────────────────────────────────────────────────
const INPUT_DIR     = path.resolve(__dirname, '..', 'input', 'pending');
const EXTRACT_SCRIPT = path.resolve(__dirname, 'claude-extract.js');
const LOG_PATH      = path.resolve(__dirname, '..', 'output', 'reports', 'crawl-log.json');
const REGISTRY_PATH = path.resolve(__dirname, '..', 'output', 'reports', 'catalogue-registry.json');
const MAX_PDF_SIZE  = 300 * 1024 * 1024; // 300MB max

// ─── Helpers ───────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function sanitizeFilename(str) {
  return str.replace(/[^a-z0-9\-_.]/gi, '_').toLowerCase().slice(0, 100);
}

function loadRegistry() {
  try { return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8')); }
  catch { return { downloaded: {}, lastRun: null }; }
}

function saveRegistry(reg) {
  fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(reg, null, 2));
}

// ─── HEAD request — check if URL accessible & get size ────────────────────
function checkUrl(url) {
  return new Promise(resolve => {
    try {
      const proto  = url.startsWith('https') ? https : http;
      const req = proto.request(url, { method: 'HEAD', timeout: 10000,
        headers: { 'User-Agent': 'ToolAdvisor-Catalogue-Bot/1.0' } }, res => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 400,
          status: res.statusCode,
          size: parseInt(res.headers['content-length'] || '0', 10),
          lastModified: res.headers['last-modified'] || null,
          contentType: res.headers['content-type'] || '',
        });
      });
      req.on('error', () => resolve({ ok: false, status: 0 }));
      req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0 }); });
      req.end();
    } catch { resolve({ ok: false, status: 0 }); }
  });
}

// ─── Download PDF ──────────────────────────────────────────────────────────
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file  = fs.createWriteStream(destPath);

    const req = proto.get(url, {
      headers: { 'User-Agent': 'ToolAdvisor-Catalogue-Bot/1.0' },
      timeout: 120000,
    }, res => {
      if ([301, 302, 303, 307].includes(res.statusCode) && res.headers.location) {
        file.close(); fs.unlinkSync(destPath);
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close(); fs.unlinkSync(destPath);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const total = parseInt(res.headers['content-length'] || '0', 10);
      if (total > MAX_PDF_SIZE) {
        file.close(); res.destroy(); fs.unlinkSync(destPath);
        return reject(new Error(`Too large: ${Math.round(total/1024/1024)}MB`));
      }
      let received = 0;
      res.on('data', chunk => {
        received += chunk.length;
        process.stdout.write(`\r  ⬇  ${Math.round(received/1024)}KB...`);
      });
      res.pipe(file);
      file.on('finish', () => { file.close(); process.stdout.write('\n'); resolve(received); });
    });
    req.on('error', err => { file.close(); try { fs.unlinkSync(destPath); } catch {} reject(err); });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ─── Sitemap helpers ───────────────────────────────────────────────────────

/**
 * URL'den içerik çek; gzip (Content-Encoding veya .gz uzantısı) varsa aç.
 * Redirect'leri 5 derinliğe kadar takip eder.
 */
function fetchText(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    try {
      const proto = url.startsWith('https') ? https : http;
      const req = proto.get(url, {
        headers: {
          'User-Agent': 'ToolAdvisor-Catalogue-Bot/1.0',
          'Accept-Encoding': 'gzip, deflate',
        },
        timeout: 20000,
      }, res => {
        // Redirect
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          const next = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          return fetchText(next, redirects + 1).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));

        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          const buf = Buffer.concat(chunks);
          const enc = (res.headers['content-encoding'] || '').toLowerCase();
          const isGz = enc.includes('gzip') || url.endsWith('.gz');
          if (isGz) {
            zlib.gunzip(buf, (err, result) =>
              err ? reject(err) : resolve(result.toString('utf8')));
          } else {
            resolve(buf.toString('utf8'));
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    } catch (e) { reject(e); }
  });
}

/**
 * Sitemap XML metninden tüm <loc> değerlerini çıkar.
 * Hem sitemap index (<sitemap><loc>) hem urlset (<url><loc>) formatını destekler.
 */
function parseSitemapLocs(xml) {
  const locs = [];
  const re = /<loc>\s*(https?[^<\s]+)\s*<\/loc>/gi;
  let m;
  while ((m = re.exec(xml)) !== null) locs.push(m[1].trim());
  return locs;
}

/**
 * Bir sitemap URL'sini özyinelemeli olarak tara ve katalog PDF URL'lerini döndür.
 * @param {string}  sitemapUrl  Taranacak sitemap adresi
 * @param {string}  manufacturer  Üretici slug'ı (log için)
 * @param {number}  depth       Özyineleme derinliği (max 3)
 * @param {Set}     seen        Ziyaret edilen URL'ler (döngü koruması)
 * @returns {Promise<string[]>} Eşleşen PDF URL'leri
 */
async function fetchSitemapPdfs(sitemapUrl, manufacturer, depth = 0, seen = new Set()) {
  if (depth > 3 || seen.has(sitemapUrl)) return [];
  seen.add(sitemapUrl);

  let xml;
  try {
    xml = await fetchText(sitemapUrl);
  } catch (err) {
    console.log(`    ⚠ Sitemap fetch failed (depth ${depth}): ${sitemapUrl.slice(0, 80)} — ${err.message}`);
    return [];
  }

  const locs = parseSitemapLocs(xml);
  const pdfs = [];
  const subSitemaps = [];

  for (const loc of locs) {
    const lower = loc.toLowerCase();
    if (lower.endsWith('.xml') || lower.endsWith('.xml.gz')) {
      subSitemaps.push(loc);
    } else if (lower.endsWith('.pdf') && PDF_KEYWORDS.some(kw => lower.includes(kw))) {
      pdfs.push(loc);
    }
  }

  if (subSitemaps.length > 0) {
    console.log(`    ↳ Index sitemap: ${subSitemaps.length} sub-sitemaps found`);
    for (const sub of subSitemaps) {
      await sleep(250);
      const subPdfs = await fetchSitemapPdfs(sub, manufacturer, depth + 1, seen);
      pdfs.push(...subPdfs);
    }
  }

  return pdfs;
}

/**
 * Tüm SITEMAP_SOURCES'ları tara ve KNOWN_PDFS formatında sonuç döndür.
 * allPdfs ile birleştirilirken URL bazlı deduplikasyon yapılır.
 */
async function discoverFromSitemaps(targetSlug, existingUrls) {
  const sources = SITEMAP_SOURCES.filter(s => !targetSlug || s.manufacturer === targetSlug);
  if (sources.length === 0) return [];

  const discovered = [];
  const existing = new Set(existingUrls);
  console.log(`\n🗺  Scanning sitemaps (${sources.length} domains)...`);

  for (const { manufacturer, name, sitemapUrl } of sources) {
    process.stdout.write(`  [${name}] ${sitemapUrl} … `);
    const pdfs = await fetchSitemapPdfs(sitemapUrl, manufacturer);
    const fresh = pdfs.filter(url => !existing.has(url));
    console.log(`${pdfs.length} PDF(s) found, ${fresh.length} new`);

    for (const url of fresh) {
      const label = path.basename(new URL(url).pathname, '.pdf').replace(/[-_]/g, ' ');
      discovered.push({
        manufacturer,
        name,
        label: `Sitemap · ${label}`,
        url,
        source: 'sitemap',
      });
      existing.add(url); // deduplicate within this run
    }

    await sleep(600); // polite delay between domains
  }

  return discovered;
}

// ─── Bing Search API — yeni PDF keşfi ─────────────────────────────────────
async function searchBing(query) {
  const apiKey = process.env.BING_API_KEY;
  if (!apiKey) return [];

  return new Promise(resolve => {
    const encodedQuery = encodeURIComponent(query);
    const options = {
      hostname: 'api.bing.microsoft.com',
      path: `/v7.0/search?q=${encodedQuery}&count=10&responseFilter=Webpages`,
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    };
    https.get(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json  = JSON.parse(data);
          const pages = json.webPages?.value || [];
          const pdfs  = pages
            .filter(p => p.url.toLowerCase().endsWith('.pdf'))
            .map(p => p.url);
          resolve(pdfs);
        } catch { resolve([]); }
      });
    }).on('error', () => resolve([]));
  });
}

// ─── Run claude-extract ────────────────────────────────────────────────────
function runExtract(pdfPath) {
  const apiKey = process.env.ANTHROPIC_API_KEY
    || (fs.existsSync(path.resolve(__dirname, '../../.env'))
         ? fs.readFileSync(path.resolve(__dirname, '../../.env'), 'utf8').match(/ANTHROPIC_API_KEY=(.+)/)?.[1]?.trim()
         : null);

  if (!apiKey) { console.log('  ⚠ No ANTHROPIC_API_KEY — skipping extraction'); return Promise.resolve(); }

  console.log(`  🤖 Extracting: ${path.basename(pdfPath)}`);
  return new Promise(resolve => {
    const child = spawn('node', [EXTRACT_SCRIPT, pdfPath], {
      env: { ...process.env, ANTHROPIC_API_KEY: apiKey },
      stdio: 'inherit',
    });
    child.on('close', resolve);
  });
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const args       = process.argv.slice(2);
  const targetSlug = args.find(a => !a.startsWith('--'));
  const noExtract  = args.includes('--no-extract');

  fs.mkdirSync(INPUT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });

  const registry = loadRegistry();

  console.log(`\n🌐 ToolAdvisor Catalogue Crawler — ${new Date().toLocaleString()}`);
  console.log(`   Known PDF seeds:    ${KNOWN_PDFS.filter(p => !p.skip).length}`);
  console.log(`   Sitemap sources:    ${SITEMAP_SOURCES.length} domains (Walter, ISCAR, Kennametal, Tungaloy, Kyocera)`);
  console.log(`   Bing Search:        ${SEARCH_QUERIES.length} queries ${process.env.BING_API_KEY ? '✅' : '(no BING_API_KEY — skipped)'}`);

  // 1. Start with known seeds
  let allPdfs = KNOWN_PDFS.filter(p => !p.skip);

  // 2. Sitemap discovery — tüm domainleri tara, yeni PDF'leri ekle
  const sitemapPdfs = await discoverFromSitemaps(
    targetSlug,
    allPdfs.map(p => p.url),  // zaten bilinen URL'ler — tekrar indirme
  );
  if (sitemapPdfs.length > 0) {
    console.log(`  → ${sitemapPdfs.length} new catalogue PDF(s) discovered via sitemap`);
    allPdfs = allPdfs.concat(sitemapPdfs);
  }

  // 3. Bing search for additional discovery (if API key available)
  if (process.env.BING_API_KEY) {
    console.log('\n🔎 Searching Bing for new catalogues...');
    for (const { manufacturer, query } of SEARCH_QUERIES) {
      if (targetSlug && manufacturer !== targetSlug) continue;
      const urls = await searchBing(query);
      for (const url of urls) {
        if (!allPdfs.find(p => p.url === url)) {
          allPdfs.push({ manufacturer, name: manufacturer, label: 'Bing discovery', url });
          console.log(`  + Found: ${url}`);
        }
      }
    }
  }

  // 4. Filter by target if specified
  if (targetSlug) {
    allPdfs = allPdfs.filter(p => p.manufacturer === targetSlug);
    if (allPdfs.length === 0) {
      console.error(`No PDFs found for: ${targetSlug}`);
      process.exit(1);
    }
  }

  console.log(`\n📋 ${allPdfs.length} catalogues to check\n`);

  // 4. Check + download each
  const results = { downloaded: [], skipped: [], failed: [] };

  for (const pdf of allPdfs) {
    const filename  = `${pdf.manufacturer}_${sanitizeFilename(path.basename(new URL(pdf.url).pathname))}`;
    const destPath  = path.join(INPUT_DIR, filename);
    const regKey    = pdf.url;

    console.log(`[${pdf.name}] ${pdf.label}`);
    console.log(`  ${pdf.url}`);

    // Check URL accessibility
    const check = await checkUrl(pdf.url);
    if (!check.ok) {
      console.log(`  ❌ Not accessible (HTTP ${check.status})`);
      results.failed.push({ ...pdf, reason: `HTTP ${check.status}` });
      continue;
    }

    // Check if already downloaded and unchanged
    if (fs.existsSync(destPath)) {
      const storedModified = registry.downloaded[regKey]?.lastModified;
      if (storedModified && storedModified === check.lastModified) {
        console.log(`  ⏭  Up to date (${Math.round(check.size/1024)}KB)`);
        results.skipped.push(pdf);
        continue;
      }
    }

    // Download
    try {
      process.stdout.write(`  ⬇  Downloading (${Math.round(check.size/1024/1024 * 10)/10}MB)...`);
      const bytes = await downloadFile(pdf.url, destPath);
      console.log(`  ✅ Saved: ${filename}`);

      registry.downloaded[regKey] = {
        filename,
        localPath: destPath,
        lastModified: check.lastModified,
        downloadedAt: new Date().toISOString(),
        bytes,
      };
      saveRegistry(registry);
      results.downloaded.push({ ...pdf, localPath: destPath });
    } catch (err) {
      console.log(`  ❌ Failed: ${err.message}`);
      results.failed.push({ ...pdf, reason: err.message });
    }

    await sleep(500);
  }

  // 5. Summary
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`✅ Downloaded: ${results.downloaded.length} new/updated`);
  console.log(`⏭  Skipped:    ${results.skipped.length} (unchanged)`);
  console.log(`❌ Failed:     ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed URLs (update or remove from seed list):');
    for (const f of results.failed) {
      console.log(`  [${f.manufacturer}] ${f.label} → ${f.reason}`);
    }
  }

  // 6. Extract new PDFs
  if (!noExtract && results.downloaded.length > 0) {
    console.log(`\n🤖 Starting extraction for ${results.downloaded.length} new PDFs...`);
    for (const pdf of results.downloaded) {
      await runExtract(pdf.localPath);
    }
  }

  // 7. Save run log
  const log = {
    runAt: new Date().toISOString(),
    downloaded: results.downloaded.length,
    skipped: results.skipped.length,
    failed: results.failed.length,
    details: results,
  };
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));

  registry.lastRun = new Date().toISOString();
  saveRegistry(registry);

  console.log(`\n🎉 Done. Log: ${LOG_PATH}`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
