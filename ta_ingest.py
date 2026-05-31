#!/usr/bin/env python3
"""
ToolAdvisor PDF Ingestion Tool
-------------------------------
PDF page range → PNG images → Claude API → candidate JSON

Usage:
  python ta_ingest.py catalog.pdf 65 70 --brand "Gühring"
  python ta_ingest.py catalog.pdf 65 70 --brand "Gühring" --output candidate_guehring_drills.json

Requirements:
  pip install pymupdf anthropic

Environment:
  export ANTHROPIC_API_KEY=sk-ant-...

Output goes to candidate JSON — NEVER directly to PRODUCT_DB.
"""

import sys
import json
import base64
import argparse
from pathlib import Path
from datetime import datetime

try:
    import fitz  # PyMuPDF
except ImportError:
    print("ERROR: pymupdf not installed. Run: pip install pymupdf")
    sys.exit(1)

try:
    import anthropic
except ImportError:
    print("ERROR: anthropic not installed. Run: pip install anthropic")
    sys.exit(1)


EXTRACTION_PROMPT = """You are extracting cutting tool product data from a manufacturer catalog page.

Extract ALL product variants visible in this page into a JSON array.

For each product row or variant, output an object with these fields (omit fields not visible — never invent data):

{
  "article_no": "string — order/article number",
  "brand": "string — manufacturer name",
  "product_family": "string — series name or number (e.g. '8524', 'Series 270P')",
  "product_type": "string — e.g. 'solid carbide drill', 'carbide reamer', 'turning insert'",
  "operation": "string — one of: drilling, milling, turning, threading, grooving, reaming",
  "description": "string — product name, geometry notes, key features",
  "dimensions": {
    "d1_mm": number,
    "d1_inch": "string — fractional if shown",
    "d2_mm": number,
    "l1_mm": number,
    "l2_mm": number,
    "l5_mm": number,
    "flutes": number
  },
  "iso_groups": ["P","M","K","N","S","H"],
  "geometry_notes": "string — any geometry/coating/tolerance notes",
  "source": {
    "source_tier": "manufacturer_catalogue",
    "validation_status": "candidate",
    "confidence_score": 0.85,
    "economicsEstimated": true,
    "risk_flags": []
  }
}

Return ONLY a valid JSON array. No markdown, no explanation, no code blocks."""


def pdf_pages_to_images(pdf_path: str, start_page: int, end_page: int, dpi: int = 150) -> list:
    """Convert PDF page range to list of PNG bytes. Pages are 1-indexed."""
    doc = fitz.open(pdf_path)
    total = doc.page_count

    start_idx = max(0, start_page - 1)
    end_idx = min(total - 1, end_page - 1)

    if start_idx > end_idx:
        print(f"ERROR: Invalid page range {start_page}-{end_page} (PDF has {total} pages)")
        sys.exit(1)

    images = []
    for i in range(start_idx, end_idx + 1):
        page = doc[i]
        mat = fitz.Matrix(dpi / 72, dpi / 72)
        pix = page.get_pixmap(matrix=mat)
        images.append(pix.tobytes("png"))
        print(f"  Page {i + 1}/{total} converted")

    doc.close()
    return images


def call_claude_single(client, img_bytes: bytes, page_num: int) -> list:
    """Send a single page to Claude, return product list."""
    b64 = base64.standard_b64encode(img_bytes).decode("utf-8")
    content = [
        {
            "type": "image",
            "source": {"type": "base64", "media_type": "image/png", "data": b64}
        },
        {"type": "text", "text": EXTRACTION_PROMPT}
    ]

    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=16000,
        messages=[{"role": "user", "content": content}]
    )

    raw = response.content[0].text.strip()

    # Strip markdown fences
    if raw.startswith("```"):
        raw = "\n".join(raw.split("\n")[1:])
    if raw.endswith("```"):
        raw = raw.rsplit("```", 1)[0].strip()

    # Direct parse
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Recovery: truncated JSON — find last complete object
    print(f"  WARNING page {page_num}: JSON truncated, attempting recovery...")
    try:
        last_close = raw.rfind("},")
        if last_close == -1:
            last_close = raw.rfind("}")
        if last_close > 0:
            recovered = raw[:last_close + 1] + "]"
            first_open = recovered.find("[")
            if first_open >= 0:
                recovered = recovered[first_open:]
            products = json.loads(recovered)
            print(f"  Recovered {len(products)} products from partial response")
            return products
    except json.JSONDecodeError:
        pass

    # Give up on this page, save raw
    err_file = f"ingestion_error_p{page_num}.txt"
    with open(err_file, "w") as f:
        f.write(raw)
    print(f"  SKIP page {page_num} — could not parse. Raw saved to {err_file}")
    return []


def extract_products(images: list, source_name: str, brand: str, start_page: int = 1) -> list:
    """Send pages one-by-one to Claude, return combined product list."""
    client = anthropic.Anthropic()
    all_products = []
    today = datetime.now().strftime("%Y-%m-%d")

    for idx, img_bytes in enumerate(images):
        page_num = start_page + idx
        print(f"  Sending page {page_num} to Claude...")
        products = call_claude_single(client, img_bytes, page_num)

        for p in products:
            if "source" not in p:
                p["source"] = {}
            p["source"]["source_name"] = source_name
            p["source"]["last_checked"] = today
            p["source"]["page"] = page_num
            if brand and not p.get("brand"):
                p["brand"] = brand

        print(f"  Page {page_num}: {len(products)} products")
        all_products.extend(products)

    return all_products


def main():
    parser = argparse.ArgumentParser(
        description="ToolAdvisor PDF Ingestion — extracts product data into candidate JSON"
    )
    parser.add_argument("pdf", help="Path to PDF catalog file")
    parser.add_argument("start", type=int, help="Start page number (1-indexed)")
    parser.add_argument("end", type=int, help="End page number (1-indexed)")
    parser.add_argument("--brand", default="", help="Manufacturer name (e.g. 'Guhring')")
    parser.add_argument("--output", default="", help="Output JSON filename")
    parser.add_argument("--dpi", type=int, default=150, help="Render DPI (default 150)")
    args = parser.parse_args()

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        print(f"ERROR: File not found: {pdf_path}")
        sys.exit(1)

    source_name = pdf_path.stem
    output_path = args.output or f"candidate_{source_name}_p{args.start}-{args.end}.json"

    print(f"\nToolAdvisor PDF Ingestion")
    print(f"  PDF    : {pdf_path.name}")
    print(f"  Pages  : {args.start} - {args.end}")
    print(f"  Brand  : {args.brand or '(auto-detect)'}")
    print(f"  Output : {output_path}")
    print(f"  DPI    : {args.dpi}\n")

    print("Step 1: Converting pages to images...")
    images = pdf_pages_to_images(str(pdf_path), args.start, args.end, args.dpi)
    print(f"  {len(images)} page(s) ready\n")

    print("Step 2: Extracting product data via Claude (1 page per call)...")
    products = extract_products(images, source_name, args.brand, args.start)
    print(f"\n  Total: {len(products)} product variants extracted\n")

    print("Step 3: Writing candidate JSON...")
    output = {
        "meta": {
            "source_pdf": str(pdf_path),
            "pages": f"{args.start}-{args.end}",
            "brand": args.brand,
            "extracted_at": datetime.now().isoformat(),
            "product_count": len(products),
            "status": "candidate",
            "warning": "DO NOT merge to PRODUCT_DB without manual review"
        },
        "products": products
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"  Saved: {output_path}")
    print(f"\nDone. {len(products)} candidates ready for review.\n")


if __name__ == "__main__":
    main()
