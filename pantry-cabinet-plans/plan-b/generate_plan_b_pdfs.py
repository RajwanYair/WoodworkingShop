#!/usr/bin/env python3
"""Generate Plan B detailed PDF plans for Large and Small pantry cabinets.

Plan B: Depth reduced 600 → 404 mm, low-cost melamine chipboard,
        4 sheets of 17 mm instead of 5, storage-room use.
Each cabinet gets its own PDF in both English and Hebrew (4 PDFs total).
"""

import os
import sys

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm, cm
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import (
    Drawing, Rect, Line, String, Circle, Group, Polygon,
)
from reportlab.graphics import renderPDF

try:
    from bidi.algorithm import get_display
    HAS_BIDI = True
except ImportError:
    HAS_BIDI = False

# ── Paths ──────────────────────────────────────────────────────────────────
FONTS_DIR = os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts")
OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ── Register fonts ─────────────────────────────────────────────────────────
pdfmetrics.registerFont(TTFont("Arial", os.path.join(FONTS_DIR, "arial.ttf")))
pdfmetrics.registerFont(TTFont("ArialBd", os.path.join(FONTS_DIR, "arialbd.ttf")))
pdfmetrics.registerFont(TTFont("David", os.path.join(FONTS_DIR, "david.ttf")))
pdfmetrics.registerFont(TTFont("DavidBd", os.path.join(FONTS_DIR, "davidbd.ttf")))


# ── Hebrew helper ──────────────────────────────────────────────────────────
def heb(text):
    """Return visual-order Hebrew string for reportlab."""
    if HAS_BIDI:
        return get_display(text)
    return text[::-1]  # crude fallback


# ═══════════════════════════════════════════════════════════════════════════
#  DATA  — Plan B (depth 404 mm, chipboard)
# ═══════════════════════════════════════════════════════════════════════════

DEPTH = 404
SHELF_DEPTH = DEPTH - 20  # 384

LARGE = {
    "ext": (2000, 1000, DEPTH),
    "int_w": 966, "int_h": 1966, "int_d": DEPTH,
    "parts": [
        # (ID, name_en, name_he, qty, mat_en, mat_he, thick, length, width, edge_en, edge_he)
        ("L-01", "Side panel",      "לוח צד",        2, "Chipboard","שבבית מלמין", 17, 2000, 404,
         "None (storage)",  "ללא (מחסן)"),
        ("L-02", "Top panel",       "לוח עליון",      1, "Chipboard","שבבית מלמין", 17,  966, 404,
         "None (storage)",  "ללא (מחסן)"),
        ("L-03", "Bottom panel",    "לוח תחתון",      1, "Chipboard","שבבית מלמין", 17,  966, 404,
         "None (storage)",  "ללא (מחסן)"),
        ("L-04", "Fixed shelf",     "מדף קבוע",       1, "Chipboard","שבבית מלמין", 17,  966, 384,
         "None (storage)",  "ללא (מחסן)"),
        ("L-05", "Adjustable shelf","מדף מתכוונן",    4, "Chipboard","שבבית מלמין", 17,  964, 384,
         "None (storage)",  "ללא (מחסן)"),
        ("L-06", "Door",            "דלת",            2, "Chipboard","שבבית מלמין", 17, 1994, 496,
         "Optional 4 edges","אופציונלי 4 צדדים"),
        ("L-07", "Back panel",      "לוח גב",         1, "MDF",      "MDF",         4, 1980, 980,
         "None",            "ללא"),
    ],
    "hinges_total": 8, "hinges_per_door": 4,
    "hinge_positions": [100, 698, 1296, 1894],
    "shelf_pins": 16,
    "struct_screws": 36,
    "hw_screws": 40,
    "handles": 2,
    "door_h": 1994, "door_w": 496,
}

SMALL = {
    "ext": (480, 780, DEPTH),
    "int_w": 746, "int_h": 446, "int_d": DEPTH,
    "parts": [
        ("S-01", "Side panel",   "לוח צד",      2, "Chipboard","שבבית מלמין", 17,  480, 404,
         "None (storage)",  "ללא (מחסן)"),
        ("S-02", "Top panel",    "לוח עליון",    1, "Chipboard","שבבית מלמין", 17,  746, 404,
         "None (storage)",  "ללא (מחסן)"),
        ("S-03", "Bottom panel", "לוח תחתון",    1, "Chipboard","שבבית מלמין", 17,  746, 404,
         "None (storage)",  "ללא (מחסן)"),
        ("S-04", "Fixed shelf",  "מדף קבוע",     1, "Chipboard","שבבית מלמין", 17,  745, 384,
         "None (storage)",  "ללא (מחסן)"),
        ("S-05", "Door",         "דלת",          2, "Chipboard","שבבית מלמין", 17,  474, 386,
         "Optional 4 edges","אופציונלי 4 צדדים"),
        ("S-06", "Back panel",   "לוח גב",       1, "MDF",      "MDF",         4,  456, 760,
         "None",            "ללא"),
    ],
    "hinges_total": 4, "hinges_per_door": 2,
    "hinge_positions": [80, 394],
    "shelf_pins": 4,
    "struct_screws": 30,
    "hw_screws": 20,
    "handles": 2,
    "door_h": 474, "door_w": 386,
}


# ═══════════════════════════════════════════════════════════════════════════
#  DRAWING HELPERS
# ═══════════════════════════════════════════════════════════════════════════

C_PANEL   = colors.Color(0.886, 0.906, 0.925)
C_SHELF   = colors.Color(0.796, 0.835, 0.859)
C_DOOR    = colors.Color(0.996, 0.886, 0.886)
C_BACK    = colors.Color(0.996, 0.953, 0.780)
C_HINGE   = colors.Color(0.863, 0.149, 0.149)
C_OUTLINE = colors.Color(0.059, 0.090, 0.165)
C_DIM     = colors.Color(0.278, 0.333, 0.412)
C_HIDDEN  = colors.Color(0.392, 0.459, 0.525)


def _dim_line(d, x1, y1, x2, y2, label, offset=12, font_size=7, horiz=True):
    """Draw a dimension line with ticks and centered label."""
    d.add(Line(x1, y1, x2, y2, strokeColor=C_DIM, strokeWidth=0.7))
    tick = 4
    if horiz:
        d.add(Line(x1, y1 - tick, x1, y1 + tick, strokeColor=C_DIM, strokeWidth=0.7))
        d.add(Line(x2, y2 - tick, x2, y2 + tick, strokeColor=C_DIM, strokeWidth=0.7))
        d.add(String((x1 + x2) / 2, y1 - offset, str(label),
                      fontSize=font_size, fillColor=C_DIM,
                      fontName="Arial", textAnchor="middle"))
    else:
        d.add(Line(x1 - tick, y1, x1 + tick, y1, strokeColor=C_DIM, strokeWidth=0.7))
        d.add(Line(x2 - tick, y2, x2 + tick, y2, strokeColor=C_DIM, strokeWidth=0.7))
        d.add(String(x1 - offset, (y1 + y2) / 2, str(label),
                      fontSize=font_size, fillColor=C_DIM,
                      fontName="Arial", textAnchor="middle"))


# ── Individual view drawings ──────────────────────────────────────────────

def draw_front_closed(cab, scale):
    """Front elevation with doors closed."""
    H, W, D = cab["ext"]
    w = W * scale;  h = H * scale
    dw = 420;  dh = h + 60
    d = Drawing(dw, dh)
    ox, oy = 40, 30

    d.add(Rect(ox, oy, w, h,
               fillColor=colors.Color(0.973, 0.980, 0.988),
               strokeColor=C_OUTLINE, strokeWidth=1.5))
    gap = 3 * scale
    dw_px = cab["door_w"] * scale
    d.add(Rect(ox + gap, oy + gap, dw_px, h - 2 * gap,
               fillColor=C_DOOR,
               strokeColor=colors.Color(0.6, 0.11, 0.11), strokeWidth=1))
    d.add(Rect(ox + w - gap - dw_px, oy + gap, dw_px, h - 2 * gap,
               fillColor=C_DOOR,
               strokeColor=colors.Color(0.6, 0.11, 0.11), strokeWidth=1))
    for hp in cab["hinge_positions"]:
        yh = oy + hp * scale
        d.add(Circle(ox + gap + 4, yh, 2,
                     fillColor=C_HINGE, strokeColor=C_HINGE, strokeWidth=0))
        d.add(Circle(ox + w - gap - 4, yh, 2,
                     fillColor=C_HINGE, strokeColor=C_HINGE, strokeWidth=0))
    _dim_line(d, ox, oy - 14, ox + w, oy - 14, W, offset=10, horiz=True)
    _dim_line(d, ox - 14, oy, ox - 14, oy + h, H, offset=14, horiz=False)
    return d


def draw_front_open(cab, scale):
    """Front elevation with doors removed showing interior."""
    H, W, D = cab["ext"]
    w = W * scale;  h = H * scale
    p = 17 * scale
    dw = 420;  dh = h + 60
    d = Drawing(dw, dh)
    ox, oy = 40, 30

    d.add(Rect(ox, oy, w, h,
               fillColor=colors.Color(0.973, 0.980, 0.988),
               strokeColor=C_OUTLINE, strokeWidth=1.5))
    d.add(Rect(ox, oy, p, h, fillColor=C_PANEL, strokeColor=C_OUTLINE, strokeWidth=1))
    d.add(Rect(ox + w - p, oy, p, h, fillColor=C_PANEL, strokeColor=C_OUTLINE, strokeWidth=1))
    d.add(Rect(ox + p, oy + h - p, w - 2 * p, p,
               fillColor=C_PANEL, strokeColor=C_OUTLINE, strokeWidth=1))
    d.add(Rect(ox + p, oy, w - 2 * p, p,
               fillColor=C_PANEL, strokeColor=C_OUTLINE, strokeWidth=1))
    mid = h / 2
    d.add(Rect(ox + p, oy + mid - p / 2, w - 2 * p, p,
               fillColor=C_SHELF, strokeColor=C_OUTLINE, strokeWidth=0.8))
    if "L-05" in [pt[0] for pt in cab["parts"]]:
        for frac in [0.2, 0.35, 0.65, 0.8]:
            yy = oy + h * frac
            d.add(Line(ox + p, yy, ox + w - p, yy,
                       strokeColor=C_HIDDEN, strokeWidth=0.8,
                       strokeDashArray=[4, 3]))
    _dim_line(d, ox + p, oy - 14, ox + w - p, oy - 14,
              cab["int_w"], offset=10, horiz=True)
    return d


def draw_side_elevation(cab, scale):
    """Side elevation."""
    H, W, D = cab["ext"]
    h = H * scale;  depth = D * scale
    p = 17 * scale
    dw = 320;  dh = h + 60
    d = Drawing(dw, dh)
    ox, oy = 40, 30

    d.add(Rect(ox, oy, depth, h,
               fillColor=C_PANEL, strokeColor=C_OUTLINE, strokeWidth=1.5))
    d.add(Line(ox + 4, oy + p, ox + depth - 4, oy + p,
               strokeColor=C_HIDDEN, strokeWidth=0.6, strokeDashArray=[4, 3]))
    d.add(Line(ox + 4, oy + h - p, ox + depth - 4, oy + h - p,
               strokeColor=C_HIDDEN, strokeWidth=0.6, strokeDashArray=[4, 3]))
    mid = h / 2
    d.add(Line(ox + 4, oy + mid, ox + depth - 4, oy + mid,
               strokeColor=C_HIDDEN, strokeWidth=0.6, strokeDashArray=[4, 3]))
    d.add(Rect(ox + depth - 1, oy + 2, 1, h - 4,
               fillColor=C_BACK,
               strokeColor=colors.Color(0.573, 0.251, 0.055), strokeWidth=0.5))
    _dim_line(d, ox, oy - 14, ox + depth, oy - 14, D, offset=10, horiz=True)
    _dim_line(d, ox - 14, oy, ox - 14, oy + h, H, offset=14, horiz=False)
    return d


def draw_top_view(cab, scale):
    """Top plan view."""
    H, W, D = cab["ext"]
    w = W * scale;  depth = D * scale
    p = 17 * scale
    dw = 420;  dh = depth + 60
    d = Drawing(dw, dh)
    ox, oy = 40, 20

    d.add(Rect(ox, oy, w, depth,
               fillColor=colors.Color(0.973, 0.980, 0.988),
               strokeColor=C_OUTLINE, strokeWidth=1.5))
    d.add(Rect(ox, oy, p, depth, fillColor=C_PANEL, strokeColor=C_OUTLINE, strokeWidth=1))
    d.add(Rect(ox + w - p, oy, p, depth, fillColor=C_PANEL, strokeColor=C_OUTLINE, strokeWidth=1))
    d.add(Rect(ox + p, oy, w - 2 * p, depth,
               fillColor=C_SHELF, strokeColor=C_OUTLINE,
               strokeWidth=0.5, fillOpacity=0.2))
    d.add(Line(ox, oy + depth - 1, ox + w, oy + depth - 1,
               strokeColor=C_BACK, strokeWidth=1))
    _dim_line(d, ox, oy - 10, ox + w, oy - 10, W, offset=9, horiz=True)
    _dim_line(d, ox + w + 10, oy, ox + w + 10, oy + depth, D,
              offset=-16, horiz=False)
    return d


def draw_back_elevation(cab, scale):
    """Back elevation showing back panel."""
    H, W, D = cab["ext"]
    w = W * scale;  h = H * scale
    dw = 420;  dh = h + 60
    d = Drawing(dw, dh)
    ox, oy = 40, 30

    d.add(Rect(ox, oy, w, h,
               fillColor=colors.Color(0.973, 0.980, 0.988),
               strokeColor=C_OUTLINE, strokeWidth=1.5))
    inset = 10 * scale * 2.5
    d.add(Rect(ox + inset / 2, oy + inset / 2, w - inset, h - inset,
               fillColor=C_BACK,
               strokeColor=colors.Color(0.573, 0.251, 0.055), strokeWidth=1))
    for pt in cab["parts"]:
        if "Back" in pt[1] or "גב" in pt[2]:
            bp_h, bp_w = pt[7], pt[8]
            d.add(String(ox + w / 2, oy + h / 2,
                         f"{bp_h} × {bp_w} × {pt[6]}",
                         fontSize=7, fillColor=C_DIM,
                         fontName="Arial", textAnchor="middle"))
            break
    _dim_line(d, ox, oy - 14, ox + w, oy - 14, W, offset=10, horiz=True)
    return d


def draw_3d_isometric(cab, scale):
    """Simple pseudo-isometric view."""
    H, W, D = cab["ext"]
    fw = W * scale;  fh = H * scale
    dx = D * scale * 0.4;  dy = D * scale * 0.25
    p = 17 * scale

    total_w = fw + dx + 80
    total_h = fh + dy + 80
    d = Drawing(total_w, total_h)
    ox, oy = 40, 20

    d.add(Rect(ox, oy, fw, fh,
               fillColor=C_PANEL, strokeColor=C_OUTLINE, strokeWidth=1.5))
    d.add(Polygon(
        [ox, oy + fh, ox + dx, oy + fh + dy,
         ox + fw + dx, oy + fh + dy, ox + fw, oy + fh],
        fillColor=colors.Color(0.945, 0.961, 0.976),
        strokeColor=C_OUTLINE, strokeWidth=1.5))
    d.add(Polygon(
        [ox + fw, oy, ox + fw + dx, oy + dy,
         ox + fw + dx, oy + fh + dy, ox + fw, oy + fh],
        fillColor=colors.Color(0.796, 0.835, 0.859),
        strokeColor=C_OUTLINE, strokeWidth=1.5))

    dw_px = cab["door_w"] * scale
    d.add(Rect(ox + 2, oy + 2, dw_px, fh - 4,
               fillColor=C_DOOR,
               strokeColor=colors.Color(0.6, 0.11, 0.11),
               strokeWidth=0.8, fillOpacity=0.4))

    mid = fh / 2
    d.add(Line(ox + fw, oy + mid, ox + fw + dx, oy + mid + dy,
               strokeColor=C_OUTLINE, strokeWidth=0.8))
    d.add(Line(ox + p, oy + mid, ox + fw - p, oy + mid,
               strokeColor=C_HIDDEN, strokeWidth=0.8, strokeDashArray=[4, 3]))

    _dim_line(d, ox - 14, oy, ox - 14, oy + fh, H, offset=14, horiz=False)
    _dim_line(d, ox, oy - 14, ox + fw, oy - 14, W, offset=10, horiz=True)
    d.add(String(ox + fw + dx / 2 + 6, oy + fh + dy / 2 + 8, str(D),
                 fontSize=7, fillColor=C_DIM,
                 fontName="Arial", textAnchor="middle"))
    return d


# ── Cut-plan sheet drawing ────────────────────────────────────────────────

def draw_cut_sheet(parts_on_sheet, sheet_w, sheet_h, scale, sheet_num, yield_pct):
    """Draw one sheet with parts arranged (visual cut plan)."""
    sw = sheet_w * scale;  sh = sheet_h * scale
    dw = sw + 80;  dh = sh + 60
    d = Drawing(dw, dh)
    ox, oy = 40, 30

    d.add(Rect(ox, oy, sw, sh,
               fillColor=colors.Color(0.945, 0.961, 0.976),
               strokeColor=C_OUTLINE, strokeWidth=1.5))
    d.add(String(ox, oy + sh + 14,
                 f"Sheet {sheet_num}  ({yield_pct}%)",
                 fontSize=9, fillColor=colors.black,
                 fontName="ArialBd", textAnchor="start"))

    for (x, y, pw, ph, label, is_large) in parts_on_sheet:
        px = ox + x * scale;  py = oy + y * scale
        ppw = pw * scale;  pph = ph * scale
        c = (colors.Color(0.859, 0.918, 0.996) if is_large
             else colors.Color(0.863, 0.988, 0.906))
        d.add(Rect(px, py, ppw, pph, fillColor=c,
                   strokeColor=C_OUTLINE, strokeWidth=0.8))
        d.add(String(px + ppw / 2, py + pph / 2 + 4, label,
                     fontSize=6, fillColor=C_OUTLINE,
                     fontName="ArialBd", textAnchor="middle"))
        d.add(String(px + ppw / 2, py + pph / 2 - 5,
                     f"{pw}×{ph}",
                     fontSize=5, fillColor=C_DIM,
                     fontName="Arial", textAnchor="middle"))
    return d


# ═══════════════════════════════════════════════════════════════════════════
#  CUT PLAN SHEET LAYOUTS — Plan B (4 sheets of 17 mm)
# ═══════════════════════════════════════════════════════════════════════════

# Sheet 1: 3 strips of 404  (404+4+404+4+404 = 1220)
# Strip 1: L-01(2000×404)
# Strip 2: L-01(2000×404)
# Strip 3: L-02(966×404) + L-03(966×404) + S-01(480×404) = 2420
SHEET1_YIELD = 88.3
SHEET1_PARTS = [
    #  x,    y,    pw,   ph,  label,  is_large
    (0,    0,    2000, 404, "L-01", True),
    (0,    408,  2000, 404, "L-01", True),
    (0,    816,  966,  404, "L-02", True),
    (970,  816,  966,  404, "L-03", True),
    (1940, 816,  480,  404, "S-01", False),
]

# Sheet 2: 2 strips of 496  (496+4+496 = 996, 224 waste)
SHEET2_YIELD = 66.4
SHEET2_PARTS = [
    (0, 0,   1994, 496, "L-06", True),
    (0, 500, 1994, 496, "L-06", True),
]

# Sheet 3: 404+4+404+4+384 = 1200 (20 waste)
# Strip 1 (404): S-01(480) + S-02(746) + S-03(746) = 1980
# Strip 2 (404): L-05(964) + S-04(745) = 1713
# Strip 3 (384): L-04(966) + L-05(964) = 1934
SHEET3_YIELD = 74.5
SHEET3_PARTS = [
    (0,    0,    480,  404, "S-01", False),
    (484,  0,    746,  404, "S-02", False),
    (1234, 0,    746,  404, "S-03", False),
    (0,    408,  964,  404, "L-05", True),
    (968,  408,  745,  404, "S-04", False),
    (0,    816,  966,  384, "L-04", True),
    (970,  816,  964,  384, "L-05", True),
]

# Sheet 4: 384+4+384+4+386 = 1162 (58 waste)
# Strip 1 (384): L-05(964) + L-05(964) = 1932
# Strip 2 (386): S-05(474) + S-05(474) = 952
SHEET4_YIELD = 34.6
SHEET4_PARTS = [
    (0,   0,   964, 384, "L-05", True),
    (968, 0,   964, 384, "L-05", True),
    (0,   388, 474, 386, "S-05", False),
    (478, 388, 474, 386, "S-05", False),
]

SHEETS_17MM = [
    (SHEET1_YIELD, SHEET1_PARTS),
    (SHEET2_YIELD, SHEET2_PARTS),
    (SHEET3_YIELD, SHEET3_PARTS),
    (SHEET4_YIELD, SHEET4_PARTS),
]

# 4 mm backer — 1 sheet (unchanged)
SHEET_4MM = [
    (76.9, [
        (0,    0, 1980, 980, "L-07", True),
        (1984, 0, 456,  760, "S-06", False),
    ]),
]


# ═══════════════════════════════════════════════════════════════════════════
#  TEXT CONTENT  (per cabinet × language)
# ═══════════════════════════════════════════════════════════════════════════

def get_texts(lang, cab_key):
    is_he = lang == "he"
    is_large = cab_key == "large"
    cab = LARGE if is_large else SMALL
    H, W, D = cab["ext"]

    if is_large:
        name_en = "Large Pantry Cabinet — Plan B"
        name_he = "ארון מזווה גדול — תוכנית ב'"
        size_str = f"2000 × 1000 × {D}"
    else:
        name_en = "Small Pantry Cabinet — Plan B"
        name_he = "ארון מזווה קטן — תוכנית ב'"
        size_str = f"480 × 780 × {D}"

    title = name_he if is_he else name_en

    # ── Assumptions ──
    if is_he:
        assumptions = [
            "בדוק ישרות קיר עם פלס 2 מטר. שמן מאחורי הארון אם יש סטייה מעל 3 מ\"מ.",
            "בדוק פלס רצפה לכל רוחב הארון. השתמש ברגליות מתכווננות.",
            "שתי האלכסונים של הגוף חייבים להיות שווים בסטייה של עד 2 מ\"מ לפני חיבור הגב.",
            ("הארון הגדול חייב להיות מעוגן לקיר עם לפחות 2 זוויתניות L כבדות."
             if is_large else
             "אם הארון תלוי על הקיר — עגן היטב לקיר עם זוויתניות."),
            ("כל מדף מתכוונן מתאים לעומס של עד 25 ק\"ג."
             if is_large else
             "ודא שהמשטח התומך מתחת יכול לשאת את משקל הארון."),
            "מד את עובי השבבית בפועל — ייתכן סטייה של ±0.5 מ\"מ.",
            "שבבית נוטה להיסדק — חובה לקדוח חורי פיילוט 3 מ\"מ לפני כל בורג!",
            "מיקום: חדר מחסן — אין צורך בקנטים (אלא אם רוצים בדלתות).",
        ]
    else:
        assumptions = [
            "Check wall flatness with a 2 m straightedge. Shim if bow > 3 mm.",
            "Verify floor level across the full footprint. Use adjustable feet.",
            "Both diagonals must be equal within 2 mm before fixing back panel.",
            ("Tall cabinet MUST be wall-secured with heavy-duty L-brackets."
             if is_large else
             "If wall-mounted, use heavy-duty L-brackets into studs."),
            ("Each adjustable shelf rated for ≤ 25 kg."
             if is_large else
             "Ensure the support below can bear the cabinet weight."),
            "Measure actual chipboard thickness — may vary ±0.5 mm.",
            "Chipboard splits easily — always pre-drill 3 mm pilot holes before screwing!",
            "Location: storage room — edge banding optional (doors only if desired).",
        ]

    # ── Hinge boring ──
    if is_he:
        hinge_notes = [
            "קוטר כוס: 35 מ\"מ (מקדח פורסטנר)",
            "עומק כוס: 12–13 מ\"מ בתוך לוח 17 מ\"מ",
            "מרכז כוס מקצה הדלת: 22.5 מ\"מ",
            f"מיקומי צירים (מ\"מ מראש הדלת): {', '.join(str(x) for x in cab['hinge_positions'])}",
            "חורי הרכבה לפלטה: קדח 3 מ\"מ × 10 מ\"מ בפנים לוח הצד",
        ]
        if is_large:
            hinge_notes.append("עמודות פיני מדף: קוטר 5 מ\"מ, עומק 10 מ\"מ, מרווח 32 מ\"מ")
            hinge_notes.append("37 מ\"מ מקצה קדמי ומקצה אחורי")
    else:
        hinge_notes = [
            "Cup diameter: 35 mm (Forstner bit)",
            "Cup depth: 12–13 mm into 17 mm panel",
            "Cup center from hinge-side door edge: 22.5 mm",
            f"Hinge positions (mm from top of door): {', '.join(str(x) for x in cab['hinge_positions'])}",
            "Mounting plate: pre-drill 3 mm × 10 mm into side panel inner face",
        ]
        if is_large:
            hinge_notes.append("Shelf pin columns: 5 mm dia, 10 mm deep, 32 mm spacing")
            hinge_notes.append("37 mm from front edge and back rabbet edge")

    # ── Assembly ──
    if is_he:
        assembly = [
            "חתוך את כל החלקים לפי רשימת החיתוך.",
            "סמן קווי מיקום על הפנים הפנימי של לוחות הצד: עליון/תחתון ומדף קבוע.",
            "קדח חורי פיילוט 3 מ\"מ דרך הפנים החיצוני של לוחות הצד.",
        ]
        if is_large:
            assembly.append("קדח עמודות פיני מדף על שני לוחות הצד (מערכת 32 מ\"מ).")
        assembly += [
            "הרכב צד ראשון שטוח, העמד את העליון/תחתון/מדף קבוע — הברג.",
            "הפוך וחבר את הצד השני. הדק בזמן הברגה.",
            "בדוק ריבוע (אלכסונים שווים).",
            "חבר את לוח הגב עם ברגי 3.5×16 מ\"מ כל 150 מ\"מ.",
            "קדח כוסות צירים בדלתות. הרכב פלטות צירים על לוחות הצד.",
            "תלה דלתות וכוונן — 3 מ\"מ מרווח חיצוני, 2 מ\"מ מרווח מרכזי.",
            "התקן ידיות.",
            "עגן את הארון לקיר.",
        ]
    else:
        assembly = [
            "Rip & crosscut all parts to final dimensions.",
            "Mark layout lines on inner faces of side panels: top/bottom and fixed shelf positions.",
            "Pre-drill pilot holes (3 mm) through outer face of side panels.",
        ]
        if is_large:
            assembly.append("Drill shelf-pin columns on both side panels (32 mm system).")
        assembly += [
            "Dry-fit one side flat, stand top/bottom/shelf on edge — drive screws.",
            "Flip and attach second side. Clamp while driving screws.",
            "Check square (diagonals must match within 2 mm).",
            "Attach back panel with 3.5 × 16 mm screws at 150 mm spacing.",
            "Bore hinge cups in doors. Mount hinge plates to side panels.",
            "Hang doors. Adjust for 3 mm outer reveal, 2 mm center gap.",
            "Install handles.",
            "Secure cabinet to wall with L-brackets.",
        ]

    # ── Shopping list ──
    if is_he:
        shopping_sheets = [
            ("שבבית מלמין 17 מ\"מ (זולה)", "2440 × 1220", "4 גיליונות (משותף)"),
            ("גב MDF 4 מ\"מ", "2440 × 1220", "1 (משותף)"),
        ]
        shopping_hw = [
            ("ציר נסתר 110° סגירה שקטה", str(cab["hinges_total"])),
            ("פלטת ציר", str(cab["hinges_total"])),
            ("פין מדף 5 מ\"מ", str(cab["shelf_pins"])),
            ("ברגי מבנה 4.0×50 מ\"מ", str(cab["struct_screws"] + 20)),
            ("ברגי חומרה 3.5×16 מ\"מ", str(cab["hw_screws"])),
            ("ידיות", str(cab["handles"])),
            ("זוויתניות L", "4" if is_large else "2"),
        ]
    else:
        shopping_sheets = [
            ("17 mm melamine chipboard (low-cost)", "2440 × 1220",
             "4 sheets (shared)"),
            ("4 mm MDF backer", "2440 × 1220", "1 (shared)"),
        ]
        shopping_hw = [
            ("110° concealed soft-close hinge", str(cab["hinges_total"])),
            ("Hinge mounting plate", str(cab["hinges_total"])),
            ("5 mm shelf pin", str(cab["shelf_pins"])),
            ("Structural screws 4.0×50 mm", str(cab["struct_screws"] + 20)),
            ("Hardware screws 3.5×16 mm", str(cab["hw_screws"])),
            ("Handles / pulls", str(cab["handles"])),
            ("Heavy-duty L-brackets", "4" if is_large else "2"),
        ]

    # ── Checklist ──
    if is_he:
        checklist = [
            "מדוד עובי שבבית בפועל עם קליבר.",
            "אמת מידות הגיליון לפני סימון.",
            "בדוק מרחק מרכז כוס ציר לפי דף הנתונים של היצרן.",
            "ודא שרוחב חיתוך המסור תואם ל-4 מ\"מ.",
            "סמן כל חלק עם מזהה (L-01…) מיד אחרי חיתוך.",
            "הרכב יבש לפני הברגה — ודא שהלוחות נכנסים בלי כוח.",
            "חובה: קדח פיילוט לפני כל בורג — שבבית נסדקת בקלות!",
            "יישר עמודות פיני מדף עם מכוון קידוח.",
            "אתר עמודי קיר לפני עיגון.",
            "פרוס את כל החלקים על הרצפה ועבור על רצף ההרכבה לפני הברגה.",
        ]
    else:
        checklist = [
            "Measure actual chipboard thickness with calipers.",
            "Verify sheet dimensions before layout.",
            "Confirm hinge cup center-to-edge from manufacturer datasheet.",
            "Check that saw kerf matches 4 mm allowance.",
            "Mark every part with its ID immediately after cutting.",
            "Dry-fit all joints before committing screws.",
            "MANDATORY: Pre-drill all pilot holes — chipboard splits easily!",
            "Align shelf pin columns with a drilling jig.",
            "Verify wall stud locations before mounting.",
            "Lay all parts on the floor and walk through assembly mentally.",
        ]

    return {
        "title": title,
        "size_str": size_str,
        "assumptions": assumptions,
        "hinge_notes": hinge_notes,
        "assembly": assembly,
        "shopping_sheets": shopping_sheets,
        "shopping_hw": shopping_hw,
        "checklist": checklist,
        "cab": cab,
    }


# ═══════════════════════════════════════════════════════════════════════════
#  PDF BUILDER
# ═══════════════════════════════════════════════════════════════════════════

def build_pdf(lang, cab_key):
    is_he = lang == "he"
    is_large = cab_key == "large"
    cab = LARGE if is_large else SMALL
    texts = get_texts(lang, cab_key)

    suffix = "HE" if is_he else "EN"
    cab_label = "Large" if is_large else "Small"
    cab_subdir = os.path.join(OUT_DIR, "large-cabinet" if is_large else "small-cabinet")
    os.makedirs(cab_subdir, exist_ok=True)
    filename = os.path.join(
        cab_subdir, f"{cab_label}_Pantry_Cabinet_PlanB_{suffix}.pdf")

    doc = SimpleDocTemplate(
        filename, pagesize=A4,
        topMargin=20 * mm, bottomMargin=15 * mm,
        leftMargin=15 * mm, rightMargin=15 * mm,
    )

    fn  = "David"   if is_he else "Arial"
    fnb = "DavidBd" if is_he else "ArialBd"
    align = TA_RIGHT if is_he else TA_LEFT

    styles = getSampleStyleSheet()
    s_title  = ParagraphStyle("T", parent=styles["Title"],
                              fontName=fnb, fontSize=18,
                              alignment=TA_CENTER, spaceAfter=6)
    s_h1     = ParagraphStyle("H1", parent=styles["Heading1"],
                              fontName=fnb, fontSize=14,
                              alignment=align, spaceAfter=4, spaceBefore=10)
    s_h2     = ParagraphStyle("H2", parent=styles["Heading2"],
                              fontName=fnb, fontSize=11,
                              alignment=align, spaceAfter=3, spaceBefore=6)
    s_body   = ParagraphStyle("B", parent=styles["Normal"],
                              fontName=fn, fontSize=9,
                              alignment=align, spaceAfter=2, leading=13)
    s_small  = ParagraphStyle("S", parent=styles["Normal"],
                              fontName=fn, fontSize=8,
                              alignment=align, spaceAfter=1, leading=11)
    s_center = ParagraphStyle("C", parent=styles["Normal"],
                              fontName=fn, fontSize=9,
                              alignment=TA_CENTER, spaceAfter=2, leading=13)

    story = []

    def T(text):
        return heb(text) if is_he else text

    def add_heading(num, en_text, he_text):
        story.append(Paragraph(T(he_text) if is_he else en_text, s_h1))

    def add_subheading(en_text, he_text):
        story.append(Paragraph(T(he_text) if is_he else en_text, s_h2))

    def add_bullet_list(items):
        for i, item in enumerate(items, 1):
            story.append(Paragraph(f"{i}. {T(item) if is_he else item}", s_body))

    def make_table(headers, rows, col_widths=None):
        data = [headers] + rows
        style_cmds = [
            ("BACKGROUND",    (0, 0), (-1, 0), colors.Color(0.2, 0.2, 0.3)),
            ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
            ("FONTNAME",      (0, 0), (-1, 0), fnb),
            ("FONTSIZE",      (0, 0), (-1, 0), 8),
            ("FONTNAME",      (0, 1), (-1, -1), fn),
            ("FONTSIZE",      (0, 1), (-1, -1), 7.5),
            ("ALIGN",         (0, 0), (-1, -1), "RIGHT" if is_he else "LEFT"),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("GRID",          (0, 0), (-1, -1), 0.5,
             colors.Color(0.7, 0.7, 0.7)),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1),
             [colors.white, colors.Color(0.96, 0.96, 0.98)]),
            ("TOPPADDING",    (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ]
        tbl = Table(data, colWidths=col_widths, repeatRows=1)
        tbl.setStyle(TableStyle(style_cmds))
        return tbl

    # ────────────────────────────────────────────────────────────────────
    # PAGE 1 — Title + Context + Assumptions + Dimensions
    # ────────────────────────────────────────────────────────────────────
    story.append(Paragraph(T(texts["title"]) if is_he else texts["title"],
                           s_title))

    subtitle = (T("תוכנית ב' — עומק מצומצם, שבבית זולה, חדר מחסן")
                if is_he else
                "Plan B — Reduced Depth, Low-Cost Chipboard, Storage Room")
    story.append(Paragraph(subtitle, s_center))

    H, W, D = cab["ext"]
    date_line = (
        T(f"תאריך: אפריל 2026 | מידות חיצוניות: {H}×{W}×{D} מ\"מ | עומק: {D} מ\"מ")
        if is_he else
        f"Date: April 2026 | External: {H}×{W}×{D} mm | Depth: {D} mm"
    )
    story.append(Paragraph(date_line, s_center))
    story.append(Spacer(1, 8))

    # Context table
    if is_he:
        ctx_data = [
            [T("ערך"), T("פרמטר")],
            [T("חדר מחסן"), T("מיקום")],
            [T("ללא מסגרת (אירופאי)"), T("סגנון")],
            [T("שבבית מלמין 17 מ\"מ (זולה)"), T("חומר גוף")],
            [T("MDF 4 מ\"מ"), T("חומר גב")],
            [T("2440 × 1220 מ\"מ"), T("גודל גיליון")],
            [T("4 מ\"מ"), T("רוחב חיתוך מסור")],
            [T("3 מ\"מ חיצוני / 2 מ\"מ מרכזי"), T("מרווח דלת")],
            [T(f"{D} מ\"מ (במקום 600 מ\"מ בתוכנית א')"), T("עומק")],
            [T("4 גיליונות 17 מ\"מ + 1 גב 4 מ\"מ"), T("גיליונות נדרשים")],
        ]
    else:
        ctx_data = [
            ["Parameter", "Value"],
            ["Location", "Storage room"],
            ["Style", "Frameless / Euro"],
            ["Carcass material", "17 mm melamine chipboard (low-cost)"],
            ["Back material", "4 mm MDF"],
            ["Sheet size", "2440 × 1220 mm"],
            ["Saw kerf", "4 mm"],
            ["Door reveal", "3 mm outer / 2 mm center"],
            ["Depth", f"{D} mm (reduced from 600 mm in Plan A)"],
            ["Sheets required", "4 sheets 17 mm + 1 backer 4 mm"],
        ]
    story.append(make_table(
        ctx_data[0], ctx_data[1:],
        col_widths=[120, 350] if not is_he else [350, 120]))
    story.append(Spacer(1, 8))

    # §1 Assumptions
    add_heading(1, "1. Assumptions & Risk Checks",
                   "1. הנחות ובדיקות סיכון")
    add_bullet_list(texts["assumptions"])
    story.append(Spacer(1, 4))

    # §2 Dimensions
    add_heading(2, "2. Dimension Summary", "2. סיכום מידות")
    shelf_d = D - 20
    if is_he:
        dim_data = [
            [T("תוצאה"), T("חישוב"), T("מידה")],
            [f"{H} × {W} × {D}", T("נתון"), T("חיצוני ג×ר×ע")],
            [str(cab["int_w"]), f"{W} - 2×17", T("רוחב פנימי")],
            [str(cab["int_h"]), f"{H} - 2×17", T("גובה פנימי")],
            [str(D), T("נתון"), T("עומק פנימי")],
            [str(cab["door_h"]), f"{H} - 3 - 3", T("גובה דלת")],
            [str(cab["door_w"]), f"({W} - 3 - 2 - 3) / 2", T("רוחב דלת")],
            [str(shelf_d), f"{D} - 20", T("עומק מדף")],
        ]
    else:
        dim_data = [
            ["Dimension", "Calculation", "Result"],
            ["External H × W × D", "Given", f"{H} × {W} × {D}"],
            ["Internal width", f"{W} − 2 × 17", str(cab["int_w"])],
            ["Internal height", f"{H} − 2 × 17", str(cab["int_h"])],
            ["Internal depth", "Given", str(D)],
            ["Door height", f"{H} − 3 − 3", str(cab["door_h"])],
            ["Door width (each)", f"({W} − 3 − 2 − 3) / 2",
             str(cab["door_w"])],
            ["Shelf depth", f"{D} − 20", str(shelf_d)],
        ]
    story.append(make_table(
        dim_data[0], dim_data[1:],
        col_widths=[140, 180, 140]))
    story.append(Spacer(1, 6))

    # §3 Cut List
    add_heading(3, "3. Cut List", "3. רשימת חיתוך")
    if is_he:
        cl_header = [T("קנט"), T("רוחב"), T("אורך"), T("עובי"),
                     T("כמות"), T("חלק"), T("מזהה")]
        cl_rows = []
        for p in cab["parts"]:
            cl_rows.append([
                T(p[10]), str(p[8]), str(p[7]), str(p[6]),
                str(p[3]), T(p[2]), p[0],
            ])
        cw = [85, 55, 55, 35, 30, 85, 35]
    else:
        cl_header = ["ID", "Part", "Qty", "Thick", "Length", "Width",
                     "Edge banding"]
        cl_rows = []
        for p in cab["parts"]:
            cl_rows.append([
                p[0], p[1], str(p[3]), str(p[6]),
                str(p[7]), str(p[8]), p[9],
            ])
        cw = [35, 85, 30, 35, 55, 55, 110]

    story.append(make_table(cl_header, cl_rows, col_widths=cw))
    story.append(Spacer(1, 4))

    # §4 Drilling & Boring
    story.append(PageBreak())
    add_heading(4, "4. Drilling & Boring Layout",
                   "4. תרשים קידוח וצירים")
    add_bullet_list(texts["hinge_notes"])
    story.append(Spacer(1, 4))

    # §5 Assembly
    add_heading(5, "5. Assembly Sequence", "5. רצף הרכבה")
    add_bullet_list(texts["assembly"])
    story.append(Spacer(1, 4))

    # §6 Shopping List
    add_heading(6, "6. Materials & Hardware",
                   "6. רשימת קניות — חומרים וחומרה")

    add_subheading("Sheet Goods", "גיליונות")
    if is_he:
        sh_header = [T("כמות"), T("גודל"), T("פריט")]
        sh_rows = [[T(r[2]), T(r[1]), T(r[0])]
                   for r in texts["shopping_sheets"]]
        sh_cw = [100, 120, 200]
    else:
        sh_header = ["Item", "Size", "Qty"]
        sh_rows = [[r[0], r[1], r[2]] for r in texts["shopping_sheets"]]
        sh_cw = [200, 120, 100]
    story.append(make_table(sh_header, sh_rows, col_widths=sh_cw))
    story.append(Spacer(1, 3))

    add_subheading("Hardware", "חומרה")
    if is_he:
        hw_header = [T("כמות"), T("פריט")]
        hw_rows = [[T(r[1]), T(r[0])] for r in texts["shopping_hw"]]
        hw_cw = [80, 340]
    else:
        hw_header = ["Item", "Qty"]
        hw_rows = [[r[0], r[1]] for r in texts["shopping_hw"]]
        hw_cw = [340, 80]
    story.append(make_table(hw_header, hw_rows, col_widths=hw_cw))
    story.append(Spacer(1, 6))

    # §7 Cut Plan (drawings)
    story.append(PageBreak())
    add_heading(7, "7. Sheet Cut Plan (4 Sheets — Plan B)",
                   "7. תוכנית חיתוך גיליונות (4 גיליונות — תוכנית ב')")

    note = (T("גיליון 2440×1220 מ\"מ | קנה מידה ~1:5 | כחול=ארון גדול | ירוק=ארון קטן")
            if is_he else
            "Sheet 2440 × 1220 mm | Scale ~1:5 | Blue = Large cab | Green = Small cab")
    story.append(Paragraph(note, s_small))
    story.append(Spacer(1, 4))

    cut_scale = 0.19
    for i, (yld, parts_layout) in enumerate(SHEETS_17MM, 1):
        drawing = draw_cut_sheet(parts_layout, 2440, 1220, cut_scale, i, yld)
        story.append(KeepTogether([drawing, Spacer(1, 4)]))

    add_subheading("4 mm Backer Sheet", "גיליון גב 4 מ\"מ")
    for i, (yld, parts_layout) in enumerate(SHEET_4MM, 1):
        drawing = draw_cut_sheet(parts_layout, 2440, 1220, cut_scale, 1, yld)
        story.append(drawing)
    story.append(Spacer(1, 6))

    # §8 Technical Drawings
    story.append(PageBreak())
    add_heading(8, "8. Technical Drawings", "8. שרטוטים טכניים")

    view_scale = 0.22 if is_large else 0.38

    add_subheading("Front Elevation (doors closed)",
                   "חזית (דלתות סגורות)")
    story.append(draw_front_closed(cab, view_scale))
    story.append(Spacer(1, 6))

    add_subheading("Front Elevation (open)", "חזית (פתוח)")
    story.append(draw_front_open(cab, view_scale))
    story.append(Spacer(1, 6))

    story.append(PageBreak())

    add_subheading("Side Elevation", "מבט צד")
    story.append(draw_side_elevation(cab, view_scale))
    story.append(Spacer(1, 6))

    add_subheading("Top View", "מבט עליון")
    story.append(draw_top_view(cab, view_scale))
    story.append(Spacer(1, 6))

    add_subheading("Back Elevation", "מבט אחורי")
    story.append(draw_back_elevation(cab, view_scale))
    story.append(Spacer(1, 6))

    story.append(PageBreak())

    add_subheading("3D Isometric View", "מבט תלת-ממדי איזומטרי")
    iso_scale = 0.18 if is_large else 0.32
    story.append(draw_3d_isometric(cab, iso_scale))
    story.append(Spacer(1, 8))

    # §9 Checklist
    add_heading(9, "9. Verify Before Cutting", "9. בדוק לפני חיתוך")
    for item in texts["checklist"]:
        txt = T(item) if is_he else item
        story.append(Paragraph(f"\u2610  {txt}", s_body))

    # Build PDF
    doc.build(story)
    print(f"  Created: {filename}")
    return filename


# ═══════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("Generating Plan B PDFs...")
    files = []
    for cab_key in ("large", "small"):
        for lang in ("en", "he"):
            f = build_pdf(lang, cab_key)
            files.append(f)
    print(f"\nDone. {len(files)} PDFs generated:")
    for f in files:
        print(f"  {os.path.basename(f)}")
