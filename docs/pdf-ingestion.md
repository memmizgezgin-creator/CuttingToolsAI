# ToolAdvisor PDF Ingestion

Use this utility when a manufacturer catalog is too large to send to an AI model in one piece.

## Command

For the browser UI:

```bash
npm run ingestion
```

Then open:

```text
http://localhost:4177
```

For CLI-only processing:

```bash
npm run ingest:pdf -- "/path/to/catalog.pdf" --manufacturer "MAFord" --family "Reamers" --chunk-pages 10
```

## What It Creates

The output is written under `data/staging/pdf-ingestion/<run-id>/`.

- `manifest.json` records the source PDF, page count, chunk ranges, and generated files.
- `text/` contains extracted text per chunk.
- `pdf/` contains split PDF files per chunk.
- `claude-prompts.jsonl` contains one ready-to-send extraction prompt per chunk.

## Recommended Settings

- Use `--chunk-pages 8` to `--chunk-pages 12` for dense catalogs with many product tables.
- Use `--overlap-pages 1` so products split across page boundaries are not lost.
- Use `--max-products 15` to keep AI JSON output small and valid.
- Use `--family "Reamers"` or another family hint when the source PDF is focused.

## Review Flow

1. Run the ingestion command.
2. Feed each `claude-prompts.jsonl` line to the extraction model.
3. Save extracted JSON as staged candidates, not directly into `directory-data.js`.
4. Review and approve candidates before merging them into the production product database.
