#!/usr/bin/env python3
"""Generate detailed PDF plans for Large and Small pantry cabinets in English and Hebrew.

Plan A — Original design: depth 600 mm, 5 sheets of 17 mm sandwich plywood.
"""

import os
import sys

from reportlab.platypus import Paragraph, Spacer, PageBreak, KeepTogether

# Add shared module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from shared.pdf_utils import (
    build_part_lookup, register_fonts, heb, make_table, make_styles, create_doc,
    draw_front_closed, draw_front_open, draw_side_elevation,
    draw_top_view, draw_back_elevation, draw_3d_isometric, draw_cut_sheet,
)

# ── Paths ──────────────────────────────────────────────────────────────────
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
register_fonts()


# ═══════════════════════════════════════════════════════════════════════════
#  DATA
# ═══════════════════════════════════════════════════════════════════════════

LARGE = {
    "ext": (2000, 1000, 600),
    "int_w": 966, "int_h": 1966, "int_d": 600,
    "parts": [
        ("L-01", "Side panel",     "לוח צד",        2, "Sandwich plywood","סנדוויץ'", 17, 2000, 600,  "1× front (2000)",  "1× חזית (2000)"),
        ("L-02", "Top panel",      "לוח עליון",      1, "Sandwich plywood","סנדוויץ'", 17,  966, 600,  "1× front (966)",   "1× חזית (966)"),
        ("L-03", "Bottom panel",   "לוח תחתון",      1, "Sandwich plywood","סנדוויץ'", 17,  966, 600,  "1× front (966)",   "1× חזית (966)"),
        ("L-04", "Fixed shelf",    "מדף קבוע",       1, "Sandwich plywood","סנדוויץ'", 17,  966, 580,  "1× front (966)",   "1× חזית (966)"),
        ("L-05", "Adjustable shelf","מדף מתכוונן",   4, "Sandwich plywood","סנדוויץ'", 17,  964, 580,  "1× front (964)",   "1× חזית (964)"),
        ("L-06", "Door",           "דלת",            2, "Sandwich plywood","סנדוויץ'", 17, 1994, 496,  "All 4 edges",      "כל 4 צדדים"),
        ("L-07", "Back panel",     "לוח גב",         1, "Sandwich plywood","סנדוויץ'",4,1980,980, "None",             "ללא"),
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
    "ext": (480, 780, 600),
    "int_w": 746, "int_h": 446, "int_d": 600,
    "parts": [
        ("S-01", "Side panel",   "לוח צד",      2, "Sandwich plywood","סנדוויץ'", 17,  480, 600, "1× front (480)",  "1× חזית (480)"),
        ("S-02", "Top panel",    "לוח עליון",    1, "Sandwich plywood","סנדוויץ'", 17,  746, 600, "1× front (746)",  "1× חזית (746)"),
        ("S-03", "Bottom panel", "לוח תחתון",    1, "Sandwich plywood","סנדוויץ'", 17,  746, 600, "1× front (746)",  "1× חזית (746)"),
        ("S-04", "Fixed shelf",  "מדף קבוע",     1, "Sandwich plywood","סנדוויץ'", 17,  745, 580, "1× front (745)",  "1× חזית (745)"),
        ("S-05", "Door",         "דלת",          2, "Sandwich plywood","סנדוויץ'", 17,  474, 386, "All 4 edges",     "כל 4 צדדים"),
        ("S-06", "Back panel",   "לוח גב",       1, "Sandwich plywood","סנדוויץ'",4, 456, 760, "None",           "ללא"),
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
#  CUT PLAN SHEET LAYOUTS
# ═══════════════════════════════════════════════════════════════════════════

SHEETS_17MM = [
    # Sheet 1 — two side panels + two small doors
    (92.9, [
        (0, 0, 2000, 600, "L-01", True),
        (0, 604, 2000, 600, "L-01", True),
        (2004, 0, 386, 474, "S-05 R", False),
        (2004, 478, 386, 474, "S-05 R", False),
    ]),
    # Sheet 2 — two large doors
    (66.4, [
        (0, 0, 1994, 496, "L-06", True),
        (0, 500, 1994, 496, "L-06", True),
    ]),
    # Sheet 3 — top/bottom + small sides + small top/bottom
    (88.4, [
        (0, 0, 966, 600, "L-02", True),
        (970, 0, 480, 600, "S-01", False),
        (1454, 0, 746, 600, "S-02", False),
        (0, 604, 966, 600, "L-03", True),
        (970, 604, 480, 600, "S-01", False),
        (1454, 604, 746, 600, "S-03", False),
    ]),
    # Sheet 4 — shelves
    (70.9, [
        (0, 0, 966, 580, "L-04", True),
        (970, 0, 964, 580, "L-05", True),
        (0, 584, 964, 580, "L-05", True),
        (968, 584, 745, 580, "S-04", False),
    ]),
    # Sheet 5 — remaining adjustable shelves
    (37.6, [
        (0, 0, 964, 580, "L-05", True),
        (968, 0, 964, 580, "L-05", True),
    ]),
]

SHEET_4MM = [
    (76.9, [
        (0, 0, 1980, 980, "L-07", True),
        (1984, 0, 456, 760, "S-06", False),
    ]),
]


# ═══════════════════════════════════════════════════════════════════════════
#  TEXT CONTENT
# ═══════════════════════════════════════════════════════════════════════════

def get_texts(lang, cab_key):
    """Return all textual content for a cabinet in the given language."""
    is_he = lang == "he"
    is_large = cab_key == "large"
    cab = LARGE if is_large else SMALL
    H, W, D = cab["ext"]

    if is_large:
        name_en = "Large Pantry Cabinet"
        name_he = "ארון מזווה גדול"
        size_str = "2000 × 1000 × 600"
    else:
        name_en = "Small Pantry Cabinet"
        name_he = "ארון מזווה קטן"
        size_str = "480 × 780 × 600"

    title = name_he if is_he else name_en

    # ── Section 1: Assumptions ──
    if is_he:
        assumptions = [
            "בדוק ישרות קיר עם פלס 2 מטר. שמן מאחורי הארון אם יש סטייה מעל 3 מ\"מ.",
            "בדוק פלס רצפה לכל רוחב הארון. השתמש ברגליות מתכווננות.",
            "שתי האלכסונים של הגוף חייבים להיות שווים בסטייה של עד 2 מ\"מ לפני חיבור הגב.",
            "הארון הגדול חייב להיות מעוגן לקיר עם לפחות 2 זוויתניות L כבדות." if is_large else "אם הארון תלוי על הקיר — עגן היטב לקיר עם זוויתניות.",
            "כל מדף מתכוונן מתאים לעומס של עד 25 ק\"ג." if is_large else "ודא שהמשטח התומך מתחת יכול לשאת את משקל הארון.",
            "מד את עובי הסנדוויץ' בפועל — ייתכן סטייה של ±0.5 מ\"מ.",
            "הדבק קנטים לפני קדיחת כוסות צירים.",
            "כיוון סיבים: אנכי בדלתות ובלוחות צד.",
        ]
    else:
        assumptions = [
            "Check wall flatness with a 2 m straightedge. Shim if bow > 3 mm.",
            "Verify floor level across the full footprint. Use adjustable feet.",
            "Both diagonals must be equal within 2 mm before fixing back panel.",
            "Tall cabinet MUST be wall-secured with heavy-duty L-brackets." if is_large else "If wall-mounted, use heavy-duty L-brackets into studs.",
            "Each adjustable shelf rated for ≤ 25 kg." if is_large else "Ensure the support below can bear the cabinet weight.",
            "Measure actual sandwich plywood thickness — may vary ±0.5 mm.",
            "Apply edge banding before boring hinge cups.",
            "Run face grain vertically on side panels and doors.",
        ]

    # ── Section 4: Hinge boring ──
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

    # ── Section 5: Assembly ──
    if is_he:
        assembly = [
            "חתוך את כל החלקים לפי רשימת החיתוך.",
            "הדבק קנטים על כל הקצוות המסומנים. חתוך בגובה.",
            "סמן קווי מיקום על הפנים הפנימי של לוחות הצד: עליון/תחתון ומדף קבוע.",
            "קדח חורי פיילוט 3 מ\"מ דרך הפנים החיצוני של לוחות הצד.",
        ]
        if is_large:
            assembly.insert(3, "קדח עמודות פיני מדף על שני לוחות הצד (מערכת 32 מ\"מ).")
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
            "Apply edge banding to all marked edges. Trim flush.",
            "Mark layout lines on inner faces of side panels: top/bottom and fixed shelf positions.",
            "Pre-drill pilot holes (3 mm) through outer face of side panels.",
        ]
        if is_large:
            assembly.insert(3, "Drill shelf-pin columns on both side panels (32 mm system).")
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

    # ── Section 6: Shopping list ──
    if is_he:
        shopping_sheets = [
            ("סנדוויץ' 17 מ\"מ", "2440 × 1220", "5" if is_large else "3 (משותף)"),
            ("סנדוויץ' 4 מ\"מ", "2440 × 1220", "1 (משותף)"),
        ]
        shopping_hw = [
            ("ציר נסתר 110° סגירה שקטה", str(cab["hinges_total"])),
            ("פלטת ציר", str(cab["hinges_total"])),
            ("פין מדף 5 מ\"מ", str(cab["shelf_pins"])),
            ("ברגי מבנה 4.0×50 מ\"מ", str(cab["struct_screws"] + 20)),
            ("ברגי חומרה 3.5×16 מ\"מ", str(cab["hw_screws"])),
            ("ידיות", str(cab["handles"])),
            ("זוויתניות L", "4" if is_large else "2"),
            ("קנט PVC 22 מ\"מ", "20 מטר" if is_large else "10 מטר"),
        ]
    else:
        shopping_sheets = [
            ("17 mm sandwich plywood", "2440 × 1220", "5" if is_large else "3 (shared)"),
            ("4 mm sandwich plywood", "2440 × 1220", "1 (shared)"),
        ]
        shopping_hw = [
            ("110° concealed soft-close hinge", str(cab["hinges_total"])),
            ("Hinge mounting plate", str(cab["hinges_total"])),
            ("5 mm shelf pin", str(cab["shelf_pins"])),
            ("Structural screws 4.0×50 mm", str(cab["struct_screws"] + 20)),
            ("Hardware screws 3.5×16 mm", str(cab["hw_screws"])),
            ("Handles / pulls", str(cab["handles"])),
            ("Heavy-duty L-brackets", "4" if is_large else "2"),
            ("PVC edge banding 22 mm", "20 m" if is_large else "10 m"),
        ]

    # ── Section 8: Checklist ──
    if is_he:
        checklist = [
            "מדוד עובי סנדוויץ' בפועל עם קליבר.",
            "אמת מידות הגיליון לפני סימון.",
            "בדוק מרחק מרכז כוס ציר לפי דף הנתונים של היצרן.",
            "ודא שרוחב חיתוך המסור תואם ל-4 מ\"מ.",
            "סמן כל חלק עם מזהה (L-01…) מיד אחרי חיתוך.",
            "הרכב יבש לפני הברגה — ודא שהלוחות נכנסים בלי כוח.",
            "בדוק שעובי הקנט לא גורם לדלתות להתנגש.",
            "יישר עמודות פיני מדף עם מכוון קידוח.",
            "אתר עמודי קיר לפני עיגון.",
            "פרוס את כל החלקים על הרצפה ועבור על רצף ההרכבה לפני הדבקה/הברגה.",
        ]
    else:
        checklist = [
            "Measure actual sandwich plywood thickness with calipers.",
            "Verify sheet dimensions before layout.",
            "Confirm hinge cup center-to-edge from manufacturer datasheet.",
            "Check that saw kerf matches 4 mm allowance.",
            "Mark every part with its ID immediately after cutting.",
            "Dry-fit all joints before committing screws.",
            "Confirm edge banding won't cause door binding.",
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
    filename = os.path.join(cab_subdir, f"{cab_label}_Pantry_Cabinet_Plan_A_{suffix}.pdf")

    doc = create_doc(filename)

    sty = make_styles(is_he)
    s_title  = sty["title"]
    s_h1     = sty["h1"]
    s_h2     = sty["h2"]
    s_body   = sty["body"]
    s_small  = sty["small"]
    s_center = sty["center"]

    story = []

    def T(text):
        """Wrap Hebrew text for display."""
        if is_he:
            return heb(text)
        return text

    def add_heading(num, en_text, he_text):
        story.append(Paragraph(T(he_text) if is_he else en_text, s_h1))

    def add_subheading(en_text, he_text):
        story.append(Paragraph(T(he_text) if is_he else en_text, s_h2))

    def add_para(text):
        story.append(Paragraph(T(text) if is_he else text, s_body))

    def add_bullet_list(items):
        for i, item in enumerate(items, 1):
            txt = T(item) if is_he else item
            story.append(Paragraph(f"{i}. {txt}", s_body))

    def tbl(headers, rows, col_widths=None):
        return make_table(headers, rows, col_widths, is_he=is_he)

    # ── Page 1: Title + Specs ──
    # Title
    title_text = T(texts["title"]) if is_he else texts["title"]
    story.append(Paragraph(title_text, s_title))

    subtitle = T("תכנית בנייה מפורטת") if is_he else "Detailed Build Plan"
    story.append(Paragraph(subtitle, s_center))

    date_line = T(f"תאריך: אפריל 2026 | מידות: {texts['size_str']} מ\"מ") if is_he else \
                f"Date: April 2026 | Dimensions: {texts['size_str']} mm"
    story.append(Paragraph(date_line, s_center))
    story.append(Spacer(1, 8))

    # Context table
    if is_he:
        ctx_data = [
            [T("ערך"), T("פרמטר")],
            [T("ארון מזווה למטבח"), T("מיקום")],
            [T("ללא מסגרת (אירופאי)"), T("סגנון")],
            [T("סנדוויץ' 17 מ\"מ"), T("חומר גוף")],
            [T("סנדוויץ' 4 מ\"מ"), T("חומר גב")],
            [T("2440 × 1220 מ\"מ"), T("גודל גיליון")],
            [T("4 מ\"מ"), T("רוחב חיתוך מסור")],
            [T("3 מ\"מ חיצוני / 2 מ\"מ מרכזי"), T("מרווח דלת")],
        ]
    else:
        ctx_data = [
            ["Parameter", "Value"],
            ["Location", "Kitchen pantry wall"],
            ["Style", "Frameless / Euro"],
            ["Carcass material", "17 mm sandwich plywood"],
            ["Back material", "4 mm sandwich plywood"],
            ["Sheet size", "2440 × 1220 mm"],
            ["Saw kerf", "4 mm"],
            ["Door reveal", "3 mm outer / 2 mm center"],
        ]
    story.append(tbl(ctx_data[0], ctx_data[1:],
                     col_widths=[120, 350] if not is_he else [350, 120]))
    story.append(Spacer(1, 8))

    # ── Section 1: Assumptions ──
    add_heading(1, "1. Assumptions & Risk Checks", "1. הנחות ובדיקות סיכון")
    add_bullet_list(texts["assumptions"])
    story.append(Spacer(1, 4))

    # ── Section 2: Dimensions ──
    add_heading(2, "2. Dimension Summary", "2. סיכום מידות")
    H, W, D = cab["ext"]
    if is_he:
        dim_data = [
            [T("תוצאה"), T("חישוב"), T("מידה")],
            [f"{H} × {W} × {D}", T("נתון"), T("חיצוני ג×ר×ע")],
            [str(cab["int_w"]), f"{W} - 2×17", T("רוחב פנימי")],
            [str(cab["int_h"]), f"{H} - 2×17", T("גובה פנימי")],
            [str(cab["door_h"]), f"{H} - 3 - 3", T("גובה דלת")],
            [str(cab["door_w"]), f"({W} - 3 - 2 - 3) / 2", T("רוחב דלת")],
        ]
    else:
        dim_data = [
            ["Dimension", "Calculation", "Result"],
            ["External H × W × D", "Given", f"{H} × {W} × {D}"],
            ["Internal width", f"{W} − 2 × 17", str(cab["int_w"])],
            ["Internal height", f"{H} − 2 × 17", str(cab["int_h"])],
            ["Door height", f"{H} − 3 − 3", str(cab["door_h"])],
            ["Door width (each)", f"({W} − 3 − 2 − 3) / 2", str(cab["door_w"])],
        ]
    story.append(tbl(dim_data[0], dim_data[1:],
                            col_widths=[140, 180, 140] if not is_he else [140, 180, 140]))
    story.append(Spacer(1, 6))

    # ── Section 3: Cut List ──
    add_heading(3, "3. Cut List", "3. רשימת חיתוך")
    if is_he:
        cl_header = [T("קנט"), T("רוחב"), T("אורך"), T("עובי"), T("כמות"), T("חלק"), T("מזהה")]
        cl_rows = []
        for p in cab["parts"]:
            cl_rows.append([
                T(p[10]),  # edge band HE
                str(p[8]), str(p[7]), str(p[6]),
                str(p[3]),
                T(p[2]),  # name HE
                p[0],
            ])
        cw = [85, 55, 55, 35, 30, 85, 35]
    else:
        cl_header = ["ID", "Part", "Qty", "Thick", "Length", "Width", "Edge banding"]
        cl_rows = []
        for p in cab["parts"]:
            cl_rows.append([
                p[0], p[1], str(p[3]), str(p[6]),
                str(p[7]), str(p[8]), p[9],
            ])
        cw = [35, 85, 30, 35, 55, 55, 110]

    story.append(tbl(cl_header, cl_rows, col_widths=cw))
    story.append(Spacer(1, 4))

    # ── Section 4: Drilling & Boring ──
    story.append(PageBreak())
    add_heading(4, "4. Drilling & Boring Layout", "4. תרשים קידוח וצירים")
    add_bullet_list(texts["hinge_notes"])
    story.append(Spacer(1, 4))

    # ── Section 5: Assembly ──
    add_heading(5, "5. Assembly Sequence", "5. רצף הרכבה")
    add_bullet_list(texts["assembly"])
    story.append(Spacer(1, 4))

    # ── Section 6: Shopping List ──
    add_heading(6, "6. Materials & Hardware Shopping List", "6. רשימת קניות — חומרים וחומרה")
    add_subheading("Sheet Goods", "גיליונות")
    if is_he:
        sh_header = [T("כמות"), T("גודל"), T("פריט")]
        sh_rows = [[T(r[2]), T(r[1]), T(r[0])] for r in texts["shopping_sheets"]]
        sh_cw = [100, 120, 200]
    else:
        sh_header = ["Item", "Size", "Qty"]
        sh_rows = [[r[0], r[1], r[2]] for r in texts["shopping_sheets"]]
        sh_cw = [200, 120, 100]
    story.append(tbl(sh_header, sh_rows, col_widths=sh_cw))
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
    story.append(tbl(hw_header, hw_rows, col_widths=hw_cw))
    story.append(Spacer(1, 6))

    # ── Section 7: Cut Plan (drawings) ──
    story.append(PageBreak())
    add_heading(7, "7. Sheet Cut Plan", "7. תוכנית חיתוך גיליונות")
    note = T("גיליון 2440×1220 מ\"מ | קנה מידה 1:5 | כחול=ארון גדול | ירוק=ארון קטן") if is_he else \
           "Sheet 2440 × 1220 mm | Scale ~1:5 | Blue = Large cab | Green = Small cab"
    story.append(Paragraph(note, s_small))
    story.append(Spacer(1, 4))

    cut_scale = 0.19  # ~1:5.3 to fit on A4
    part_lookup = build_part_lookup(LARGE, SMALL)
    sheets_to_show = SHEETS_17MM if is_large else SHEETS_17MM  # show all for context
    for i, (yld, parts_layout) in enumerate(sheets_to_show, 1):
        drawing = draw_cut_sheet(parts_layout, 2440, 1220, cut_scale, i, yld, part_lookup=part_lookup)
        story.append(KeepTogether([drawing, Spacer(1, 4)]))

    add_subheading("4 mm Backer Sheet", "גיליון גב 4 מ\"מ")
    for i, (yld, parts_layout) in enumerate(SHEET_4MM, 1):
        drawing = draw_cut_sheet(parts_layout, 2440, 1220, cut_scale, 1, yld, part_lookup=part_lookup)
        story.append(drawing)
    story.append(Spacer(1, 6))

    # ── Section 8: Drawings ──
    story.append(PageBreak())
    add_heading(8, "8. Technical Drawings", "8. שרטוטים טכניים")

    # Choose scale based on cabinet size to fit page
    if is_large:
        view_scale = 0.22  # 1 mm = 0.22 px
    else:
        view_scale = 0.38  # 1 mm = 0.38 px

    # Front closed
    add_subheading("Front Elevation (doors closed)", "חזית (דלתות סגורות)")
    story.append(draw_front_closed(cab, view_scale))
    story.append(Spacer(1, 6))

    # Front open
    add_subheading("Front Elevation (open)", "חזית (פתוח)")
    story.append(draw_front_open(cab, view_scale))
    story.append(Spacer(1, 6))

    story.append(PageBreak())

    # Side elevation
    add_subheading("Side Elevation", "מבט צד")
    story.append(draw_side_elevation(cab, view_scale))
    story.append(Spacer(1, 6))

    # Top view
    add_subheading("Top View", "מבט עליון")
    story.append(draw_top_view(cab, view_scale))
    story.append(Spacer(1, 6))

    # Back elevation
    add_subheading("Back Elevation", "מבט אחורי")
    story.append(draw_back_elevation(cab, view_scale))
    story.append(Spacer(1, 6))

    story.append(PageBreak())

    # 3D isometric
    add_subheading("3D Isometric View", "מבט תלת-ממדי איזומטרי")
    iso_scale = 0.18 if is_large else 0.32
    story.append(draw_3d_isometric(cab, iso_scale))
    story.append(Spacer(1, 8))

    # ── Section 9: Verify checklist ──
    add_heading(9, "9. Verify Before Cutting", "9. בדוק לפני חיתוך")
    for i, item in enumerate(texts["checklist"], 1):
        prefix = "☐"
        txt = T(item) if is_he else item
        story.append(Paragraph(f"{prefix}  {txt}", s_body))

    # Build
    doc.build(story)
    print(f"  Created: {filename}")
    return filename


# ═══════════════════════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("Generating PDFs...")
    files = []
    for cab_key in ("large", "small"):
        for lang in ("en", "he"):
            f = build_pdf(lang, cab_key)
            files.append(f)
    print(f"\nDone. {len(files)} PDFs generated:")
    for f in files:
        print(f"  {os.path.basename(f)}")
