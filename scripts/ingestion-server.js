#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { preparePdfIngestion } = require('./pdf-ingest');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 4177);
const MAX_BODY_BYTES = 120 * 1024 * 1024;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(body));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('PDF upload is too large for the local ingestion server'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(new Error('Invalid JSON request body'));
      }
    });
    req.on('error', reject);
  });
}

function inferType(family, text) {
  const haystack = `${family || ''} ${text || ''}`.toLowerCase();
  if (haystack.includes('ream')) return 'reamer';
  if (haystack.includes('tap')) return 'tap';
  if (haystack.includes('end mill') || haystack.includes('endmill')) return 'endmill';
  if (haystack.includes('insert')) return 'insert';
  if (haystack.includes('drill')) return 'drill';
  return 'tool';
}

function inferMaterials(text) {
  const materials = [];
  const normalized = ` ${text.toUpperCase()} `;
  for (const iso of ['P', 'M', 'K', 'N', 'S', 'H']) {
    if (new RegExp(`\\bISO\\s*${iso}\\b|\\b${iso}\\s*(STEEL|STAINLESS|CAST|NON|SUPER|HARD)`, 'i').test(normalized)) {
      materials.push(iso);
    }
  }
  return materials.length ? materials : ['P', 'M'];
}

function firstNumberAfter(pattern, text) {
  const match = text.match(pattern);
  return match ? Number(match[1]) : null;
}

function buildLocalCandidates({ chunks, manufacturer, family, catalogType, sourceNote }) {
  const seen = new Set();
  const candidates = [];
  const familyLabel = family && family !== 'auto' ? family : 'Auto-detected';
  const designationPattern = /\b[A-Z]{1,6}[A-Z0-9./-]*[-/][A-Z0-9./-]*\d[A-Z0-9./-]*\b|\b\d{2,5}[A-Z]{1,4}[-/][A-Z0-9./-]+\b/g;

  for (const chunk of chunks) {
    const matches = chunk.text.toUpperCase().match(designationPattern) || [];
    const uniqueMatches = [...new Set(matches)]
      .filter((value) => value.length >= 4 && value.length <= 40)
      .slice(0, 8);

    for (const designation of uniqueMatches) {
      const key = `${manufacturer}:${designation}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const diameter = firstNumberAfter(/(?:D1|DIAMETER|DIA|Ø)\s*[:=]?\s*(\d+(?:\.\d+)?)/i, chunk.text);
      const vcMin = firstNumberAfter(/VC\s*[:=]?\s*(\d+(?:\.\d+)?)/i, chunk.text);
      const feedMin = firstNumberAfter(/(?:FEED|FZ|FN)\s*[:=]?\s*(\d+(?:\.\d+)?)/i, chunk.text);
      const type = inferType(familyLabel, chunk.text);
      const confidence = Math.min(78, 42 + (diameter ? 10 : 0) + (vcMin ? 12 : 0) + (feedMin ? 8 : 0) + (family && family !== 'auto' ? 6 : 0));

      candidates.push({
        id: `${manufacturer.replace(/[^A-Za-z0-9]+/g, '_')}_${designation.replace(/[^A-Z0-9]+/g, '_')}_candidate`,
        designation,
        tool_no: null,
        series: null,
        brand: manufacturer,
        product_family: familyLabel,
        type,
        substrate: /CARBIDE/i.test(chunk.text) ? 'carbide' : null,
        iso_grade: null,
        coating: null,
        geometry: null,
        insert_shape: null,
        insert_size: null,
        corner_radius_mm: null,
        diameter_d1_mm: diameter,
        diameter_d2_mm: null,
        oal_l1_mm: firstNumberAfter(/(?:OAL|L1|OVERALL LENGTH)\s*[:=]?\s*(\d+(?:\.\d+)?)/i, chunk.text),
        flute_length_l2_mm: firstNumberAfter(/(?:FLUTE LENGTH|L2)\s*[:=]?\s*(\d+(?:\.\d+)?)/i, chunk.text),
        flutes: firstNumberAfter(/(?:FLUTES|NO\. OF FLUTES)\s*[:=]?\s*(\d+)/i, chunk.text),
        helix_angle: null,
        point_angle: null,
        shank_type: null,
        tolerance_d1: null,
        din_norm: null,
        iso_materials: inferMaterials(chunk.text),
        operations: [type],
        vc_min: vcMin,
        vc_max: vcMin ? vcMin + 30 : null,
        feed_min: feedMin,
        feed_max: feedMin ? Number((feedMin * 1.8).toFixed(3)) : null,
        ap_max_mm: null,
        cutting_data_by_material: [],
        description: `${manufacturer} ${type} candidate from PDF pages ${chunk.startPage}-${chunk.endPage}.`,
        application_notes: [],
        source_tier: 'manufacturer_pdf',
        source_name: `${manufacturer} — ${sourceNote || 'PDF catalogue'}`,
        source_page: `${chunk.startPage}-${chunk.endPage}`,
        validation_status: 'candidate',
        confidence_score: confidence,
        economics_estimated: !(vcMin && feedMin),
        risk_flags: [
          !diameter ? 'missing_dimensions' : null,
          !vcMin ? 'missing_vc' : null,
          !feedMin ? 'missing_feed' : null,
          'manual_review_required',
        ].filter(Boolean),
        last_checked: new Date().toISOString().slice(0, 10),
        catalog_type: catalogType,
      });

      if (candidates.length >= 50) return candidates;
    }
  }

  if (!candidates.length) {
    candidates.push({
      id: `${manufacturer.replace(/[^A-Za-z0-9]+/g, '_')}_chunk_review_candidate`,
      designation: 'Manual review required',
      brand: manufacturer,
      product_family: familyLabel,
      type: inferType(familyLabel, chunks[0]?.text || ''),
      iso_materials: ['P', 'M'],
      operations: [],
      validation_status: 'candidate',
      confidence_score: 30,
      source_tier: 'manufacturer_pdf',
      source_name: `${manufacturer} — ${sourceNote || 'PDF catalogue'}`,
      source_page: chunks[0] ? `${chunks[0].startPage}-${chunks[0].endPage}` : null,
      risk_flags: ['no_designation_pattern_found', 'manual_review_required'],
      economics_estimated: true,
      last_checked: new Date().toISOString().slice(0, 10),
      catalog_type: catalogType,
    });
  }

  return candidates;
}

async function handlePdfIngest(req, res) {
  try {
    const body = await readJsonBody(req);
    if (!body.pdfBase64) throw new Error('Missing PDF data');
    if (!body.manufacturer) throw new Error('Manufacturer is required');

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tooladvisor-ingestion-'));
    const inputPath = path.join(tmpDir, 'upload.pdf');
    fs.writeFileSync(inputPath, Buffer.from(body.pdfBase64, 'base64'));

    const family = body.family || 'auto';
    const catalogType = body.catalogType || 'A';
    const result = await preparePdfIngestion({
      inputPath,
      manufacturer: body.manufacturer,
      catalogType,
      family,
      chunkPages: Number(body.chunkPages || 10),
      overlapPages: Number(body.overlapPages || 1),
      maxProducts: Number(body.maxProducts || 15),
      outDir: path.join(ROOT, 'data/staging/pdf-ingestion'),
      splitPdf: true,
    });

    const candidates = buildLocalCandidates({
      chunks: result.chunks,
      manufacturer: body.manufacturer,
      family,
      catalogType,
      sourceNote: body.sourceNote,
    });

    sendJson(res, 200, {
      ok: true,
      manifest: result.manifest,
      outputDir: result.outDir,
      candidates,
      mode: process.env.ANTHROPIC_API_KEY ? 'local-chunking-ready-for-ai' : 'local-candidate-preview',
    });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const requestedPath = url.pathname === '/' ? '/ingestion.html' : url.pathname;
  const filePath = path.resolve(ROOT, `.${requestedPath}`);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream',
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    });
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/pdf-ingest') {
    handlePdfIngest(req, res);
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res);
    return;
  }

  res.writeHead(405);
  res.end('Method not allowed');
});

server.listen(PORT, () => {
  console.log(`ToolAdvisor ingestion UI: http://localhost:${PORT}`);
});
