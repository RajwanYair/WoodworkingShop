#!/usr/bin/env python3
"""Generate Plan C combined PDF — both cabinets in one document, EN + HE.

Plan C: Depth 368 mm · 3 sheets of 17 mm sandwich plywood · 82.5 % yield
Co-nests door strips (496) + depth strips (368) + shelf strips (348)
on the same sheet: 496 + 4 + 368 + 4 + 348 = 1220 mm exactly.
"""

import os
import sys

from reportlab.platypus import Paragraph, Spacer, PageBreak, KeepTogether

# Add shared module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from shared.pdf_utils import (
    build_part_lookup, register_fonts, heb, make_table, make_styles, create_doc,
    draw_front_closed, draw_front_open, draw_side_elevation,
    draw_top_view, draw_3d_isometric, draw_cut_sheet,
    make_catalog_cover, make_product_card, make_feature_callout,
)

# ── Paths ──────────────────────────────────────────────────────────────────
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
register_fonts()

# ═══════════════════════════════════════════════════════════════════════════
#  DATA — Plan C  (depth 368 mm)
# ═══════════════════════════════════════════════════════════════════════════

DEPTH = 368
SD    = 348   # shelf depth = 368 − 20

LARGE = {
    "tag": "large",
    "ext": (2000, 1000, DEPTH),
    "int_w": 966, "int_h": 1966, "int_d": DEPTH,
    "parts": [
        ("L-01","Side panel","לוח צד",2,"Sandwich plywood","סנדוויץ'",17,2000,DEPTH,
         "None","ללא"),
        ("L-02","Top panel","לוח עליון",1,"Sandwich plywood","סנדוויץ'",17,966,DEPTH,
         "None","ללא"),
        ("L-03","Bottom panel","לוח תחתון",1,"Sandwich plywood","סנדוויץ'",17,966,DEPTH,
         "None","ללא"),
        ("L-04","Fixed shelf","מדף קבוע",1,"Sandwich plywood","סנדוויץ'",17,966,SD,
         "None","ללא"),
        ("L-05","Adjustable shelf","מדף מתכוונן",4,"Sandwich plywood","סנדוויץ'",17,964,SD,
         "None","ללא"),
        ("L-06","Door","דלת",2,"Sandwich plywood","סנדוויץ'",17,1994,496,
         "Optional 4 edges","אופציונלי 4 צדדים"),
        ("L-07","Back panel","לוח גב",1,"Sandwich plywood","סנדוויץ'",4,1980,980,
         "None","ללא"),
    ],
    "hinges_total": 8, "hinges_per_door": 4,
    "hinge_positions": [100, 698, 1296, 1894],
    "shelf_pins": 16, "struct_screws": 36, "hw_screws": 40, "handles": 2,
    "door_h": 1994, "door_w": 496,
}

SMALL = {
    "tag": "small",
    "ext": (480, 780, DEPTH),
    "int_w": 746, "int_h": 446, "int_d": DEPTH,
    "parts": [
        ("S-01","Side panel","לוח צד",2,"Sandwich plywood","סנדוויץ'",17,480,DEPTH,
         "None","ללא"),
        ("S-02","Top panel","לוח עליון",1,"Sandwich plywood","סנדוויץ'",17,746,DEPTH,
         "None","ללא"),
        ("S-03","Bottom panel","לוח תחתון",1,"Sandwich plywood","סנדוויץ'",17,746,DEPTH,
         "None","ללא"),
        ("S-04","Fixed shelf","מדף קבוע",1,"Sandwich plywood","סנדוויץ'",17,745,SD,
         "None","ללא"),
        ("S-05","Door","דלת",2,"Sandwich plywood","סנדוויץ'",17,474,386,
         "Optional 4 edges","אופציונלי 4 צדדים"),
        ("S-06","Back panel","לוח גב",1,"Sandwich plywood","סנדוויץ'",4,456,760,
         "None","ללא"),
    ],
    "hinges_total": 4, "hinges_per_door": 2,
    "hinge_positions": [80, 394],
    "shelf_pins": 4, "struct_screws": 30, "hw_screws": 20, "handles": 2,
    "door_h": 474, "door_w": 386,
}

# Aliases for shorter names used in Plan C build_pdf
draw_side = draw_side_elevation
draw_top  = draw_top_view
draw_3d   = draw_3d_isometric

# ═══════════════════════════════════════════════════════════════════════════
#  CUT PLAN LAYOUTS — Plan C  (3 sheets of 17 mm)
# ═══════════════════════════════════════════════════════════════════════════

# Sheet 1: 496 + 4 + 368 + 4 + 348 = 1220
#   Strip 1 (496, y=0):   L-06 (1994×496) + S-05 rotated (386×474 in offcut)
#   Strip 2 (368, y=500): L-01 (2000×368)
#   Strip 3 (348, y=872): L-05 ×2 (964+4+964 = 1932)
SHEET1 = (86.6, [
    (0,    0,   1994, 496, "L-06",  True),
    (1998, 0,   386,  474, "S-05",  False),
    (0,    500, 2000, 368, "L-01",  True),
    (0,    872, 964,  348, "L-05",  True),
    (968,  872, 964,  348, "L-05",  True),
])

# Sheet 2: same strip widths
#   Strip 1 (496): L-06 + S-05
#   Strip 2 (368): L-01
#   Strip 3 (348): L-05 + S-04
SHEET2 = (84.1, [
    (0,    0,   1994, 496, "L-06",  True),
    (1998, 0,   386,  474, "S-05",  False),
    (0,    500, 2000, 368, "L-01",  True),
    (0,    872, 964,  348, "L-05",  True),
    (968,  872, 745,  348, "S-04",  False),
])

# Sheet 3: 368 + 4 + 368 + 4 + 348 = 1092 (128 mm waste)
#   Strip 1 (368): L-02 + L-03 + S-01  = 2420
#   Strip 2 (368): S-01 + S-02 + S-03  = 1980
#   Strip 3 (348): L-04 + L-05         = 1934
SHEET3 = (76.8, [
    (0,    0,   966,  368, "L-02",  True),
    (970,  0,   966,  368, "L-03",  True),
    (1940, 0,   480,  368, "S-01",  False),
    (0,    372, 480,  368, "S-01",  False),
    (484,  372, 746,  368, "S-02",  False),
    (1234, 372, 746,  368, "S-03",  False),
    (0,    744, 966,  348, "L-04",  True),
    (970,  744, 964,  348, "L-05",  True),
])

SHEETS_17MM = [SHEET1, SHEET2, SHEET3]

SHEET_4MM = [(76.9, [
    (0,    0, 1980, 980, "L-07", True),
    (1984, 0, 456,  760, "S-06", False),
])]

# ═══════════════════════════════════════════════════════════════════════════
#  PDF BUILDER
# ═══════════════════════════════════════════════════════════════════════════

def build_pdf(lang):
    is_he = lang == "he"
    T = (lambda t: heb(t)) if is_he else (lambda t: t)

    filename = os.path.join(OUT_DIR,
        f"Double_Pantry_Cabinet_Plan_C_{'HE' if is_he else 'EN'}.pdf")
    doc = create_doc(filename)

    sty = make_styles(is_he)
    s_title  = sty["title"]
    s_h1     = sty["h1"]
    s_h2     = sty["h2"]
    s_body   = sty["body"]
    s_small  = sty["small"]
    s_ctr    = sty["center"]

    story = []
    H1 = lambda en, he: story.append(Paragraph(T(he) if is_he else en, s_h1))
    H2 = lambda en, he: story.append(Paragraph(T(he) if is_he else en, s_h2))
    P  = lambda en, he: story.append(Paragraph(T(he) if is_he else en, s_body))

    def bullets(items):
        for i, (en, he) in enumerate(items, 1):
            story.append(Paragraph(f"{i}. {T(he) if is_he else en}", s_body))

    def tbl(headers, rows, cw=None):
        return make_table(headers, rows, cw, is_he=is_he)

    # ── PAGE 1 — Title + Overview ──────────────────────────────────────
    story.extend(make_catalog_cover(
        T("ארונות מזווה כפולים — תוכנית ג'") if is_he else "Double Pantry Cabinets — Plan C",
        T("מהדורת קטלוג אופטימלית עם מספר גיליונות מינימלי") if is_he else "Maximum-optimisation catalog edition with the leanest sheet count",
        T("אפריל 2026 | תוכנית ג' | 3 גיליונות בלבד") if is_he else "April 2026 | Plan C | Only 3 structural sheets",
        T("הגרסה החכמה ביותר בפריסה: שילוב רצועות חיתוך שמבטל גיליון שלם תוך שמירה על סנדוויץ' בכל החלקים.") if is_he else "The leanest version in the collection, engineered around smarter strip nesting so a whole sheet disappears while all parts remain sandwich plywood.",
        [
            (T("עומק") if is_he else "Depth", f"{DEPTH} mm"),
            (T("גיליונות 17 מ\"מ") if is_he else "17 mm sheets", "3"),
            (T("ניצולת") if is_he else "Yield", "82.5 %"),
        ],
        sty,
        is_he=is_he,
        eyebrow=T("קולקציית ארונות מזווה") if is_he else "PANTRY CABINET COLLECTION",
    ))
    story.append(make_product_card(
        T("כרטיס קולקציה") if is_he else "Collection Card",
        T("שני הארונות נשמרים בגובה וברוחב המקוריים, אך עומק הגוף מותאם למיקסום חומר.") if is_he else "Both cabinets keep the original height and width, but the body depth is tuned specifically for strip-based sheet optimisation.",
        [
            (T("ארון גדול") if is_he else "Large cabinet", f"2000 x 1000 x {DEPTH}"),
            (T("ארון קטן") if is_he else "Small cabinet", f"480 x 780 x {DEPTH}"),
            (T("חומר גוף") if is_he else "Carcass material", T("סנדוויץ'") if is_he else "Sandwich plywood"),
            (T("עומק מדף") if is_he else "Shelf depth", str(SD)),
        ],
        T("מומלץ כאשר מספר הגיליונות ופשטות הרכש חשובים יותר מעומק אחסון מלא, בלי לשנות את החומר.") if is_he else "Best when total sheet count and sourcing simplicity matter more than maximum pantry depth, without changing the material family.",
        sty,
        is_he=is_he,
    ))
    story.append(Spacer(1, 8))
    story.append(make_feature_callout(
        T("קריאות אופטימיזציה") if is_he else "Optimisation Callouts",
        [
            T("שילוב רצועת דלת, רצועת עומק ורצועת מדף על אותו גיליון מייצר חיסכון אמיתי של גיליון שלם.") if is_he else "Combining door, depth, and shelf strips on the same sheet removes an entire structural sheet from the plan.",
            T("עומק 368 מ\"מ מתאים במיוחד למחסן, חדר שירות, או שימוש שבו קומפקטיות עדיפה על קיבולת מרבית.") if is_he else "368 mm depth is best suited to storage rooms and service zones where compactness beats maximum capacity.",
            T("פחות גיליונות משמע פחות שינוע, פחות אחסון זמני, ופחות בלבול בשטח העבודה.") if is_he else "Fewer sheets mean less transport, less temporary storage, and a cleaner workshop flow.",
        ],
        sty,
        is_he=is_he,
    ))
    story.append(PageBreak())

    # Comparison table
    if is_he:
        comp_h = [T("תוכנית ג'"), T("תוכנית ב'"), T("תוכנית א'"), T("פרמטר")]
        comp_r = [
            [T("368 מ\"מ"), T("404 מ\"מ"), T("600 מ\"מ"), T("עומק")],
            [T("3"), T("4"), T("5"), T("גיליונות 17 מ\"מ")],
            [T("82.5%"), T("66.1%"), T("71.2%"), T("ניצולת")],
            [T("סנדוויץ'"), T("סנדוויץ'"), T("סנדוויץ'"), T("חומר")],
            [T("ללא (מחסן)"), T("ללא (מחסן)"), T("כן — 30 מטר"), T("קנטים")],
        ]
        comp_cw = [90, 90, 90, 100]
    else:
        comp_h = ["Parameter", "Plan A", "Plan B", "Plan C"]
        comp_r = [
            ["Depth", "600 mm", "404 mm", "368 mm"],
            ["17 mm sheets", "5", "4", "3"],
            ["Yield", "71.2 %", "66.1 %", "82.5 %"],
            ["Material", "Sandwich plywood", "Sandwich plywood", "Sandwich plywood"],
            ["Edge banding", "Yes — 30 m", "None", "None"],
        ]
        comp_cw = [100, 90, 90, 90]
    story.append(tbl(comp_h, comp_r, comp_cw))
    story.append(Spacer(1, 6))

    P("The key trick: co-nest the 496 mm door strip alongside a 368 mm depth strip "
      "and a 348 mm shelf strip on the same sheet — 496 + 4 + 368 + 4 + 348 = 1220 mm exactly. "
      "This eliminates the dedicated door sheet that wasted 33 % of its area in Plans A/B.",
      "הטריק המרכזי: חיתוך רצועת דלת (496 מ\"מ) יחד עם רצועת עומק (368 מ\"מ) "
      "ורצועת מדף (348 מ\"מ) מאותו גיליון — 496 + 4 + 368 + 4 + 348 = 1220 מ\"מ בדיוק. "
      "זה מבטל את גיליון הדלתות הייעודי שבזבז 33% משטחו בתוכניות א'/ב'.")
    story.append(Spacer(1, 4))

    # Context table
    if is_he:
        ctx_h = [T("ערך"), T("פרמטר")]
        ctx_r = [
            [T("חדר מחסן"), T("מיקום")],
            [T("ללא מסגרת (אירופאי)"), T("סגנון")],
            [T("סנדוויץ' 17 מ\"מ"), T("חומר גוף")],
            [T("סנדוויץ' 4 מ\"מ"), T("חומר גב")],
            [T("2440 × 1220 מ\"מ"), T("גודל גיליון")],
            [T("4 מ\"מ"), T("רוחב חיתוך מסור")],
            [T(f"ארון גדול: 2000×1000×{DEPTH} | ארון קטן: 480×780×{DEPTH}"), T("מידות חיצוניות (ג×ר×ע)")],
        ]
        ctx_cw = [280, 120]
    else:
        ctx_h = ["Parameter", "Value"]
        ctx_r = [
            ["Location", "Storage room"],
            ["Style", "Frameless / Euro"],
            ["Carcass material", "17 mm sandwich plywood"],
            ["Back material", "4 mm sandwich plywood"],
            ["Sheet size", "2440 × 1220 mm"],
            ["Saw kerf", "4 mm"],
            [f"External dims (H×W×D)", f"Large: 2000×1000×{DEPTH} | Small: 480×780×{DEPTH}"],
        ]
        ctx_cw = [120, 310]
    story.append(tbl(ctx_h, ctx_r, ctx_cw))
    story.append(Spacer(1, 6))

    # ── §1 Assumptions ──────────────────────────────────────────────────
    H1("1. Assumptions & Risk Checks", "1. הנחות ובדיקות סיכון")
    bullets([
        ("Check wall flatness with a 2 m straightedge. Shim if bow > 3 mm.",
         "בדוק ישרות קיר עם פלס 2 מטר. שמן מאחורי הארון אם יש סטייה מעל 3 מ\"מ."),
        ("Verify floor level. Use adjustable feet.",
         "בדוק פלס רצפה. השתמש ברגליות מתכווננות."),
        ("Both diagonals must be equal within 2 mm before fixing back panel.",
         "שתי האלכסונים חייבים להיות שווים בסטייה של עד 2 מ\"מ לפני חיבור הגב."),
        ("Tall cabinet MUST be wall-secured with heavy-duty L-brackets.",
         "הארון הגדול חייב להיות מעוגן לקיר עם לפחות 2 זוויתניות L כבדות."),
        ("Pre-drill 3 mm pilot holes for cleaner screw tracking and edge control.",
         "קדח חורי פיילוט 3 מ\"מ לקבלת הברגה נקייה ושליטה טובה יותר בקצה."),
        ("Measure actual sandwich plywood thickness — may vary ±0.5 mm.",
         "מד את עובי הסנדוויץ' בפועל — ייתכן סטייה של ±0.5 מ\"מ."),
        ("Storage room — edge banding optional (doors only if desired).",
         "מיקום: חדר מחסן — אין צורך בקנטים (אלא אם רוצים בדלתות)."),
        (f"Depth {DEPTH} mm ≈ 37 cm — adequate for cans, jars, bottles, cereal boxes.",
         f"עומק {DEPTH} מ\"מ ≈ 37 ס\"מ — מתאים לשימורים, צנצנות, בקבוקים, קופסאות דגנים."),
    ])

    # ── §2 Large Cabinet Dimensions ─────────────────────────────────────
    story.append(PageBreak())
    H1("2. Large Cabinet — 2000 × 1000 × 368", "2. ארון גדול — 2000 × 1000 × 368")

    cab = LARGE; H_c, W_c, D_c = cab["ext"]
    if is_he:
        dim_h = [T("תוצאה"), T("חישוב"), T("מידה")]
        dim_r = [
            [f"{H_c}×{W_c}×{D_c}", T("נתון"), T("חיצוני ג×ר×ע")],
            [str(cab["int_w"]), f"{W_c}-2×17", T("רוחב פנימי")],
            [str(cab["int_h"]), f"{H_c}-2×17", T("גובה פנימי")],
            [str(D_c), T("נתון"), T("עומק פנימי")],
            [str(cab["door_h"]), f"{H_c}-3-3", T("גובה דלת")],
            [str(cab["door_w"]), f"({W_c}-3-2-3)/2", T("רוחב דלת")],
            [str(SD), f"{D_c}-20", T("עומק מדף")],
        ]
    else:
        dim_h = ["Dimension", "Calculation", "Result"]
        dim_r = [
            ["External H×W×D", "Given", f"{H_c}×{W_c}×{D_c}"],
            ["Internal width", f"{W_c}−2×17", str(cab["int_w"])],
            ["Internal height", f"{H_c}−2×17", str(cab["int_h"])],
            ["Internal depth", "Given", str(D_c)],
            ["Door height", f"{H_c}−3−3", str(cab["door_h"])],
            ["Door width (each)", f"({W_c}−3−2−3)/2", str(cab["door_w"])],
            ["Shelf depth", f"{D_c}−20", str(SD)],
        ]
    story.append(tbl(dim_h, dim_r, [140, 160, 140]))
    story.append(Spacer(1, 4))

    # Large cut list
    H2("Cut List — Large Cabinet", "רשימת חיתוך — ארון גדול")
    if is_he:
        cl_h = [T("קנט"), T("רוחב"), T("אורך"), T("עובי"), T("כמות"), T("חלק"), T("מזהה")]
        cl_r = [[T(p[10]),str(p[8]),str(p[7]),str(p[6]),str(p[3]),T(p[2]),p[0]]
                for p in cab["parts"]]
        cl_cw = [75,55,55,35,30,85,35]
    else:
        cl_h = ["ID","Part","Qty","Thick","Length","Width","Edge band"]
        cl_r = [[p[0],p[1],str(p[3]),str(p[6]),str(p[7]),str(p[8]),p[9]]
                for p in cab["parts"]]
        cl_cw = [35,95,30,35,55,55,80]
    story.append(tbl(cl_h, cl_r, cl_cw))

    # ── §3 Small Cabinet Dimensions ─────────────────────────────────────
    story.append(Spacer(1, 8))
    H1("3. Small Cabinet — 480 × 780 × 368", "3. ארון קטן — 480 × 780 × 368")

    cab = SMALL; H_c, W_c, D_c = cab["ext"]
    if is_he:
        dim_r = [
            [f"{H_c}×{W_c}×{D_c}", T("נתון"), T("חיצוני ג×ר×ע")],
            [str(cab["int_w"]), f"{W_c}-2×17", T("רוחב פנימי")],
            [str(cab["int_h"]), f"{H_c}-2×17", T("גובה פנימי")],
            [str(D_c), T("נתון"), T("עומק פנימי")],
            [str(cab["door_h"]), f"{H_c}-3-3", T("גובה דלת")],
            [str(cab["door_w"]), f"({W_c}-3-2-3)/2", T("רוחב דלת")],
            [str(SD), f"{D_c}-20", T("עומק מדף")],
        ]
    else:
        dim_r = [
            ["External H×W×D", "Given", f"{H_c}×{W_c}×{D_c}"],
            ["Internal width", f"{W_c}−2×17", str(cab["int_w"])],
            ["Internal height", f"{H_c}−2×17", str(cab["int_h"])],
            ["Internal depth", "Given", str(D_c)],
            ["Door height", f"{H_c}−3−3", str(cab["door_h"])],
            ["Door width (each)", f"({W_c}−3−2−3)/2", str(cab["door_w"])],
            ["Shelf depth", f"{D_c}−20", str(SD)],
        ]
    story.append(tbl(dim_h, dim_r, [140, 160, 140]))
    story.append(Spacer(1, 4))

    H2("Cut List — Small Cabinet", "רשימת חיתוך — ארון קטן")
    if is_he:
        cl_r = [[T(p[10]),str(p[8]),str(p[7]),str(p[6]),str(p[3]),T(p[2]),p[0]]
                for p in cab["parts"]]
    else:
        cl_r = [[p[0],p[1],str(p[3]),str(p[6]),str(p[7]),str(p[8]),p[9]]
                for p in cab["parts"]]
    story.append(tbl(cl_h, cl_r, cl_cw))

    # ── §4 Combined Cut List ────────────────────────────────────────────
    story.append(PageBreak())
    H1("4. Combined Cut List (both cabinets — 20 parts)",
       "4. רשימת חיתוך משולבת (שני הארונות — 20 חלקים)")

    all_parts = LARGE["parts"] + SMALL["parts"]
    total_17 = sum(p[7]*p[8]*p[3] for p in all_parts if p[6] == 17)
    total_4  = sum(p[7]*p[8]*p[3] for p in all_parts if p[6] == 4)

    if is_he:
        ac_h = [T("שטח כולל"), T("שטח/יח'"), T("רוחב"), T("אורך"), T("עובי"), T("כמות"), T("חלק"), T("מזהה")]
        ac_r = []
        for p in all_parts:
            a = p[7]*p[8]; ta = a*p[3]
            ac_r.append([f"{ta:,}", f"{a:,}", str(p[8]), str(p[7]), str(p[6]),
                         str(p[3]), T(p[2]), p[0]])
        ac_cw = [65,60,45,45,30,25,75,30]
    else:
        ac_h = ["ID","Part","Qty","Thick","Length","Width","Area/pc","Total area"]
        ac_r = []
        for p in all_parts:
            a = p[7] * p[8]
            ta = a * p[3]
            ac_r.append([p[0], p[1], str(p[3]), str(p[6]),
                         str(p[7]), str(p[8]), f"{a:,}", f"{ta:,}"])
        ac_cw = [30,75,25,30,45,45,60,65]
    story.append(tbl(ac_h, ac_r, ac_cw))
    story.append(Spacer(1, 4))

    P(f"17 mm sandwich plywood net area: {total_17:,} mm² ≈ {total_17/1e6:.2f} m²",
      f"שטח סנדוויץ' 17 מ\"מ נטו: {total_17:,} ממ\"ר ≈ {total_17/1e6:.2f} מ\"ר")
    P(f"4 mm sandwich plywood net area: {total_4:,} mm² ≈ {total_4/1e6:.2f} m²",
      f"שטח סנדוויץ' 4 מ\"מ נטו: {total_4:,} ממ\"ר ≈ {total_4/1e6:.2f} מ\"ר")

    # ── §5 Sheet Cut Plan ───────────────────────────────────────────────
    story.append(PageBreak())
    H1("5. Sheet Cut Plan — 3 Sheets of 17 mm",
       "5. תוכנית חיתוך — 3 גיליונות 17 מ\"מ")

    P("Sheets 1 & 2 use mixed-width rip: door strip (496) + depth strip (368) + "
      f"shelf strip (348) = 1220 mm exactly. Small doors (S-05) are cut from the "
      "offcut after each large door (442 × 496 mm piece) — rotated 386 × 474.",
      "גיליונות 1 ו-2 משתמשים בחיתוך רצועות מעורב: רצועת דלת (496) + רצועת עומק (368) + "
      f"רצועת מדף (348) = 1220 מ\"מ בדיוק. דלתות קטנות (S-05) נחתכות מהפסולת "
      "שאחרי כל דלת גדולה (חתיכת 442×496 מ\"מ) — מסובבות 386×474.")
    story.append(Spacer(1, 4))

    P("Sheet 2440 × 1220 mm | Scale ~1:5 | Blue = Large | Green = Small",
      "גיליון 2440×1220 מ\"מ | קנה מידה ~1:5 | כחול = ארון גדול | ירוק = ארון קטן")
    story.append(Spacer(1, 4))

    sc = 0.19
    part_lookup = build_part_lookup(LARGE, SMALL)
    for i, (yld, parts) in enumerate(SHEETS_17MM, 1):
        d = draw_cut_sheet(parts, 2440, 1220, sc, i, yld, part_lookup=part_lookup)
        story.append(KeepTogether([d, Spacer(1, 4)]))

    H2("4 mm Backer Sheet", "גיליון גב 4 מ\"מ")
    for yld, parts in SHEET_4MM:
        story.append(draw_cut_sheet(parts, 2440, 1220, sc, 1, yld, part_lookup=part_lookup))

    # ── §6 Drilling & Boring ────────────────────────────────────────────
    story.append(PageBreak())
    H1("6. Drilling & Boring", "6. קידוח וצירים")

    H2("Large Cabinet — Hinges (4 per door × 2 doors = 8)",
       "ארון גדול — צירים (4 לדלת × 2 דלתות = 8)")
    bullets([
        ("Cup diameter: 35 mm (Forstner bit)",
         "קוטר כוס: 35 מ\"מ (מקדח פורסטנר)"),
        ("Cup depth: 12–13 mm into 17 mm panel",
         "עומק כוס: 12–13 מ\"מ בתוך לוח 17 מ\"מ"),
        ("Cup center from door edge: 22.5 mm",
         "מרכז כוס מקצה הדלת: 22.5 מ\"מ"),
        ("Hinge positions (mm from top): 100, 698, 1296, 1894",
         "מיקומי צירים (מ\"מ מלמעלה): 100, 698, 1296, 1894"),
        ("Mounting plate: pre-drill 3 mm × 10 mm into side panel",
         "פלטת הרכבה: קדח 3 מ\"מ × 10 מ\"מ בפנים לוח הצד"),
        ("Shelf pin columns: 5 mm dia, 10 mm deep, 32 mm spacing, "
         "37 mm from front edge and back rabbet edge",
         "עמודות פיני מדף: קוטר 5 מ\"מ, עומק 10 מ\"מ, מרווח 32 מ\"מ, "
         "37 מ\"מ מקצה קדמי ומקצה אחורי"),
    ])

    H2("Small Cabinet — Hinges (2 per door × 2 doors = 4)",
       "ארון קטן — צירים (2 לדלת × 2 דלתות = 4)")
    bullets([
        ("Cup: 35 mm dia, 12–13 mm deep, 22.5 mm from edge",
         "כוס: 35 מ\"מ קוטר, 12–13 מ\"מ עומק, 22.5 מ\"מ מקצה"),
        ("Hinge positions (mm from top): 80, 394",
         "מיקומי צירים (מ\"מ מלמעלה): 80, 394"),
        ("Mounting plate: pre-drill 3 mm × 10 mm",
         "פלטת הרכבה: קדח 3 מ\"מ × 10 מ\"מ"),
    ])

    # ── §7 Assembly ─────────────────────────────────────────────────────
    story.append(PageBreak())
    H1("7. Assembly Sequence", "7. רצף הרכבה")

    H2("Large Cabinet", "ארון גדול")
    bullets([
        ("Rip & crosscut all parts to final dimensions from sheets 1-3.",
         "חתוך את כל החלקים למידות סופיות מגיליונות 1-3."),
        ("Mark layout lines on inner face of side panels: top/bottom (17 mm from each end), "
         "fixed shelf at 983 mm from bottom inner face.",
         "סמן קווי מיקום על הפנים הפנימי: עליון/תחתון (17 מ\"מ מכל קצה), מדף קבוע ב-983 מ\"מ."),
        ("Drill shelf-pin columns on both side panels (32 mm system).",
         "קדח עמודות פיני מדף על שני לוחות הצד (מערכת 32 מ\"מ)."),
        ("Pre-drill 3 mm pilot holes through outer face into top/bottom/shelf.",
         "קדח חורי פיילוט 3 מ\"מ דרך הפנים החיצוני."),
        ("Dry-fit one side flat, stand top/bottom/shelf — drive 4.0×50 screws.",
         "הרכב יבש צד ראשון שטוח — הברג 4.0×50."),
        ("Flip and attach second side. Clamp while driving.",
         "הפוך וחבר צד שני. הדק בזמן הברגה."),
        ("Check square — diagonals must match within 2 mm.",
         "בדוק ריבוע — אלכסונים שווים עד 2 מ\"מ."),
        ("Attach back panel (L-07) with 3.5×16 screws every 150 mm.",
         "חבר לוח גב (L-07) עם ברגי 3.5×16 כל 150 מ\"מ."),
        ("Bore hinge cups in doors (L-06). Mount plates to side panels.",
         "קדח כוסות צירים בדלתות (L-06). הרכב פלטות."),
        ("Hang doors — adjust 3 mm outer reveal, 2 mm center gap.",
         "תלה דלתות — כוונן 3 מ\"מ מרווח חיצוני, 2 מ\"מ מרכזי."),
        ("Install handles. Secure cabinet to wall.",
         "התקן ידיות. עגן לקיר."),
    ])

    H2("Small Cabinet", "ארון קטן")
    bullets([
        ("Cut and mark all parts. Layout: top/bottom 17 mm from ends, "
         "fixed shelf at 223 mm from bottom inner face.",
         "חתוך וסמן את כל החלקים. מדף קבוע ב-223 מ\"מ מתחתית פנימית."),
        ("Pre-drill 3 mm pilot holes.",
         "קדח חורי פיילוט 3 מ\"מ."),
        ("Assemble box: one side flat → stand horizontals → screw → flip → second side.",
         "הרכב: צד שטוח → עמד אופקיים → הברג → הפוך → צד שני."),
        ("Check square. Attach back panel (S-06).",
         "בדוק ריבוע. חבר לוח גב (S-06)."),
        ("Bore hinge cups (S-05). Mount and adjust doors.",
         "קדח כוסות צירים (S-05). הרכב וכוונן דלתות."),
        ("Install handles. Wall-mount with L-brackets.",
         "התקן ידיות. עגן לקיר עם זוויתניות."),
    ])

    # ── §8 Shopping List ────────────────────────────────────────────────
    story.append(PageBreak())
    H1("8. Shopping List (combined)", "8. רשימת קניות (משולבת)")

    H2("Sheet Goods", "גיליונות")
    if is_he:
        sh_h = [T("כמות"), T("גודל"), T("פריט")]
        sh_r = [
            [T("3 גיליונות"), T("2440×1220"), T("סנדוויץ' 17 מ\"מ")],
            [T("1 גיליון"), T("2440×1220"), T("סנדוויץ' 4 מ\"מ")],
        ]
        sh_cw = [80, 100, 220]
    else:
        sh_h = ["Item", "Size", "Qty"]
        sh_r = [
            ["17 mm sandwich plywood", "2440×1220", "3 sheets"],
            ["4 mm sandwich plywood", "2440×1220", "1 sheet"],
        ]
        sh_cw = [220, 100, 80]
    story.append(tbl(sh_h, sh_r, sh_cw))
    story.append(Spacer(1, 4))

    H2("Hardware", "חומרה")
    hw_items = [
        ("110° concealed soft-close hinge (35 mm cup)", "ציר נסתר 110° סגירה שקטה (כוס 35 מ\"מ)", "12"),
        ("Hinge mounting plate (cruciform, 0 mm)", "פלטת ציר (צלב, 0 מ\"מ)", "12"),
        ("5 mm shelf pin (metal)", "פין מדף 5 מ\"מ (מתכת)", "20"),
        ("Structural screws 4.0×50 mm", "ברגי מבנה 4.0×50 מ\"מ", "100"),
        ("Hardware screws 3.5×16 mm", "ברגי חומרה 3.5×16 מ\"מ", "60"),
        ("Handles / pulls", "ידיות", "4"),
        ("Heavy-duty L-brackets", "זוויתניות L כבדות", "6"),
        ("Wall anchors (match wall type)", "עוגני קיר (בהתאם לקיר)", "6"),
    ]
    if is_he:
        hw_h = [T("כמות"), T("פריט")]
        hw_r = [[T(q), T(he)] for (en, he, q) in hw_items]
        hw_cw = [60, 340]
    else:
        hw_h = ["Item", "Qty"]
        hw_r = [[en, q] for (en, he, q) in hw_items]
        hw_cw = [340, 60]
    story.append(tbl(hw_h, hw_r, hw_cw))

    # ── §9 Drawings — Large Cabinet ────────────────────────────────────
    story.append(PageBreak())
    H1("9. Technical Drawings — Large Cabinet",
       "9. שרטוטים טכניים — ארון גדול")

    cab = LARGE; sc_v = 0.22
    H2("Front (doors closed)", "חזית (דלתות סגורות)")
    story.append(draw_front_closed(cab, sc_v)); story.append(Spacer(1,6))
    H2("Front (open)", "חזית (פתוח)")
    story.append(draw_front_open(cab, sc_v)); story.append(Spacer(1,6))

    story.append(PageBreak())
    H2("Side Elevation", "מבט צד")
    story.append(draw_side(cab, sc_v)); story.append(Spacer(1,6))
    H2("Top View", "מבט עליון")
    story.append(draw_top(cab, sc_v)); story.append(Spacer(1,6))
    H2("3D Isometric", "מבט תלת-ממדי")
    story.append(draw_3d(cab, 0.18)); story.append(Spacer(1,6))

    # ── §10 Drawings — Small Cabinet ───────────────────────────────────
    story.append(PageBreak())
    H1("10. Technical Drawings — Small Cabinet",
       "10. שרטוטים טכניים — ארון קטן")

    cab = SMALL; sc_v = 0.38
    H2("Front (doors closed)", "חזית (דלתות סגורות)")
    story.append(draw_front_closed(cab, sc_v)); story.append(Spacer(1,6))
    H2("Front (open)", "חזית (פתוח)")
    story.append(draw_front_open(cab, sc_v)); story.append(Spacer(1,6))

    story.append(PageBreak())
    H2("Side Elevation", "מבט צד")
    story.append(draw_side(cab, sc_v)); story.append(Spacer(1,6))
    H2("Top View", "מבט עליון")
    story.append(draw_top(cab, sc_v)); story.append(Spacer(1,6))
    H2("3D Isometric", "מבט תלת-ממדי")
    story.append(draw_3d(cab, 0.32)); story.append(Spacer(1,6))

    # ── §11 Checklist ───────────────────────────────────────────────────
    story.append(PageBreak())
    H1("11. Verify Before Cutting", "11. בדוק לפני חיתוך")
    checks = [
        ("Measure actual sandwich plywood thickness with calipers.",
         "מדוד עובי סנדוויץ' בפועל עם קליבר."),
        ("Verify every sheet is full 2440 × 1220 before marking.",
         "אמת מידות כל גיליון לפני סימון."),
        ("Confirm hinge cup center-to-edge from manufacturer datasheet.",
         "בדוק מרחק מרכז כוס ציר לפי דף נתונים של היצרן."),
        ("Check that saw kerf matches 4 mm allowance.",
         "ודא שרוחב חיתוך המסור תואם ל-4 מ\"מ."),
        ("Mark every part with its ID (L-01…S-06) immediately after cutting.",
         "סמן כל חלק עם מזהה (L-01…S-06) מיד אחרי חיתוך."),
        ("Dry-fit all carcass joints before committing any screws.",
         "הרכב יבש לפני הברגה — ודא שהלוחות נכנסים בלי כוח."),
        ("Pre-drill 3 mm pilot holes before final assembly.",
         "קדח פיילוט 3 מ\"מ לפני הרכבה סופית."),
        ("Align shelf-pin columns with a drilling jig or template.",
         "יישר עמודות פיני מדף עם מכוון קידוח."),
        ("Locate wall studs before mounting. Pantry loads need solid framing.",
         "אתר עמודי קיר לפני עיגון. משקל מזווה דורש עיגון לשלד."),
        ("Lay all parts on the floor and walk through assembly mentally.",
         "פרוס את כל החלקים על הרצפה ועבור על רצף ההרכבה."),
        ("On sheets 1 & 2: cut the large door FIRST, then cut S-05 from offcut.",
         "בגיליונות 1 ו-2: חתוך את הדלת הגדולה קודם, ואז חתוך S-05 מהפסולת."),
    ]
    for en, he in checks:
        story.append(Paragraph(f"\u2610  {T(he) if is_he else en}", s_body))

    doc.build(story)
    print(f"  Created: {filename}")
    return filename


# ═══════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("Generating Plan C PDFs (combined document)...")
    for lang in ("en", "he"):
        build_pdf(lang)
    print("Done.")
