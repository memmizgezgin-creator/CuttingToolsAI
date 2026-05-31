#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PDFDocument } = require('pdf-lib');

const DEFAULT_OUT_DIR = 'data/staging/pdf-ingestion';

function usage() {
  console.log(`Usage:
  node scripts/pdf-ingest.js <catalog.pdf> --manufacturer "MAFord" [options]

Options:
  --manufacturer <name>       Manufacturer/source name. Required.
  --catalog-type <type>       type-a or type-b. Default: type-a
  --family <name>             Product family hint. Default: auto
  --chunk-pages <n>           Pages per chunk. Default: 12
  --overlap-pages <n>         Page overlap between chunks. Default: 1
  --max-products <n>          Per-chunk extraction cap for prompts. Default: 15
  --out <dir>                 Output root. Default: ${DEFAULT_OUT_DIR}
  --no-split-pdf              Only write text chunks, not split PDF files
  --help                      Show this help

Example:
  node scripts/pdf-ingest.js ~/Downloads/maford.pdf --manufacturer "MAFord" --family "Reamers" --chunk-pages 10
`);
}

function parseArgs(argv) {
  const args = {
    input: null,
    manufacturer: null,
    catalogType: 'type-a',
    family: 'auto',
    chunkPages: 12,
    overlapPages: 1,
    maxProducts: 15,
    outDir: DEFAULT_OUT_DIR,
    splitPdf: true,
  };

  const nextValue = (items, index, flag) => {
    const value = items[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${flag} requires a value`);
    }
    return value;
  };

  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === '--help' || item === '-h') {
      args.help = true;
    } else if (!item.startsWith('--') && !args.input) {
      args.input = item;
    } else if (item === '--manufacturer') {
      args.manufacturer = nextValue(argv, i, item);
      i += 1;
    } else if (item === '--catalog-type') {
      args.catalogType = nextValue(argv, i, item);
      i += 1;
    } else if (item === '--family') {
      args.family = nextValue(argv, i, item);
      i += 1;
    } else if (item === '--chunk-pages') {
      args.chunkPages = Number.parseInt(nextValue(argv, i, item), 10);
      i += 1;
    } else if (item === '--overlap-pages') {
      args.overlapPages = Number.parseInt(nextValue(argv, i, item), 10);
      i += 1;
    } else if (item === '--max-products') {
      args.maxProducts = Number.parseInt(nextValue(argv, i, item), 10);
      i += 1;
    } else if (item === '--out') {
      args.outDir = nextValue(argv, i, item);
      i += 1;
    } else if (item === '--no-split-pdf') {
      args.splitPdf = false;
    } else {
      throw new Error(`Unknown argument: ${item}`);
    }
  }

  if (args.help) return args;
  if (!args.input) throw new Error('PDF input path is required');
  if (!args.manufacturer) throw new Error('--manufacturer is required');
  if (!Number.isInteger(args.chunkPages) || args.chunkPages < 1) {
    throw new Error('--chunk-pages must be a positive integer');
  }
  if (!Number.isInteger(args.overlapPages) || args.overlapPages < 0) {
    throw new Error('--overlap-pages must be zero or a positive integer');
  }
  if (args.overlapPages >= args.chunkPages) {
    throw new Error('--overlap-pages must be smaller than --chunk-pages');
  }
  if (!Number.isInteger(args.maxProducts) || args.maxProducts < 1) {
    throw new Error('--max-products must be a positive integer');
  }

  return args;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'catalog';
}

function pageTextRenderer(pageData) {
  return pageData.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  }).then((textContent) => {
    let lastY;
    let text = '';

    for (const item of textContent.items) {
      if (lastY === item.transform[5] || !lastY) {
        text += item.str;
      } else {
        text += `\n${item.str}`;
      }
      lastY = item.transform[5];
    }

    return text.trim();
  });
}

async function extractPages(buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
  const standardFontDataUrl = path.join(pdfjsRoot, 'standard_fonts') + path.sep;
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    standardFontDataUrl,
  }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const text = await pageTextRenderer(page);
    pages.push({ pageNumber, text });
  }

  await doc.destroy();
  return pages;
}

function buildChunks(pages, chunkPages, overlapPages) {
  const chunks = [];
  const step = chunkPages - overlapPages;

  for (let startIndex = 0; startIndex < pages.length; startIndex += step) {
    const chunkPagesList = pages.slice(startIndex, startIndex + chunkPages);
    if (!chunkPagesList.length) break;

    const startPage = chunkPagesList[0].pageNumber;
    const endPage = chunkPagesList[chunkPagesList.length - 1].pageNumber;
    const text = chunkPagesList
      .map((page) => `--- PAGE ${page.pageNumber} ---\n${page.text}`)
      .join('\n\n');

    chunks.push({
      index: chunks.length + 1,
      startPage,
      endPage,
      pageCount: chunkPagesList.length,
      text,
    });

    if (endPage === pages.length) break;
  }

  return chunks;
}

async function preparePdfIngestion({
  inputPath,
  manufacturer,
  catalogType = 'type-a',
  family = 'auto',
  chunkPages = 12,
  overlapPages = 1,
  maxProducts = 15,
  outDir = DEFAULT_OUT_DIR,
  splitPdf = true,
}) {
  const args = {
    input: inputPath,
    manufacturer,
    catalogType,
    family,
    chunkPages,
    overlapPages,
    maxProducts,
    outDir,
    splitPdf,
  };

  const resolvedInputPath = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInputPath)) {
    throw new Error(`PDF not found: ${resolvedInputPath}`);
  }

  const inputBuffer = fs.readFileSync(resolvedInputPath);
  const pages = await extractPages(inputBuffer);
  const chunks = buildChunks(pages, args.chunkPages, args.overlapPages);
  const { outDir: resolvedOutDir, runId } = writeOutputs({ args, inputPath: resolvedInputPath, chunks });

  if (args.splitPdf) {
    await writeSplitPdfs(inputBuffer, chunks, resolvedOutDir, slugify(path.basename(resolvedInputPath, path.extname(resolvedInputPath))));
  }

  const manifest = buildManifest({ args, inputPath: resolvedInputPath, pages, chunks, runId });
  fs.writeFileSync(path.join(resolvedOutDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  return {
    outDir: resolvedOutDir,
    manifest,
    chunks,
  };
}

function buildPrompt({ args, sourceFile, chunk }) {
  return [
    'Extract ToolAdvisor cutting-tool product candidates from this catalog chunk.',
    `Manufacturer: ${args.manufacturer}`,
    `Catalog type: ${args.catalogType}`,
    `Product family hint: ${args.family}`,
    `Source file: ${sourceFile}`,
    `Source pages: ${chunk.startPage}-${chunk.endPage}`,
    `Maximum products to return: ${args.maxProducts}`,
    '',
    'Return strict JSON only: an array of product objects matching the ToolAdvisor schema where possible.',
    'Keep free-text fields short. Put uncertain values as null and add trust.risk_flags.',
    'Set trust.source_tier to public_catalog_pdf, validation_status to needs_review, and source_page to the page or page range.',
    '',
    chunk.text,
  ].join('\n');
}

async function writeSplitPdfs(inputBuffer, chunks, outDir, baseName) {
  const sourceDoc = await PDFDocument.load(inputBuffer);
  const pdfDir = path.join(outDir, 'pdf');
  fs.mkdirSync(pdfDir, { recursive: true });

  for (const chunk of chunks) {
    const outputDoc = await PDFDocument.create();
    const pageIndexes = [];
    for (let page = chunk.startPage; page <= chunk.endPage; page += 1) {
      pageIndexes.push(page - 1);
    }
    const copiedPages = await outputDoc.copyPages(sourceDoc, pageIndexes);
    copiedPages.forEach((page) => outputDoc.addPage(page));
    const pdfBytes = await outputDoc.save();
    const fileName = `${baseName}_chunk_${String(chunk.index).padStart(3, '0')}_pages_${chunk.startPage}-${chunk.endPage}.pdf`;
    fs.writeFileSync(path.join(pdfDir, fileName), pdfBytes);
    chunk.pdfFile = path.join('pdf', fileName);
  }
}

function writeOutputs({ args, inputPath, chunks }) {
  const sourceFile = path.basename(inputPath);
  const sourceSlug = slugify(path.basename(inputPath, path.extname(inputPath)));
  const runId = `${new Date().toISOString().slice(0, 10)}-${sourceSlug}-${crypto.randomBytes(3).toString('hex')}`;
  const outDir = path.resolve(args.outDir, runId);
  const textDir = path.join(outDir, 'text');
  fs.mkdirSync(textDir, { recursive: true });

  for (const chunk of chunks) {
    const fileName = `chunk_${String(chunk.index).padStart(3, '0')}_pages_${chunk.startPage}-${chunk.endPage}.txt`;
    fs.writeFileSync(path.join(textDir, fileName), chunk.text, 'utf8');
    chunk.textFile = path.join('text', fileName);
  }

  const prompts = chunks.map((chunk) => ({
    id: `${sourceSlug}-chunk-${String(chunk.index).padStart(3, '0')}`,
    manufacturer: args.manufacturer,
    catalog_type: args.catalogType,
    family_hint: args.family,
    source_file: sourceFile,
    source_pages: `${chunk.startPage}-${chunk.endPage}`,
    max_products: args.maxProducts,
    prompt: buildPrompt({ args, sourceFile, chunk }),
  }));

  fs.writeFileSync(
    path.join(outDir, 'claude-prompts.jsonl'),
    prompts.map((prompt) => JSON.stringify(prompt)).join('\n') + '\n',
    'utf8',
  );

  return { outDir, runId };
}

function buildManifest({ args, inputPath, pages, chunks, runId }) {
  const sourceFile = path.basename(inputPath);

  const manifest = {
    run_id: runId,
    created_at: new Date().toISOString(),
    source_file: sourceFile,
    source_path: path.resolve(inputPath),
    manufacturer: args.manufacturer,
    catalog_type: args.catalogType,
    family_hint: args.family,
    total_pages: pages.length,
    chunk_pages: args.chunkPages,
    overlap_pages: args.overlapPages,
    max_products_per_chunk: args.maxProducts,
    split_pdf: args.splitPdf,
    outputs: {
      prompts_jsonl: 'claude-prompts.jsonl',
      text_dir: 'text',
      pdf_dir: args.splitPdf ? 'pdf' : null,
    },
    chunks: chunks.map((chunk) => ({
      index: chunk.index,
      pages: `${chunk.startPage}-${chunk.endPage}`,
      page_count: chunk.pageCount,
      text_file: chunk.textFile,
      pdf_file: chunk.pdfFile || null,
      text_chars: chunk.text.length,
    })),
  };

  return manifest;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const { outDir, manifest } = await preparePdfIngestion({
    inputPath: args.input,
    manufacturer: args.manufacturer,
    catalogType: args.catalogType,
    family: args.family,
    chunkPages: args.chunkPages,
    overlapPages: args.overlapPages,
    maxProducts: args.maxProducts,
    outDir: args.outDir,
    splitPdf: args.splitPdf,
  });

  console.log(`PDF ingestion prepared: ${outDir}`);
  console.log(`Pages: ${manifest.total_pages}`);
  console.log(`Chunks: ${manifest.chunks.length}`);
  console.log(`Prompt file: ${path.join(outDir, 'claude-prompts.jsonl')}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`pdf-ingest failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  preparePdfIngestion,
};
