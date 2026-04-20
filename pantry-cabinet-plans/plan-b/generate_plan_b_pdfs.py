#!/usr/bin/env python3
"""Generate Plan B detailed PDF plans for Large and Small pantry cabinets.

Plan B: Depth reduced 600 → 404 mm, sandwich plywood throughout,
        4 sheets of 17 mm instead of 5.
Each cabinet gets its own PDF in both English and Hebrew (4 PDFs total).
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
    make_catalog_cover, make_product_card, make_feature_callout,
    make_divider, make_plan_badge, make_edition_footer,
)

# ── Paths ──────────────────────────────────────────────────────────────────
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
register_fonts()


# ═══════════════════════════════════════════════════════════════════════════
#  DATA  — Plan B (depth 404 mm, sandwich plywood)
# ═══════════════════════════════════════════════════════════════════════════

DEPTH = 404
SHELF_DEPTH = DEPTH - 20  # 384

LARGE = {
    "ext": (2000, 1000, DEPTH),
    "int_w": 966, "int_h": 1966, "int_d": DEPTH,
    "parts": [
        # (ID, name_en, name_he, qty, mat_en, mat_he, thick, length, width, edge_en, edge_he)
        ("L-01", "Side panel",      "לוח צד",        2, "Sandwich plywood","סנדוויץ'", 17, 2000, 404,
         "None (storage)",  "ללא (מחסן)"),
        ("L-02", "Top panel",       "לוח עליון",      1, "Sandwich plywood","סנדוויץ'", 17,  966, 404,
         "None (storage)",  "ללא (מחסן)"),
        ("L-03", "Bottom panel",    "לוח תחתון",      1, "Sandwich plywood","סנדוויץ'", 17,  966, 404,
         "None (storage)",  "ללא (מחסן)"),
        ("L-04", "Fixed shelf",     "מדף קבוע",       1, "Sandwich plywood","סנדוויץ'", 17,  966, 384,
         "None (storage)",  "ללא (מחסן)"),
        ("L-05", "Adjustable shelf","מדף מתכוונן",    4, "Sandwich plywood","סנדוויץ'", 17,  964, 384,
         "None (storage)",  "ללא (מחסן)"),
        ("L-06", "Door",            "דלת",            2, "Sandwich plywood","סנדוויץ'", 17, 1994, 496,
         "Optional 4 edges","אופציונלי 4 צדדים"),
        ("L-07", "Back panel",      "לוח גב",         1, "Sandwich plywood", "סנדוויץ'", 4, 1980, 980,
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
        ("S-01", "Side panel",   "לוח צד",      2, "Sandwich plywood","סנדוויץ'", 17,  480, 404,
         "None (storage)",  "ללא (מחסן)"),
        ("S-02", "Top panel",    "לוח עליון",    1, "Sandwich plywood","סנדוויץ'", 17,  746, 404,
         "None (storage)",  "ללא (מחסן)"),
        ("S-03", "Bottom panel", "לוח תחתון",    1, "Sandwich plywood","סנדוויץ'", 17,  746, 404,
         "None (storage)",  "ללא (מחסן)"),
        ("S-04", "Fixed shelf",  "מדף קבוע",     1, "Sandwich plywood","סנדוויץ'", 17,  745, 384,
         "None (storage)",  "ללא (מחסן)"),
        ("S-05", "Door",         "דלת",          2, "Sandwich plywood","סנדוויץ'", 17,  474, 386,
         "Optional 4 edges","אופציונלי 4 צדדים"),
        ("S-06", "Back panel",   "לוח גב",       1, "Sandwich plywood", "סנדוויץ'", 4,  456, 760,
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
            "מד את עובי הסנדוויץ' בפועל — ייתכן סטייה של ±0.5 מ\"מ.",
            "גם בסנדוויץ' מומלץ לקדוח חורי פיילוט 3 מ\"מ לפני כל בורג לדיוק וניקיון.",
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
            "Measure actual sandwich plywood thickness — may vary ±0.5 mm.",
            "Pre-drill 3 mm pilot holes before screwing for cleaner alignment and edge control.",
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
            ("סנדוויץ' 17 מ\"מ", "2440 × 1220", "4 גיליונות (משותף)"),
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
        ]
    else:
        shopping_sheets = [
            ("17 mm sandwich plywood", "2440 × 1220",
             "4 sheets (shared)"),
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
        ]

    # ── Checklist ──
    if is_he:
        checklist = [
            "מדוד עובי סנדוויץ' בפועל עם קליבר.",
            "אמת מידות הגיליון לפני סימון.",
            "בדוק מרחק מרכז כוס ציר לפי דף הנתונים של היצרן.",
            "ודא שרוחב חיתוך המסור תואם ל-4 מ\"מ.",
            "סמן כל חלק עם מזהה (L-01…) מיד אחרי חיתוך.",
            "הרכב יבש לפני הברגה — ודא שהלוחות נכנסים בלי כוח.",
            "קדח פיילוט לפני כל בורג לקבלת חיבור נקי ומדויק.",
            "יישר עמודות פיני מדף עם מכוון קידוח.",
            "אתר עמודי קיר לפני עיגון.",
            "פרוס את כל החלקים על הרצפה ועבור על רצף ההרכבה לפני הברגה.",
        ]
    else:
        checklist = [
            "Measure actual sandwich plywood thickness with calipers.",
            "Verify sheet dimensions before layout.",
            "Confirm hinge cup center-to-edge from manufacturer datasheet.",
            "Check that saw kerf matches 4 mm allowance.",
            "Mark every part with its ID immediately after cutting.",
            "Dry-fit all joints before committing screws.",
            "Pre-drill all pilot holes for cleaner assembly and more accurate screw tracking.",
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
        cab_subdir, f"{cab_label}_Pantry_Cabinet_Plan_B_{suffix}.pdf")

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
        return heb(text) if is_he else text

    def add_heading(num, en_text, he_text):
        story.append(Paragraph(T(he_text) if is_he else en_text, s_h1))

    def add_subheading(en_text, he_text):
        story.append(Paragraph(T(he_text) if is_he else en_text, s_h2))

    def add_bullet_list(items):
        for i, item in enumerate(items, 1):
            story.append(Paragraph(f"{i}. {T(item) if is_he else item}", s_body))

    def tbl(h, r, cw=None):
        return make_table(h, r, cw, is_he=is_he)

    # ────────────────────────────────────────────────────────────────────
    # PAGE 1 — Catalog cover
    # ────────────────────────────────────────────────────────────────────
    H, W, D = cab["ext"]
    story.extend(make_catalog_cover(
        T(texts["title"]) if is_he else texts["title"],
        T("מהדורת קטלוג מאוזנת עם עומק חסכוני") if is_he else "Balanced catalog edition with reduced depth",
        T(f"אפריל 2026 | תוכנית ב' | מידות חיצוניות: {H}×{W}×{D} מ\"מ") if is_he else f"April 2026 | Plan B | External: {H} x {W} x {D} mm",
        T("הגרסה המאוזנת: פחות גיליונות, אותה משפחת חומר, ועדיין עומק נוח למרבית פריטי המזווה.") if is_he else "The balanced edition: fewer sheets, the same sandwich-wood material family, and still enough depth for everyday pantry storage.",
        [
            (T("עומק") if is_he else "Depth", f"{D} mm"),
            (T("גיליונות 17 מ\"מ") if is_he else "17 mm sheets", "4"),
            (T("חיסכון") if is_he else "Saving", T("גיליון אחד") if is_he else "1 sheet less"),
        ],
        sty,
        is_he=is_he,
        eyebrow=T("קולקציית ארונות מזווה") if is_he else "PANTRY CABINET COLLECTION",
    ))
    story.append(make_plan_badge(
        "B",
        T("תוכנית ב' — מהדורת איזון עלות") if is_he else "Plan B — Balanced Cost Edition",
        sty, is_he=is_he,
    ))
    story.extend(make_divider())

    story.append(make_product_card(
        T("כרטיס מוצר") if is_he else "Product Card",
        T("פתרון מאוזן לאחסון יומיומי כאשר רוצים לחסוך גיליון בלי לשנות את משפחת החומר.") if is_he else "A pragmatic configuration for daily storage when you want to save one sheet without changing the material family.",
        [
            (T("פרופיל") if is_he else "Profile", T("ארון גבוה") if is_he and is_large else (T("יחידה עליונה") if is_he else ("Tall cabinet" if is_large else "Upper unit"))),
            (T("חומר גוף") if is_he else "Carcass material", T("סנדוויץ'") if is_he else "Sandwich plywood"),
            (T("עומק מדף") if is_he else "Shelf depth", str(D - 20)),
            (T("דלתות") if is_he else "Door program", f"2 x {cab['door_h']} x {cab['door_w']}"),
        ],
        T("מומלץ כאשר נדרש איזון בין עומק פרקטי לבין חיסכון בגיליונות, בלי לעבור לחומר אחר.") if is_he else "Best when you want a practical cabinet that gives up some depth in exchange for lower sheet count, not a different board type.",
        sty,
        is_he=is_he,
    ))
    story.append(Spacer(1, 8))
    story.append(make_feature_callout(
        T("קריאות תוכנית") if is_he else "Plan Callouts",
        [
            T("עומק 404 מ\"מ עדיין מתאים לצנצנות, קופסאות, ושימוש מחסן יומיומי.") if is_he else "404 mm depth still supports jars, cans, cereal boxes, and daily storage use.",
            T("כל החלקים נשארים בסנדוויץ', כך שמאפייני העבודה והגימור נשארים עקביים עם תוכנית א'.") if is_he else "All parts stay in sandwich plywood, so cutting, fastening, and finishing stay aligned with Plan A.",
            T("ויתור על קנטים ברוב הגוף מפשט זמן עבודה ומקטין עלות משלימה.") if is_he else "Leaving most carcass edges raw reduces labor time and avoids unnecessary finishing cost.",
        ],
        sty,
        is_he=is_he,
    ))
    story.append(Spacer(1, 6))
    story.append(make_edition_footer(
        T("מהדורת קטלוג אפריל 2026 · תוכנית ב' · RajwanYair/WoodworkingShop")
        if is_he else
        "Catalog Edition April 2026 · Plan B · RajwanYair/WoodworkingShop",
        sty,
    ))
    story.append(PageBreak())

    # Context table
    if is_he:
        ctx_data = [
            [T("ערך"), T("פרמטר")],
            [T("חדר מחסן"), T("מיקום")],
            [T("ללא מסגרת (אירופאי)"), T("סגנון")],
            [T("סנדוויץ' 17 מ\"מ"), T("חומר גוף")],
            [T("סנדוויץ' 4 מ\"מ"), T("חומר גב")],
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
            ["Carcass material", "17 mm sandwich plywood"],
            ["Back material", "4 mm sandwich plywood"],
            ["Sheet size", "2440 × 1220 mm"],
            ["Saw kerf", "4 mm"],
            ["Door reveal", "3 mm outer / 2 mm center"],
            ["Depth", f"{D} mm (reduced from 600 mm in Plan A)"],
            ["Sheets required", "4 sheets 17 mm + 1 backer 4 mm"],
        ]
    story.append(tbl(
        ctx_data[0], ctx_data[1:],
        [120, 350] if not is_he else [350, 120]))
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
    story.append(tbl(
        dim_data[0], dim_data[1:],
        [140, 180, 140]))
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

    story.append(tbl(cl_header, cl_rows, cw))
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
    story.append(tbl(sh_header, sh_rows, sh_cw))
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
    story.append(tbl(hw_header, hw_rows, hw_cw))
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
    part_lookup = build_part_lookup(LARGE, SMALL)
    for i, (yld, parts_layout) in enumerate(SHEETS_17MM, 1):
        drawing = draw_cut_sheet(parts_layout, 2440, 1220, cut_scale, i, yld, part_lookup=part_lookup)
        story.append(KeepTogether([drawing, Spacer(1, 4)]))

    add_subheading("4 mm Backer Sheet", "גיליון גב 4 מ\"מ")
    for i, (yld, parts_layout) in enumerate(SHEET_4MM, 1):
        drawing = draw_cut_sheet(parts_layout, 2440, 1220, cut_scale, 1, yld, part_lookup=part_lookup)
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
