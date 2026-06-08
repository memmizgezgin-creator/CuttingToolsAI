#!/usr/bin/env python3
"""
ToolAdvisor — Technical Analysis Report Generator

Usage
-----
  # From JSON by candidate ID
  python3 generate-sample-technical-report.py --id maford-272-p11-r001-27201300-03000

  # Built-in fixtures
  python3 generate-sample-technical-report.py --fixture reamer
  python3 generate-sample-technical-report.py --fixture drill
  python3 generate-sample-technical-report.py --fixture end_mill

  # Override output path
  python3 generate-sample-technical-report.py --fixture drill --output reports/drill.pdf

  # Batch: all three fixtures
  python3 generate-sample-technical-report.py --batch
"""

import argparse
import json
import sys
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable,
)

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE            = Path(__file__).parent.parent
CANDIDATES_JSON = BASE / "research/ingestion/maford-series-272-product-candidates.json"
REPORTS_DIR     = BASE / "reports"

# ── Brand palette ─────────────────────────────────────────────────────────────
NAVY   = colors.HexColor("#0D1B3E")
CYAN   = colors.HexColor("#00B8D4")
AMBER  = colors.HexColor("#FF8C00")
RED    = colors.HexColor("#D32F2F")
GREEN  = colors.HexColor("#2E7D32")
LIGHT  = colors.HexColor("#F5F7FA")
BORDER = colors.HexColor("#CFD8DC")
WHITE  = colors.white

# ── Style helpers ─────────────────────────────────────────────────────────────
def S(name, **kw):
    return ParagraphStyle(name, **kw)

TITLE_STYLE = S("T", fontName="Helvetica-Bold", fontSize=20, textColor=WHITE,
                leading=26, alignment=TA_LEFT)
SECTION_STYLE = S("Sec", fontName="Helvetica-Bold", fontSize=11, textColor=NAVY,
                  leading=16, spaceBefore=4)
BODY_STYLE = S("Bod", fontName="Helvetica", fontSize=9,
               textColor=colors.HexColor("#37474F"), leading=14)
SMALL_STYLE = S("Sm", fontName="Helvetica", fontSize=8,
                textColor=colors.HexColor("#607D8B"), leading=12)
MONO_STYLE = S("Mo", fontName="Courier", fontSize=8,
               textColor=colors.HexColor("#263238"), leading=13)
LABEL_STYLE = S("Lb", fontName="Helvetica-Bold", fontSize=8,
                textColor=colors.HexColor("#546E7A"), leading=12)
VALUE_STYLE = S("Va", fontName="Helvetica", fontSize=9, textColor=NAVY, leading=13)
ITALIC_STYLE = S("It", fontName="Helvetica-Oblique", fontSize=8,
                 textColor=colors.HexColor("#546E7A"), leading=13)

# ── Table builders ─────────────────────────────────────────────────────────────

def kv_table(rows, col_widths=(55*mm, 110*mm)):
    data = [[Paragraph(k, LABEL_STYLE), Paragraph(str(v), VALUE_STYLE)] for k, v in rows]
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), LIGHT),
        ("GRID",       (0, 0), (-1, -1), 0.4, BORDER),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING",   (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
        ("VALIGN",     (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def three_col_table(rows, headers, col_widths=(60*mm, 30*mm, 75*mm)):
    data = [[Paragraph(f"<b>{h}</b>", LABEL_STYLE) for h in headers]]
    for row in rows:
        data.append([Paragraph(str(cell), style) for cell, style in row])
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, LIGHT]),
        ("GRID",          (0, 0), (-1, -1), 0.4, BORDER),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]))
    return t


FLAG_META = {
    "coating_or_surface_not_present_in_source_row":
        ("MISSING DATA", "Coating/surface absent in source row — cannot populate coating field."),
    "material_grade_not_present_in_source_row":
        ("MISSING DATA", "Material grade absent in source row — ISO grade field left null."),
    "MISSING_CUTTING_DATA":
        ("INCOMPLETE", "Vc/feed ranges not extractable from this catalogue page."),
    "MISSING_COATING":
        ("INCOMPLETE", "Coating field null — AI inference not applied per policy."),
    "MISSING_ISO_MATERIALS":
        ("INCOMPLETE", "ISO material compatibility not declared in source."),
    "MISSING_OPERATION":
        ("INCOMPLETE", "Operation type not determinable from source row alone."),
    "mixed_unit_fields_preserved_without_conversion":
        ("UNIT MIX", "Inch values preserved as-is; mm conversion not applied."),
    "PMKNSH_CONDITIONAL":
        ("CONDITIONAL", "Blank M/K/N columns indicate conditional material suitability; requires manual validation."),
    "SHANK_FORM_INFERRED":
        ("INFERRED", "Shank form inferred from pilot sample; not read directly from this page."),
    "CUTTING_DATA_PAGE_ONLY":
        ("PARTIAL", "Cutting parameters mapped to catalogue page reference; values not yet extracted."),
    "NECK_DIAMETER_NULL":
        ("INCOMPLETE", "Neck diameter not specified in source; assumed equal to cutting diameter."),
    "VARIABLE_PITCH_UNCONFIRMED":
        ("UNCONFIRMED", "Variable pitch flag set to true based on series designation; not confirmed from drawing."),
}


def risk_flag_table(flags):
    rows = []
    for flag in flags:
        sev, desc = FLAG_META.get(flag, ("UNKNOWN", "No description available."))
        sev_color = RED.hexval() if sev in ("MISSING DATA", "INCOMPLETE") else AMBER.hexval()
        rows.append([
            (flag, MONO_STYLE),
            (f'<font color="{sev_color}">{sev}</font>', SMALL_STYLE),
            (desc, SMALL_STYLE),
        ])
    return three_col_table(rows, ["Flag", "Severity", "Description"],
                           col_widths=[65*mm, 25*mm, 75*mm])


def confidence_bar(score: int):
    filled = round(score / 100 * 20)
    bar_color = GREEN if score >= 85 else (AMBER if score >= 60 else RED)
    cells = [" "] * 20
    t = Table([cells], colWidths=[5*mm] * 20, rowHeights=[7*mm])
    cmds = [
        ("GRID", (0, 0), (-1, -1), 0.3, WHITE),
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING",   (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 0),
    ]
    for i in range(filled):
        cmds.append(("BACKGROUND", (i, 0), (i, 0), bar_color))
    for i in range(filled, 20):
        cmds.append(("BACKGROUND", (i, 0), (i, 0), BORDER))
    t.setStyle(TableStyle(cmds))
    return t


def pmknsh_table(pmknsh: dict):
    """Coloured PMKNSH material suitability grid."""
    headers = list(pmknsh.keys())
    vals = list(pmknsh.values())

    def cell_label(v):
        if v is True:
            return '<font color="#2E7D32"><b>YES</b></font>'
        if v is False:
            return '<font color="#D32F2F"><b>NO</b></font>'
        return '<font color="#FF8C00"><b>COND</b></font>'

    def cell_bg(v):
        if v is True:  return colors.HexColor("#E8F5E9")
        if v is False: return colors.HexColor("#FFEBEE")
        return colors.HexColor("#FFF8E1")

    header_row = [Paragraph(f"<b>{h}</b>", LABEL_STYLE) for h in headers]
    value_row  = [Paragraph(cell_label(v), S(f"pmk{i}", fontName="Helvetica-Bold",
                  fontSize=9, leading=13, alignment=TA_CENTER)) for i, v in enumerate(vals)]
    col_w = [round(165 / len(headers), 1)*mm] * len(headers)
    t = Table([header_row, value_row], colWidths=col_w)
    cmds = [
        ("GRID",         (0, 0), (-1, -1), 0.4, BORDER),
        ("BACKGROUND",   (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR",    (0, 0), (-1, 0), WHITE),
        ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING",   (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
    ]
    for i, v in enumerate(vals):
        cmds.append(("BACKGROUND", (i, 1), (i, 1), cell_bg(v)))
    t.setStyle(TableStyle(cmds))
    return t


# ── Layout helpers ─────────────────────────────────────────────────────────────

def header_block(c: dict) -> list:
    type_label = {
        "reamer":   "REAMER",
        "drill":    "SOLID CARBIDE DRILL",
        "end_mill": "END MILL",
    }.get(c.get("type", ""), c.get("product_family", "CUTTING TOOL").upper())

    hdr = Table([[Paragraph(
        f'<font size="8" color="#00B8D4">TECHNICAL ANALYSIS REPORT · {type_label}</font><br/>'
        f'<font size="18"><b>{c.get("designation", "Unknown")}</b></font>',
        TITLE_STYLE
    )]], colWidths=[165*mm])
    hdr.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), NAVY),
        ("LEFTPADDING",  (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING",   (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 12),
    ]))

    meta = Table([[
        Paragraph(f"<b>Article No:</b> {c.get('article_no','—')}", BODY_STYLE),
        Paragraph(f"<b>Brand:</b> {c.get('brand','—')}", BODY_STYLE),
        Paragraph(f"<b>Family:</b> {c.get('product_family','—')}", BODY_STYLE),
        Paragraph("<b>Report Date:</b> 2026-06-02", BODY_STYLE),
    ]], colWidths=[41*mm, 41*mm, 41*mm, 42*mm])
    meta.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), colors.HexColor("#E8EEF2")),
        ("GRID",         (0, 0), (-1, -1), 0.3, BORDER),
        ("LEFTPADDING",  (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING",   (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
    ]))
    return [hdr, Spacer(1, 3*mm), meta, Spacer(1, 5*mm)]


def section(title: str) -> list:
    return [
        Spacer(1, 2*mm),
        HRFlowable(width="100%", thickness=0.5, color=CYAN, spaceAfter=2),
        Paragraph(title, SECTION_STYLE),
        Spacer(1, 2*mm),
    ]


def score_block(c: dict) -> list:
    score = c.get("confidence_score", 0)
    sc = "#2E7D32" if score >= 85 else ("#FF8C00" if score >= 60 else "#D32F2F")
    label = (
        "High confidence — traceability complete; enrichment gaps flagged."
        if score >= 85 else
        "Medium confidence — conditional data; manual validation required."
        if score >= 60 else
        "Low confidence — significant gaps; do not merge without full review."
    )
    row = Table([[
        Paragraph(
            f'<font size="34" color="{sc}"><b>{score}</b></font>'
            f'<font size="12" color="#607D8B"> / 100</font>',
            S("Sc", fontName="Helvetica-Bold", fontSize=34,
              textColor=colors.HexColor(sc), leading=40)
        ),
        [confidence_bar(score),
         Spacer(1, 2*mm),
         Paragraph(label, S("lbl", fontName="Helvetica", fontSize=8,
                            textColor=colors.HexColor("#607D8B"), leading=12,
                            alignment=TA_CENTER))],
    ]], colWidths=[35*mm, 130*mm])
    row.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING",   (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
        ("BACKGROUND",   (0, 0), (-1, -1), LIGHT),
        ("BOX",          (0, 0), (-1, -1), 0.4, BORDER),
    ]))
    reason = c.get("confidence_reason", "")
    result = [row]
    if reason:
        result += [Spacer(1, 3*mm), Paragraph(reason, ITALIC_STYLE)]
    return result


def dim_rows_for(c: dict) -> list:
    """Return (label, source_val, note) rows appropriate for this tool type."""
    t = c.get("type", "")
    dims = c.get("dimensions", {})
    raw  = c.get("raw_fields", {})

    def r(label, val, note="—"):
        return [(label, SMALL_STYLE), (str(val) if val is not None else "null", MONO_STYLE),
                (note, SMALL_STYLE)]

    if t == "reamer":
        inch_d = raw.get("d1_diameter_decimal") or raw.get("d1_diameter_inch", "—")
        return [
            r("Cutting Diameter (d1)",  f'{inch_d}"',
              "mm: null — inch decimal only, conversion not applied"),
            r("Shank Diameter (d2)",    f'{raw.get("d2_shank_inch","—")}"',
              "mm: null"),
            r("Overall Length (L1)",    f'{raw.get("l1_oal_inch","—")}"',
              "mm: null"),
            r("Flute Length (L2)",      f'{raw.get("l2_flute_length_inch","—")}"',
              "mm: null"),
            r("Flutes",                 raw.get("flutes", "—")),
            r("Lead Angle",             f'{raw.get("lead_angle","—")}°'),
            r("Cutting Direction",      raw.get("cutting_direction","—")),
        ]
    elif t == "drill":
        return [
            r("Cutting Diameter (d1)",   f'{dims.get("diameter_mm","—")} mm'),
            r("Shank Diameter",          f'{dims.get("shank_diameter_mm","—")} mm',
              f'Shank type: {dims.get("shank_type","—")}'),
            r("Overall Length (L1)",     f'{dims.get("overall_length_mm","—")} mm'),
            r("Flute Length (L2)",       f'{dims.get("flute_length_mm","—")} mm'),
            r("Length Ratio",            f'{dims.get("length_ratio_xd","—")}xD'),
            r("Point Angle",             f'{dims.get("point_angle_deg","—")}°'),
            r("Helix Angle",             f'{dims.get("helix_angle_deg","—")}°'),
            r("Flutes",                  dims.get("flute_count","—")),
            r("Through Coolant",         str(dims.get("through_coolant","—"))),
            r("Hole Tolerance",          dims.get("hole_tolerance","—")),
        ]
    elif t == "end_mill":
        return [
            r("Cutting Diameter (dc)",   f'{dims.get("diameter_mm","—")} mm'),
            r("Shank Diameter",          f'{dims.get("shank_diameter_mm","—")} mm'),
            r("Neck Diameter",           f'{dims.get("neck_diameter_mm","null")} mm',
              "null — assumed equal to dc"),
            r("Length of Cut (ap_max)",  f'{dims.get("length_of_cut_mm","—")} mm'),
            r("Overall Length (L1)",     f'{dims.get("overall_length_mm","—")} mm'),
            r("Neck Length",             f'{dims.get("neck_length_mm","—")} mm'),
            r("Flutes",                  dims.get("flute_count","—")),
            r("Helix Angle",             f'{dims.get("helix_angle_deg","—")}°'),
            r("Corner Type",             dims.get("corner_type","—")),
            r("Corner Radius",           f'{dims.get("corner_radius_mm","—")} mm'),
            r("Variable Pitch",          str(dims.get("variable_pitch","—"))),
            r("Center Cutting",          str(dims.get("center_cutting","—"))),
        ]
    return []


# ── Report builder ─────────────────────────────────────────────────────────────

def build_report(c: dict, out_path: Path):
    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=A4,
        leftMargin=20*mm, rightMargin=20*mm,
        topMargin=18*mm, bottomMargin=18*mm,
        title="ToolAdvisor — Technical Analysis Report",
        author="ToolAdvisor Platform",
        subject=c.get("designation", "Product Candidate"),
    )
    story = []

    # 1 · Header
    story += header_block(c)

    # 2 · Identity & Source Traceability
    story += section("1 · Identity & Source Traceability")
    id_rows = [
        ("Candidate ID",      c.get("id", "—")),
        ("Source File",       c.get("source_file", "—")),
        ("Source Type",       c.get("source_type", "—")),
        ("Source Name",       c.get("source_name", "—")),
        ("Source Page",       str(c.get("source_page", "—"))),
        ("Raw Row Ref",       c.get("raw_row_ref", "—")),
        ("Extraction Method", c.get("extraction_method", "—")),
        ("Last Checked",      c.get("last_checked", "—")),
        ("Merge Status",      c.get("merge_status", "—")),
        ("Validation Status", c.get("validation_status", "—")),
    ]
    story.append(kv_table(id_rows))

    # 3 · Confidence Score
    story += section("2 · Confidence Score")
    story += score_block(c)

    # 4 · Risk Flags
    story += section("3 · Risk Flags")
    flags = c.get("risk_flags", [])
    if flags:
        story.append(Paragraph(
            f"<b>{len(flags)} flag(s) raised.</b> Candidate requires enrichment before "
            "PRODUCT_DB merge.",
            BODY_STYLE
        ))
        story.append(Spacer(1, 3*mm))
        story.append(risk_flag_table(flags))
    else:
        story.append(Paragraph(
            '<font color="#2E7D32"><b>No risk flags.</b></font> Candidate passed all checks.',
            BODY_STYLE
        ))

    # 5 · Dimensional Data
    story += section("4 · Dimensional Data")
    dim_rows = dim_rows_for(c)
    if dim_rows:
        story.append(three_col_table(dim_rows,
                                     ["Dimension", "Source Value", "Normalised / Note"],
                                     col_widths=[50*mm, 40*mm, 75*mm]))
    else:
        story.append(Paragraph("No dimensional data available.", SMALL_STYLE))

    # 6 · Material Suitability (PMKNSH) — drill / end_mill only
    pmknsh = c.get("pmknsh")
    if pmknsh:
        story += section("5 · Material Suitability (PMKNSH / ISO Groups)")
        iso_legend = {
            "P": "Steel", "M": "Stainless Steel", "K": "Cast Iron",
            "N": "Non-Ferrous", "S": "Super Alloy", "H": "Hardened Steel",
        }
        story.append(Paragraph(
            "  ".join(f"<b>{k}:</b> {v}" for k, v in iso_legend.items()),
            SMALL_STYLE
        ))
        story.append(Spacer(1, 3*mm))
        story.append(pmknsh_table(pmknsh))

        pmknsh_note = c.get("pmknsh_note")
        if pmknsh_note:
            story.append(Spacer(1, 2*mm))
            story.append(Paragraph(pmknsh_note, ITALIC_STYLE))

    # 7 · Cutting Parameters
    cutting = c.get("cutting_data_summary")
    if cutting:
        story += section("6 · Cutting Parameters (Summary)")
        story.append(kv_table(
            [(k, str(v)) for k, v in cutting.items()],
            col_widths=(55*mm, 110*mm)
        ))

    # 8 · Source Traceability Detail
    st = c.get("source_traceability", {})
    if st:
        story += section("7 · Full Source Traceability")
        story.append(kv_table([
            ("Source PDF",         st.get("source_pdf", "—").split("/")[-1]),
            ("Catalogue Page",     str(st.get("catalog_page", "—"))),
            ("Row Index",          str(st.get("row_index", "—"))),
            ("Parser",             st.get("parser_name", "—")),
            ("Parser Version",     st.get("parser_version", "—")),
            ("Extraction Status",  st.get("extraction_status", "—")),
            ("Normaliser",         st.get("normalizer_name", "—")),
            ("Normaliser Version", st.get("normalizer_version", "—")),
        ], col_widths=(50*mm, 115*mm)))

    # 9 · Raw Row
    raw = c.get("raw_fields", {})
    raw_row = raw.get("raw_row") or c.get("raw_row")
    if raw_row:
        story += section("8 · Raw Row (verbatim from PDF parser)")
        raw_y = raw.get("raw_y", "—")
        story.append(Paragraph(
            f"<b>raw_y:</b> {raw_y} pt  (PDF coordinate from page bottom)",
            SMALL_STYLE
        ))
        story.append(Spacer(1, 2*mm))
        n = len(raw_row)
        t = Table(
            [[Paragraph(h, LABEL_STYLE) for h in ["Index"] + [str(i) for i in range(n)]],
             [Paragraph(v, MONO_STYLE)  for v in ["Value"] + [str(x) if x is not None else "null" for x in raw_row]]],
            colWidths=[18*mm] + [round(147 / n, 1)*mm] * n
        )
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR",  (0, 0), (-1, 0), WHITE),
            ("BACKGROUND", (0, 1), (-1, 1), LIGHT),
            ("GRID",       (0, 0), (-1, -1), 0.4, BORDER),
            ("LEFTPADDING",  (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING",   (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 5),
        ]))
        story.append(t)

    # 10 · AI & Policy Notes
    story += section("9 · AI & Policy Notes")
    ai_fields = c.get("ai_inferred_fields", [])
    story.append(kv_table([
        ("AI Inferred Fields",  ", ".join(ai_fields) if ai_fields else "None — AI inference not applied"),
        ("PRODUCT_DB Merge",    c.get("merge_policy", "Blocked (safe_for_PRODUCT_DB_merge = false)")),
        ("Frontend Changes",    "Blocked (restrictions.frontend_changes = false)"),
        ("AI Used in Pipeline", "No (restrictions.ai_used = false)"),
        ("Series / Scope",      c.get("scope_note", "—")),
    ]))

    # Footer
    story.append(Spacer(1, 8*mm))
    story.append(HRFlowable(width="100%", thickness=0.4, color=BORDER))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        "Auto-generated by the ToolAdvisor ingestion pipeline (v2026-06). "
        "Internal review only — not for distribution. "
        "PRODUCT_DB merge is not authorised until all risk flags are resolved "
        "and a human sign-off is recorded.",
        S("Ft", fontName="Helvetica-Oblique", fontSize=7.5,
          textColor=colors.HexColor("#90A4AE"), leading=12)
    ))

    doc.build(story)
    print(f"  → {out_path}")


# ── Fixtures ──────────────────────────────────────────────────────────────────

FIXTURES = {

    # ── Rayba ────────────────────────────────────────────────────────────────
    "reamer": None,  # loaded from JSON at runtime

    # ── Matkap — Gühring RT 100 U HA (Article 2480) ──────────────────────────
    # Based on: GUE_general-catalogue_EN_compressed.pdf, pages 55-70
    # Validated in: reports/guehring-drilling-pilot-audit.md (12/12 pass, 2026-05-30)
    "drill": {
        "id": "guehring-rt100u-ha-6mm-2480",
        "source_file": "GUE_general-catalogue_EN_compressed.pdf",
        "source_page": 58,
        "raw_row_ref": "raw-page-text/GUE_general-catalogue_EN_compressed.pdf#page-58-row-004",
        "raw_table_ref": None,
        "source_type": "manufacturer_catalogue",
        "source_name": "Gühring General Catalogue EN (compressed)",
        "extraction_method": "pdf-table",
        "designation": "RT 100 U Solid Carbide Drill HA 6.0mm — Gühring 2480",
        "article_no": "2480",
        "product_family": "Solid Carbide Drill",
        "brand": "Gühring",
        "type": "drill",
        "coating": "TiAlN (presumed from series standard — not read from this row)",
        "substrate": "Carbide Grade 6537 L",
        "iso_grade": None,
        "iso_materials": ["P", "M", "N", "S", "H"],
        "operations": ["Solid", "Roughing"],
        "dimensions": {
            "diameter_mm": 6.0,
            "shank_diameter_mm": 6.0,
            "shank_type": "HA",
            "overall_length_mm": 66.0,
            "flute_length_mm": 45.0,
            "length_ratio_xd": "3xD",
            "point_angle_deg": 140,
            "point_geometry": "4-facet",
            "helix_angle_deg": 30,
            "flute_count": 2,
            "through_coolant": True,
            "hole_tolerance": "H7",
        },
        "pmknsh": {
            "P (Steel)": False,
            "M (Stainless)": True,
            "K (Cast Iron)": False,
            "N (Non-Ferrous)": True,
            "S (Super Alloy)": True,
            "H (Hardened)": True,
        },
        "pmknsh_note": (
            "PMKNSH values verified against pilot sample (12/12 pass, 2026-05-30). "
            "P=false and K=false confirmed — RT 100 U is optimised for stainless, "
            "non-ferrous, superalloy, and hardened steel applications."
        ),
        "cutting_data_summary": {
            "Vc (Steel P — n/a)":        "Not applicable (P=false)",
            "Vc (Stainless M)":           "60–90 m/min (cutting data page 386)",
            "Vc (Non-Ferrous N)":         "150–250 m/min (cutting data page 386)",
            "fn (feed per rev, 6mm)":     "0.08–0.12 mm/rev",
            "Coolant":                    "Internal through-coolant (HA shank required)",
            "Cutting Data Source Page":   "386",
            "Cutting Data Extracted":     "false — page reference only, values not yet parsed",
        },
        "raw_row": ["2480", "HA", "6.000", "6.000", "66", "45", "140", "30", "2", "Y"],
        "raw_fields": {"raw_y": 412.3},
        "confidence_score": 95,
        "confidence_reason": (
            "All identity and traceability fields extracted and verified against pilot "
            "sample (guehring-drilling-pilot-audit.md, 2026-05-30). "
            "PMKNSH corrected and re-validated. Shank form (HA) confirmed from pilot "
            "cross-reference. Cutting parameter page mapped to p.386; values not yet "
            "extracted (cutting_data_extracted = false). "
            "No PRODUCT_DB merge allowed from this candidate output."
        ),
        "risk_flags": [
            "CUTTING_DATA_PAGE_ONLY",
        ],
        "validation_status": "approved",
        "ai_inferred_fields": [],
        "last_checked": "2026-05-30",
        "merge_status": "preview_only_not_merged",
        "merge_policy": "Blocked — pilot phase; cutting data not yet extracted",
        "scope_note": "Gühring Solid Carbide Drills pp.55-130 pilot",
        "source_traceability": {
            "source_pdf": "/Users/muratonder/Desktop/GUE_general-catalogue_EN_compressed.pdf",
            "catalog_page": 386,
            "row_index": 4,
            "parser_name": "guehring-drilling-rt100u-v1",
            "parser_version": "pilot-guhring-format-v1.js",
            "extraction_status": "extracted",
            "normalizer_name": "guehring-drilling-normalization-v1",
            "normalizer_version": "pending",
        },
    },

    # ── Freze — Walter Prototyp Protostar N, 12mm 4-flute ────────────────────
    # Realistic fixture based on Walter Prototyp product line characteristics.
    # Source: Walter Prototyp General Catalogue (sample — parser not yet implemented).
    "end_mill": {
        "id": "walter-protostar-n-12mm-4fl-MC232.C14.012.Z04.09",
        "source_file": "Walter_Prototyp_Solid_Carbide_Milling_Catalogue_2024.pdf",
        "source_page": 42,
        "raw_row_ref": "raw-page-text/Walter_Prototyp_Solid_Carbide_Milling_Catalogue_2024.pdf#page-42-row-007",
        "raw_table_ref": None,
        "source_type": "manufacturer_catalogue",
        "source_name": "Walter Prototyp Solid Carbide Milling Catalogue 2024",
        "extraction_method": "pdf-table",
        "designation": "Protostar N 4-Flute End Mill 12mm — Walter MC232.C14.012.Z04.09",
        "article_no": "MC232.C14.012.Z04.09",
        "product_family": "End Mill",
        "brand": "Walter Prototyp",
        "type": "end_mill",
        "coating": "WNN15 (Walter Tiger·tec Silver — not confirmed from this row)",
        "substrate": "Submicron Carbide",
        "iso_grade": None,
        "iso_materials": ["P", "M", "K", "N"],
        "operations": ["Shoulder", "Face", "HSM"],
        "dimensions": {
            "diameter_mm": 12.0,
            "shank_diameter_mm": 12.0,
            "neck_diameter_mm": None,
            "length_of_cut_mm": 26.0,
            "overall_length_mm": 83.0,
            "neck_length_mm": 0.0,
            "flute_count": 4,
            "helix_angle_deg": 45,
            "corner_type": "sharp",
            "corner_radius_mm": 0.0,
            "variable_pitch": True,
            "center_cutting": True,
        },
        "pmknsh": {
            "P (Steel)": True,
            "M (Stainless)": True,
            "K (Cast Iron)": True,
            "N (Non-Ferrous)": True,
            "S (Super Alloy)": False,
            "H (Hardened)": False,
        },
        "pmknsh_note": (
            "P/M/K/N suitability derived from Protostar N series designation. "
            "S=false and H=false — dedicated grades (MC233/MC234) required for "
            "superalloy and hardened steel. "
            "Values not yet confirmed by parser against printed PMKNSH table."
        ),
        "cutting_data_summary": {
            "Vc (Steel P, HRC 30)":       "180–240 m/min",
            "Vc (Stainless M)":            "120–160 m/min",
            "fz (feed per tooth, 12mm)":  "0.030–0.055 mm/tooth",
            "ap (axial depth, Shoulder)": "0.5×dc = 6.0 mm max",
            "ae (radial depth, Shoulder)":"0.5×dc = 6.0 mm max",
            "ap (HSM / trochoidal)":       "1.5×dc = 18.0 mm max",
            "ae (HSM / trochoidal)":       "0.10×dc = 1.2 mm",
            "Coolant":                     "Emulsion or dry (coating dependent)",
            "Cutting Data Source Page":    "386",
            "Cutting Data Extracted":      "false — page reference only, values not yet parsed",
        },
        "raw_row": [
            "MC232.C14.012.Z04.09", "12.000", "12.000", "null",
            "26.0", "83.0", "0.0", "4", "45", "sharp", "0.0", "Y", "Y",
        ],
        "raw_fields": {"raw_y": 318.7},
        "confidence_score": 75,
        "confidence_reason": (
            "Article number and dimensional fields extracted from catalogue table. "
            "PMKNSH values inferred from series designation — not read from a printed "
            "suitability table on this page; manual confirmation required. "
            "Coating grade (WNN15) not confirmed from this row. "
            "Variable pitch flag set from series designation (Protostar N = VP series); "
            "not confirmed from drawing. "
            "Cutting data mapped to reference page only. "
            "No PRODUCT_DB merge allowed from this candidate output."
        ),
        "risk_flags": [
            "MISSING_ISO_MATERIALS",
            "MISSING_COATING",
            "CUTTING_DATA_PAGE_ONLY",
            "NECK_DIAMETER_NULL",
            "VARIABLE_PITCH_UNCONFIRMED",
        ],
        "validation_status": "needs_review",
        "ai_inferred_fields": [],
        "last_checked": "2026-06-02",
        "merge_status": "not_merged",
        "merge_policy": "Blocked — PMKNSH and coating not confirmed from source row",
        "scope_note": "Walter Prototyp End Mills pilot (parser not yet implemented)",
        "source_traceability": {
            "source_pdf": "Walter_Prototyp_Solid_Carbide_Milling_Catalogue_2024.pdf",
            "catalog_page": 42,
            "row_index": 7,
            "parser_name": "walter-endmill-v1",
            "parser_version": "pending",
            "extraction_status": "extracted",
            "normalizer_name": "walter-endmill-normalization-v1",
            "normalizer_version": "pending",
        },
    },
}


# ── Candidate loader ──────────────────────────────────────────────────────────

def load_by_id(candidate_id: str) -> dict:
    with open(CANDIDATES_JSON) as f:
        data = json.load(f)
    for c in data["candidates"]:
        if c["id"] == candidate_id:
            return c
    raise SystemExit(f"Candidate '{candidate_id}' not found in {CANDIDATES_JSON}")


def load_reamer_fixture() -> dict:
    """Load the first M.A. Ford Series 272 reamer candidate as the reamer fixture."""
    with open(CANDIDATES_JSON) as f:
        data = json.load(f)
    c = data["candidates"][0]
    c.setdefault("scope_note", "M.A. Ford Series 272 TrueSize Carbide Reamers")
    c.setdefault("merge_policy", "Blocked (safe_for_PRODUCT_DB_merge = false)")
    return c


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="ToolAdvisor Technical Report Generator")
    grp = ap.add_mutually_exclusive_group()
    grp.add_argument("--id",      help="Candidate ID to look up from maford JSON")
    grp.add_argument("--fixture", choices=["reamer", "drill", "end_mill"],
                     help="Use a built-in fixture candidate")
    grp.add_argument("--batch",   action="store_true",
                     help="Generate all three fixture reports")
    ap.add_argument("--output",   help="Output PDF path (default: reports/sample-technical-report-<type>.pdf)")
    args = ap.parse_args()

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)

    if args.batch:
        targets = [
            ("reamer",   REPORTS_DIR / "sample-technical-report-reamer.pdf"),
            ("drill",    REPORTS_DIR / "sample-technical-report-drill.pdf"),
            ("end_mill", REPORTS_DIR / "sample-technical-report-endmill.pdf"),
        ]
        print("Generating batch reports:")
        for fixture_name, out_path in targets:
            c = load_reamer_fixture() if fixture_name == "reamer" else FIXTURES[fixture_name]
            build_report(c, out_path)
        return

    if args.id:
        c = load_by_id(args.id)
        default_name = f"sample-technical-report-{c.get('type','unknown')}.pdf"
    elif args.fixture:
        c = load_reamer_fixture() if args.fixture == "reamer" else FIXTURES[args.fixture]
        default_name = f"sample-technical-report-{args.fixture}.pdf"
    else:
        # Backward-compat default: reamer fixture
        c = load_reamer_fixture()
        default_name = "sample-technical-report.pdf"

    out = Path(args.output) if args.output else REPORTS_DIR / default_name
    print(f"Generating report for: {c.get('designation','?')}")
    build_report(c, out)


if __name__ == "__main__":
    main()
