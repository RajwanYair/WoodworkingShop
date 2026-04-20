"""Shared drawing, table, and font utilities for pantry-cabinet PDF generators.

This module extracts the ~500 lines of duplicated infrastructure that was
copy-pasted across generate_plan_a_pdfs.py (Plan A), generate_plan_b_pdfs.py (Plan B),
and generate_plan_c_pdfs.py (Plan C).
"""

import os

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import (
    Drawing, Rect, Line, String, Circle, Polygon,
)

try:
    from bidi.algorithm import get_display
    HAS_BIDI = True
except ImportError:
    HAS_BIDI = False


# ═══════════════════════════════════════════════════════════════════════════
#  FONT REGISTRATION
# ═══════════════════════════════════════════════════════════════════════════

def _find_font(name):
    """Locate a TrueType font file, checking WINDIR/Fonts then common paths."""
    candidates = [
        os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "Fonts", name),
        os.path.join("/usr/share/fonts/truetype/msttcorefonts", name),
        os.path.join("/usr/share/fonts/truetype", name),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    return candidates[0]  # fallback to Windows path


def register_fonts():
    """Register Arial (EN) and David (HE) font families with reportlab."""
    pdfmetrics.registerFont(TTFont("Arial",   _find_font("arial.ttf")))
    pdfmetrics.registerFont(TTFont("ArialBd", _find_font("arialbd.ttf")))
    pdfmetrics.registerFont(TTFont("David",   _find_font("david.ttf")))
    pdfmetrics.registerFont(TTFont("DavidBd", _find_font("davidbd.ttf")))


# ═══════════════════════════════════════════════════════════════════════════
#  HEBREW HELPER
# ═══════════════════════════════════════════════════════════════════════════

def heb(text):
    """Return visual-order Hebrew string for reportlab."""
    if HAS_BIDI:
        return get_display(text)
    return text[::-1]  # crude fallback


# ═══════════════════════════════════════════════════════════════════════════
#  COLOUR CONSTANTS
# ═══════════════════════════════════════════════════════════════════════════

C_PANEL   = colors.Color(0.862, 0.796, 0.690)
C_SHELF   = colors.Color(0.804, 0.737, 0.631)
C_DOOR    = colors.Color(0.708, 0.596, 0.478)
C_BACK    = colors.Color(0.930, 0.885, 0.776)
C_HINGE   = colors.Color(0.463, 0.369, 0.259)
C_OUTLINE = colors.Color(0.212, 0.184, 0.153)
C_DIM     = colors.Color(0.412, 0.349, 0.286)
C_HIDDEN  = colors.Color(0.592, 0.541, 0.490)
C_EDGE    = colors.Color(0.792, 0.541, 0.180)
C_EDGE_SOFT = colors.Color(0.906, 0.706, 0.365)
C_SHADOW  = colors.Color(0.118, 0.098, 0.078, alpha=0.11)
C_HANDLE  = colors.Color(0.267, 0.231, 0.196)
C_SHEET_BG = colors.Color(0.973, 0.957, 0.929)
C_CARD_BG = colors.Color(0.992, 0.986, 0.976)
C_CARD_BORDER = colors.Color(0.855, 0.804, 0.733)
C_HEADER_BG = colors.Color(0.463, 0.365, 0.271)
C_HEADER_TEXT = colors.Color(0.992, 0.980, 0.953)
C_ROW_ALT = colors.Color(0.978, 0.965, 0.937)
C_ACCENT = colors.Color(0.557, 0.412, 0.271)


def build_part_lookup(*cabs):
    """Build a lookup by part ID from one or more cabinet definitions."""
    lookup = {}
    for cab in cabs:
        for part in cab["parts"]:
            lookup[part[0]] = part
    return lookup


def _shadowed_rect(d, x, y, w, h, fill_color, stroke_color=C_OUTLINE,
                   stroke_width=1.0, shadow_dx=6, shadow_dy=-6,
                   shadow_opacity=0.10):
    d.add(Rect(x + shadow_dx, y + shadow_dy, w, h,
               fillColor=colors.Color(0.08, 0.11, 0.18, alpha=shadow_opacity),
               strokeColor=None, strokeWidth=0))
    d.add(Rect(x, y, w, h,
               fillColor=fill_color,
               strokeColor=stroke_color,
               strokeWidth=stroke_width))


def _catalog_frame(d, width, height, pad=10):
    d.add(Rect(pad, pad, width - 2 * pad, height - 2 * pad,
               fillColor=C_CARD_BG,
               strokeColor=C_CARD_BORDER,
               strokeWidth=0.7))


def _highlight_edge(d, x1, y1, x2, y2, *, optional=False, stroke_width=2.6):
    d.add(Line(x1, y1, x2, y2,
               strokeColor=C_EDGE_SOFT if optional else C_EDGE,
               strokeWidth=stroke_width,
               strokeDashArray=[5, 3] if optional else None))


def _draw_handle(d, x, y, h, side):
    handle_x = x + 10 if side == "left" else x - 10
    d.add(Line(handle_x, y + h * 0.42, handle_x, y + h * 0.58,
               strokeColor=C_HANDLE, strokeWidth=2.1))


def _part_base_fill(is_large):
    return colors.Color(0.820, 0.902, 0.992) if is_large else colors.Color(0.831, 0.973, 0.890)


def _parse_edge_targets(part, drawn_w, drawn_h):
    """Return edge sides that should be highlighted for a part.

    Sides use drawing coordinates: top, bottom, left, right.
    """
    edge_text = str(part[9]).lower()
    if edge_text.startswith("none"):
        return [], False
    if "4 edges" in edge_text:
        return ["top", "bottom", "left", "right"], edge_text.startswith("optional")

    match_value = None
    if "front" in edge_text:
        start = edge_text.find("(")
        end = edge_text.find(")", start + 1)
        if start != -1 and end != -1:
            try:
                match_value = int(edge_text[start + 1:end])
            except ValueError:
                match_value = None

    if match_value is None:
        return ["top"], False
    if match_value == drawn_w:
        return ["top"], False
    if match_value == drawn_h:
        return ["right"], False
    return ["top"], False


def _draw_cut_part(d, px, py, ppw, pph, label, is_large, part=None, raw_w=None, raw_h=None):
    fill = _part_base_fill(is_large)
    _shadowed_rect(d, px, py, ppw, pph, fill, stroke_width=0.9,
                   shadow_dx=2.0, shadow_dy=-2.0, shadow_opacity=0.07)
    d.add(Line(px, py + pph - 1.4, px + ppw, py + pph - 1.4,
               strokeColor=colors.white, strokeWidth=0.8))
    d.add(Line(px + 1.4, py, px + 1.4, py + pph,
               strokeColor=colors.white, strokeWidth=0.6))

    if part is not None:
        edges, optional = _parse_edge_targets(part, raw_w, raw_h)
        for edge in edges:
            if edge == "top":
                _highlight_edge(d, px, py + pph, px + ppw, py + pph, optional=optional, stroke_width=2.0)
            elif edge == "bottom":
                _highlight_edge(d, px, py, px + ppw, py, optional=optional, stroke_width=2.0)
            elif edge == "left":
                _highlight_edge(d, px, py, px, py + pph, optional=optional, stroke_width=2.0)
            elif edge == "right":
                _highlight_edge(d, px + ppw, py, px + ppw, py + pph, optional=optional, stroke_width=2.0)

    d.add(String(px + ppw / 2, py + pph / 2 + 4, label,
                 fontSize=6, fillColor=C_OUTLINE,
                 fontName="ArialBd", textAnchor="middle"))


def _draw_cut_sheet_legend(d, ox, top_y):
    legend_y = top_y + 18
    d.add(Rect(ox + 220, legend_y - 10, 205, 24,
               fillColor=colors.Color(1, 1, 1, alpha=0.72),
               strokeColor=colors.Color(0.82, 0.85, 0.90),
               strokeWidth=0.6))
    _highlight_edge(d, ox + 230, legend_y + 1, ox + 248, legend_y + 1, optional=False, stroke_width=2.3)
    d.add(String(ox + 254, legend_y - 2,
                 "edge cover required",
                 fontSize=6.5, fillColor=C_OUTLINE,
                 fontName="Arial", textAnchor="start"))
    _highlight_edge(d, ox + 334, legend_y + 1, ox + 352, legend_y + 1, optional=True, stroke_width=2.3)
    d.add(String(ox + 358, legend_y - 2,
                 "edge cover optional",
                 fontSize=6.5, fillColor=C_OUTLINE,
                 fontName="Arial", textAnchor="start"))


# ═══════════════════════════════════════════════════════════════════════════
#  DIMENSION LINE HELPER
# ═══════════════════════════════════════════════════════════════════════════

def dim_line(d, x1, y1, x2, y2, label, offset=12, font_size=7, horiz=True):
    """Draw a dimension line with ticks and a centered label."""
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


# ═══════════════════════════════════════════════════════════════════════════
#  CABINET DRAWING FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════

def draw_front_closed(cab, scale):
    """Front elevation with doors closed."""
    H, W, D = cab["ext"]
    w = W * scale
    h = H * scale
    d = Drawing(420, h + 60)
    _catalog_frame(d, 420, h + 60)
    ox, oy = 40, 30

    _shadowed_rect(d, ox, oy, w, h,
                   colors.Color(0.987, 0.975, 0.949),
                   stroke_width=1.5, shadow_dx=7, shadow_dy=-7, shadow_opacity=0.11)
    d.add(Line(ox, oy + h - 1.5, ox + w, oy + h - 1.5,
               strokeColor=colors.white, strokeWidth=1.0))

    gap = 3 * scale
    p = 17 * scale
    dw_px = cab["door_w"] * scale
    _highlight_edge(d, ox, oy, ox, oy + h)
    _highlight_edge(d, ox + w, oy, ox + w, oy + h)
    d.add(Rect(ox + gap, oy + gap, dw_px, h - 2 * gap,
               fillColor=C_DOOR,
               strokeColor=colors.Color(0.6, 0.11, 0.11), strokeWidth=1))
    d.add(Rect(ox + w - gap - dw_px, oy + gap, dw_px, h - 2 * gap,
               fillColor=C_DOOR,
               strokeColor=colors.Color(0.6, 0.11, 0.11), strokeWidth=1))
    d.add(Line(ox + gap, oy + h - gap - 1, ox + gap + dw_px, oy + h - gap - 1,
               strokeColor=colors.white, strokeWidth=0.8))
    d.add(Line(ox + w - gap - dw_px, oy + h - gap - 1, ox + w - gap, oy + h - gap - 1,
               strokeColor=colors.white, strokeWidth=0.8))

    _draw_handle(d, ox + gap + dw_px, oy + gap, h - 2 * gap, "left")
    _draw_handle(d, ox + w - gap - dw_px, oy + gap, h - 2 * gap, "right")

    d.add(Line(ox + p, oy + h - p, ox + w - p, oy + h - p,
               strokeColor=colors.Color(1, 1, 1, alpha=0.55), strokeWidth=0.6))

    for hp in cab["hinge_positions"]:
        yh = oy + hp * scale
        d.add(Circle(ox + gap + 4, yh, 2,
                     fillColor=C_HINGE, strokeColor=C_HINGE, strokeWidth=0))
        d.add(Circle(ox + w - gap - 4, yh, 2,
                     fillColor=C_HINGE, strokeColor=C_HINGE, strokeWidth=0))

    dim_line(d, ox, oy - 14, ox + w, oy - 14, W, offset=10, horiz=True)
    dim_line(d, ox - 14, oy, ox - 14, oy + h, H, offset=14, horiz=False)
    return d


def draw_front_open(cab, scale):
    """Front elevation with doors removed showing interior."""
    H, W, D = cab["ext"]
    w = W * scale
    h = H * scale
    p = 17 * scale
    d = Drawing(420, h + 60)
    _catalog_frame(d, 420, h + 60)
    ox, oy = 40, 30

    _shadowed_rect(d, ox, oy, w, h,
                   colors.Color(0.987, 0.975, 0.949),
                   stroke_width=1.5, shadow_dx=7, shadow_dy=-7, shadow_opacity=0.11)
    d.add(Rect(ox, oy, p, h,
               fillColor=C_PANEL, strokeColor=C_OUTLINE, strokeWidth=1))
    d.add(Rect(ox + w - p, oy, p, h,
               fillColor=C_PANEL, strokeColor=C_OUTLINE, strokeWidth=1))
    d.add(Rect(ox + p, oy + h - p, w - 2 * p, p,
               fillColor=C_PANEL, strokeColor=C_OUTLINE, strokeWidth=1))
    d.add(Rect(ox + p, oy, w - 2 * p, p,
               fillColor=C_PANEL, strokeColor=C_OUTLINE, strokeWidth=1))

    mid = h / 2
    d.add(Rect(ox + p, oy + mid - p / 2, w - 2 * p, p,
               fillColor=C_SHELF, strokeColor=C_OUTLINE, strokeWidth=0.8))

    for edge_x in (ox, ox + p, ox + w - p, ox + w):
        d.add(Line(edge_x, oy, edge_x, oy + h,
                   strokeColor=colors.Color(1, 1, 1, alpha=0.40), strokeWidth=0.4))

    _highlight_edge(d, ox, oy, ox, oy + h)
    _highlight_edge(d, ox + w, oy, ox + w, oy + h)
    _highlight_edge(d, ox + p, oy + h, ox + w - p, oy + h)
    _highlight_edge(d, ox + p, oy, ox + w - p, oy)
    _highlight_edge(d, ox + p, oy + mid + p / 2, ox + w - p, oy + mid + p / 2)

    has_adj = any(pt[0].endswith("-05") for pt in cab["parts"])
    if has_adj:
        for frac in (0.2, 0.35, 0.65, 0.8):
            yy = oy + h * frac
            d.add(Line(ox + p, yy, ox + w - p, yy,
                       strokeColor=C_HIDDEN, strokeWidth=0.8,
                       strokeDashArray=[4, 3]))

    dim_line(d, ox + p, oy - 14, ox + w - p, oy - 14, cab["int_w"],
             offset=10, horiz=True)
    return d


def draw_side_elevation(cab, scale):
    """Side elevation."""
    H, W, D = cab["ext"]
    h = H * scale
    depth = D * scale
    p = 17 * scale
    d = Drawing(320, h + 60)
    _catalog_frame(d, 320, h + 60)
    ox, oy = 40, 30

    _shadowed_rect(d, ox, oy, depth, h,
                   C_PANEL, stroke_width=1.5,
                   shadow_dx=6, shadow_dy=-6, shadow_opacity=0.10)
    for yy in (oy + p, oy + h - p, oy + h / 2):
        d.add(Line(ox + 4, yy, ox + depth - 4, yy,
                   strokeColor=C_HIDDEN, strokeWidth=0.6,
                   strokeDashArray=[4, 3]))
    _highlight_edge(d, ox, oy, ox, oy + h)
    d.add(Rect(ox + depth - 1, oy + 2, 1, h - 4,
               fillColor=C_BACK,
               strokeColor=colors.Color(0.573, 0.251, 0.055), strokeWidth=0.5))
    d.add(Line(ox + 1, oy + h - 1.5, ox + depth - 1, oy + h - 1.5,
               strokeColor=colors.white, strokeWidth=0.8))

    dim_line(d, ox, oy - 14, ox + depth, oy - 14, D, offset=10, horiz=True)
    dim_line(d, ox - 14, oy, ox - 14, oy + h, H, offset=14, horiz=False)
    return d


def draw_top_view(cab, scale):
    """Top plan view."""
    H, W, D = cab["ext"]
    w = W * scale
    depth = D * scale
    p = 17 * scale
    d = Drawing(420, depth + 60)
    _catalog_frame(d, 420, depth + 60)
    ox, oy = 40, 20

    _shadowed_rect(d, ox, oy, w, depth,
                   colors.Color(0.987, 0.975, 0.949),
                   stroke_width=1.5, shadow_dx=6, shadow_dy=-6, shadow_opacity=0.10)
    d.add(Rect(ox, oy, p, depth,
               fillColor=C_PANEL, strokeColor=C_OUTLINE, strokeWidth=1))
    d.add(Rect(ox + w - p, oy, p, depth,
               fillColor=C_PANEL, strokeColor=C_OUTLINE, strokeWidth=1))
    _highlight_edge(d, ox, oy, ox + w, oy)
    d.add(Line(ox, oy + depth - 1, ox + w, oy + depth - 1,
               strokeColor=C_BACK, strokeWidth=1))
    d.add(Line(ox + 1, oy + depth - 1.4, ox + w - 1, oy + depth - 1.4,
               strokeColor=colors.white, strokeWidth=0.7))

    dim_line(d, ox, oy - 10, ox + w, oy - 10, W, offset=9, horiz=True)
    dim_line(d, ox + w + 10, oy, ox + w + 10, oy + depth, D,
             offset=-16, horiz=False)
    return d


def draw_back_elevation(cab, scale):
    """Back elevation showing back panel."""
    H, W, D = cab["ext"]
    w = W * scale
    h = H * scale
    d = Drawing(420, h + 60)
    _catalog_frame(d, 420, h + 60)
    ox, oy = 40, 30

    _shadowed_rect(d, ox, oy, w, h,
                   colors.Color(0.987, 0.975, 0.949),
                   stroke_width=1.5, shadow_dx=6, shadow_dy=-6, shadow_opacity=0.10)
    inset = 10 * scale * 2.5
    d.add(Rect(ox + inset / 2, oy + inset / 2, w - inset, h - inset,
               fillColor=C_BACK,
               strokeColor=colors.Color(0.573, 0.251, 0.055), strokeWidth=1))
    for pt in cab["parts"]:
        if "Back" in pt[1] or "גב" in pt[2]:
            bp_h, bp_w = pt[7], pt[8]
            d.add(String(ox + w / 2, oy + h / 2,
                         f"{bp_h} x {bp_w} x {pt[6]}",
                         fontSize=7, fillColor=C_DIM,
                         fontName="Arial", textAnchor="middle"))
            break

    d.add(Line(ox + 1, oy + h - 1.4, ox + w - 1, oy + h - 1.4,
               strokeColor=colors.white, strokeWidth=0.7))

    dim_line(d, ox, oy - 14, ox + w, oy - 14, W, offset=10, horiz=True)
    return d


def draw_3d_isometric(cab, scale):
    """Pseudo-isometric view with stronger presentation-style depth cues."""
    H, W, D = cab["ext"]
    fw = W * scale
    fh = H * scale
    dx = D * scale * 0.4
    dy = D * scale * 0.25
    p = 17 * scale

    d = Drawing(fw + dx + 80, fh + dy + 80)
    _catalog_frame(d, fw + dx + 80, fh + dy + 80)
    ox, oy = 40, 20

    d.add(Polygon(
        [ox + 8, oy - 10, ox + fw + dx + 18, oy - 10 + dy * 0.35,
         ox + fw + dx + 2, oy - 24 + dy * 0.35, ox - 10, oy - 24],
        fillColor=C_SHADOW, strokeColor=None, strokeWidth=0))
    d.add(Rect(ox, oy, fw, fh,
               fillColor=C_PANEL, strokeColor=C_OUTLINE, strokeWidth=1.5))
    d.add(Polygon(
        [ox, oy + fh, ox + dx, oy + fh + dy,
         ox + fw + dx, oy + fh + dy, ox + fw, oy + fh],
        fillColor=colors.Color(0.948, 0.902, 0.824),
        strokeColor=C_OUTLINE, strokeWidth=1.5))
    d.add(Polygon(
        [ox + fw, oy, ox + fw + dx, oy + dy,
         ox + fw + dx, oy + fh + dy, ox + fw, oy + fh],
        fillColor=colors.Color(0.682, 0.573, 0.463),
        strokeColor=C_OUTLINE, strokeWidth=1.5))

    d.add(Line(ox + 1.5, oy + fh - 1.5, ox + fw - 1.5, oy + fh - 1.5,
               strokeColor=colors.white, strokeWidth=0.9))
    d.add(Line(ox + fw, oy + fh, ox + fw + dx, oy + fh + dy,
               strokeColor=colors.white, strokeWidth=0.8))

    dw_px = cab["door_w"] * scale
    d.add(Rect(ox + 2, oy + 2, dw_px, fh - 4,
               fillColor=C_DOOR,
               strokeColor=colors.Color(0.6, 0.11, 0.11),
               strokeWidth=0.8, fillOpacity=0.4))
    d.add(Line(ox + 3, oy + fh - 3, ox + dw_px - 1, oy + fh - 3,
               strokeColor=colors.white, strokeWidth=0.7))
    _draw_handle(d, ox + dw_px, oy + 2, fh - 4, "left")

    _highlight_edge(d, ox, oy, ox, oy + fh)

    mid = fh / 2
    d.add(Line(ox + fw, oy + mid, ox + fw + dx, oy + mid + dy,
               strokeColor=C_OUTLINE, strokeWidth=0.8))
    d.add(Line(ox + p, oy + mid, ox + fw - p, oy + mid,
               strokeColor=C_HIDDEN, strokeWidth=0.8,
               strokeDashArray=[4, 3]))

    dim_line(d, ox - 14, oy, ox - 14, oy + fh, H, offset=14, horiz=False)
    dim_line(d, ox, oy - 14, ox + fw, oy - 14, W, offset=10, horiz=True)
    d.add(String(ox + fw + dx / 2 + 6, oy + fh + dy / 2 + 8, str(D),
                 fontSize=7, fillColor=C_DIM,
                 fontName="Arial", textAnchor="middle"))
    return d


def draw_cut_sheet(parts_on_sheet, sheet_w, sheet_h, scale, sheet_num, yield_pct, part_lookup=None):
    """Draw one sheet with parts arranged on it."""
    sw = sheet_w * scale
    sh = sheet_h * scale
    d = Drawing(sw + 80, sh + 60)
    _catalog_frame(d, sw + 80, sh + 60)
    ox, oy = 40, 30

    _shadowed_rect(d, ox, oy, sw, sh,
                   C_SHEET_BG, stroke_width=1.5,
                   shadow_dx=6, shadow_dy=-6, shadow_opacity=0.10)
    d.add(Line(ox + 1.5, oy + sh - 1.5, ox + sw - 1.5, oy + sh - 1.5,
               strokeColor=colors.white, strokeWidth=0.9))
    d.add(String(ox, oy + sh + 14,
                 f"Sheet {sheet_num}  ({yield_pct}%)",
                 fontSize=9, fillColor=colors.black,
                 fontName="ArialBd", textAnchor="start"))
    _draw_cut_sheet_legend(d, ox, oy + sh)

    for (x, y, pw, ph, label, is_large) in parts_on_sheet:
        px = ox + x * scale
        py = oy + y * scale
        ppw = pw * scale
        pph = ph * scale
        part = None
        if part_lookup is not None:
            base_label = label.split()[0]
            part = part_lookup.get(base_label)
        _draw_cut_part(d, px, py, ppw, pph, label, is_large, part=part, raw_w=pw, raw_h=ph)
        d.add(String(px + ppw / 2, py + pph / 2 - 5,
                     f"{pw}\u00d7{ph}",
                     fontSize=5, fillColor=C_DIM,
                     fontName="Arial", textAnchor="middle"))
    return d


# ═══════════════════════════════════════════════════════════════════════════
#  TABLE BUILDER
# ═══════════════════════════════════════════════════════════════════════════

def make_table(headers, rows, col_widths=None, *, is_he=False):
    """Build a styled Table with standard header/row formatting."""
    fn  = "David"   if is_he else "Arial"
    fnb = "DavidBd" if is_he else "ArialBd"
    data = [headers] + rows
    style_cmds = [
        ("BACKGROUND",    (0, 0), (-1, 0), C_HEADER_BG),
        ("TEXTCOLOR",     (0, 0), (-1, 0), C_HEADER_TEXT),
        ("FONTNAME",      (0, 0), (-1, 0), fnb),
        ("FONTSIZE",      (0, 0), (-1, 0), 8.3),
        ("FONTNAME",      (0, 1), (-1, -1), fn),
        ("FONTSIZE",      (0, 1), (-1, -1), 7.6),
        ("ALIGN",         (0, 0), (-1, -1), "RIGHT" if is_he else "LEFT"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW",     (0, 0), (-1, 0), 0.9, C_HEADER_BG),
        ("INNERGRID",     (0, 1), (-1, -1), 0.35, C_CARD_BORDER),
        ("BOX",           (0, 0), (-1, -1), 0.5, C_CARD_BORDER),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1),
         [colors.white, C_ROW_ALT]),
        ("TEXTCOLOR",     (0, 1), (-1, -1), C_OUTLINE),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    tbl = Table(data, colWidths=col_widths, repeatRows=1)
    tbl.setStyle(TableStyle(style_cmds))
    return tbl


# ═══════════════════════════════════════════════════════════════════════════
#  STYLE FACTORY
# ═══════════════════════════════════════════════════════════════════════════

def make_styles(is_he):
    """Create and return a dict of ParagraphStyles for the given language."""
    fn  = "David"   if is_he else "Arial"
    fnb = "DavidBd" if is_he else "ArialBd"
    al  = TA_RIGHT  if is_he else TA_LEFT
    base = getSampleStyleSheet()
    return {
        "title":  ParagraphStyle("T",  parent=base["Title"],
                                 fontName=fnb, fontSize=20,
                                 leading=24, textColor=C_OUTLINE,
                                 alignment=TA_CENTER, spaceAfter=8),
        "h1":     ParagraphStyle("H1", parent=base["Heading1"],
                                 fontName=fnb, fontSize=14.5,
                                 leading=18, textColor=C_ACCENT,
                                 alignment=al, spaceAfter=5, spaceBefore=12),
        "h2":     ParagraphStyle("H2", parent=base["Heading2"],
                                 fontName=fnb, fontSize=11.2,
                                 leading=14, textColor=C_OUTLINE,
                                 alignment=al, spaceAfter=4, spaceBefore=7),
        "body":   ParagraphStyle("B",  parent=base["Normal"],
                                 fontName=fn, fontSize=9,
                                 textColor=C_OUTLINE,
                                 alignment=al, spaceAfter=3, leading=13.5),
        "small":  ParagraphStyle("S",  parent=base["Normal"],
                                 fontName=fn, fontSize=8,
                                 textColor=C_DIM,
                                 alignment=al, spaceAfter=2, leading=11.5),
        "center": ParagraphStyle("C",  parent=base["Normal"],
                                 fontName=fn, fontSize=9,
                                 textColor=C_DIM,
                                 alignment=TA_CENTER, spaceAfter=3, leading=13.5),
        "eyebrow": ParagraphStyle("Eyebrow", parent=base["Normal"],
                                 fontName=fnb, fontSize=8.5,
                                 textColor=C_ACCENT,
                                 alignment=TA_CENTER, spaceAfter=4, leading=10),
        "card_title": ParagraphStyle("CardTitle", parent=base["Heading2"],
                                 fontName=fnb, fontSize=12,
                                 textColor=C_OUTLINE,
                                 alignment=al, spaceAfter=4, leading=15),
        "card_body": ParagraphStyle("CardBody", parent=base["Normal"],
                                 fontName=fn, fontSize=8.5,
                                 textColor=C_DIM,
                                 alignment=al, spaceAfter=3, leading=12),
        "card_value": ParagraphStyle("CardValue", parent=base["Heading1"],
                                 fontName=fnb, fontSize=15,
                                 textColor=C_ACCENT,
                                 alignment=TA_CENTER, spaceAfter=1, leading=18),
        "card_label": ParagraphStyle("CardLabel", parent=base["Normal"],
                                 fontName=fn, fontSize=7.5,
                                 textColor=C_DIM,
                                 alignment=TA_CENTER, spaceAfter=0, leading=9),
    }


def _catalog_card_table(data, col_widths, *, background=colors.white, border=C_CARD_BORDER,
                        padding=10, valign="TOP"):
    card = Table(data, colWidths=col_widths)
    card.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.8, border),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, border),
        ("LEFTPADDING", (0, 0), (-1, -1), padding),
        ("RIGHTPADDING", (0, 0), (-1, -1), padding),
        ("TOPPADDING", (0, 0), (-1, -1), padding),
        ("BOTTOMPADDING", (0, 0), (-1, -1), padding),
        ("VALIGN", (0, 0), (-1, -1), valign),
    ]))
    return card


def make_catalog_cover(title, subtitle, meta_line, intro, stats, styles, *, is_he=False, eyebrow=None):
    body_style = styles["body"]
    center_style = styles["center"]
    eyebrow_style = styles["eyebrow"]
    card_value = styles["card_value"]
    card_label = styles["card_label"]

    hero_rows = []
    if eyebrow:
        hero_rows.append([Paragraph(eyebrow, eyebrow_style)])
    hero_rows.extend([
        [Paragraph(title, styles["title"])],
        [Paragraph(subtitle, center_style)],
        [Paragraph(meta_line, center_style)],
        [Paragraph(intro, body_style)],
    ])
    hero = _catalog_card_table(
        hero_rows,
        [480],
        background=C_CARD_BG,
        border=C_CARD_BORDER,
        padding=14,
    )

    stat_cards = []
    for label, value in stats:
        stat_cards.append(_catalog_card_table(
            [[Paragraph(value, card_value)], [Paragraph(label, card_label)]],
            [150],
            background=colors.white,
            border=C_CARD_BORDER,
            padding=8,
            valign="MIDDLE",
        ))

    flowables = [hero, Spacer(1, 8)]
    if stat_cards:
        flowables.append(Table([stat_cards], colWidths=[160] * len(stat_cards)))
        flowables.append(Spacer(1, 10))
    return flowables


def make_product_card(title, subtitle, specs, blurb, styles, *, is_he=False):
    rows = [[Paragraph(title, styles["card_title"])]]
    if subtitle:
        rows.append([Paragraph(subtitle, styles["card_body"])])
    if specs:
        spec_headers = [Paragraph(("Detail" if not is_he else "פרט"), styles["card_body"]),
                        Paragraph(("Value" if not is_he else "ערך"), styles["card_body"])]
        spec_rows = [[Paragraph(label, styles["card_body"]), Paragraph(value, styles["card_body"])]
                     for label, value in specs]
        spec_table = make_table(spec_headers, spec_rows, [170, 250], is_he=is_he)
        rows.append([spec_table])
    if blurb:
        rows.append([Paragraph(blurb, styles["card_body"])])
    return _catalog_card_table(rows, [440], background=colors.white, border=C_CARD_BORDER, padding=12)


def make_feature_callout(title, items, styles, *, is_he=False):
    rows = [[Paragraph(title, styles["card_title"])]]
    for item in items:
        bullet = "• " + item
        rows.append([Paragraph(bullet, styles["card_body"])])
    return _catalog_card_table(rows, [440], background=C_ROW_ALT, border=C_CARD_BORDER, padding=12)


# ═══════════════════════════════════════════════════════════════════════════
#  PDF DOCUMENT FACTORY
# ═══════════════════════════════════════════════════════════════════════════

def create_doc(filepath):
    """Create a SimpleDocTemplate with standard A4 margins."""
    return SimpleDocTemplate(
        filepath, pagesize=A4,
        topMargin=20 * mm, bottomMargin=15 * mm,
        leftMargin=15 * mm, rightMargin=15 * mm,
    )
