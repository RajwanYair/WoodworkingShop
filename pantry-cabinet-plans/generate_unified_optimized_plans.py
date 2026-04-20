#!/usr/bin/env python3
"""Generate unified pantry cabinet plan PDFs for Plans A, B, and C.

This document keeps the external cabinet height and width fixed, compares the
three depth/material strategies, and combines both cabinets into a single PDF
per language.
"""

import importlib.util
import os
import sys

from reportlab.platypus import KeepTogether, PageBreak, Paragraph, Spacer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

from shared.pdf_utils import (
    build_part_lookup,
    create_doc,
    draw_3d_isometric,
    draw_back_elevation,
    draw_cut_sheet,
    draw_front_closed,
    draw_front_open,
    draw_side_elevation,
    draw_top_view,
    heb,
    make_catalog_cover,
    make_divider,
    make_edition_footer,
    make_feature_callout,
    make_plan_badge,
    make_product_card,
    make_styles,
    make_table,
    register_fonts,
)


OUT_DIR = os.path.join(BASE_DIR, "unified-optimized")
register_fonts()


def load_module(module_name, relative_path):
    file_path = os.path.join(BASE_DIR, relative_path)
    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


PLAN_A = load_module("pantry_plan_a", os.path.join("plan-a", "generate_plan_a_pdfs.py"))
PLAN_B = load_module("pantry_plan_b", os.path.join("plan-b", "generate_plan_b_pdfs.py"))
PLAN_C = load_module("pantry_plan_c", os.path.join("plan-c", "generate_plan_c_pdfs.py"))


PLANS = [
    {
        "key": "A",
        "module": PLAN_A,
        "title_en": "Plan A — Premium Full-Depth Build",
        "title_he": "תוכנית א' — בנייה פרימיום בעומק מלא",
        "subtitle_en": "Depth 600 mm · 5 sheets · sandwich plywood throughout · strongest and least compromised storage",
        "subtitle_he": "עומק 600 מ\"מ · 5 גיליונות · גוף סנדוויץ' · האחסון החזק והעמוק ביותר",
        "yield_pct": "71.2%",
        "sheets_17": 5,
        "material_en": "17 mm sandwich plywood + 4 mm sandwich plywood",
        "material_he": "סנדוויץ' 17 מ\"מ + סנדוויץ' 4 מ\"מ",
        "cost_en": "High",
        "cost_he": "גבוהה",
        "complexity_en": "High",
        "complexity_he": "גבוהה",
        "best_use_en": "Maximum usable depth and better long-term durability",
        "best_use_he": "עומק שימושי מקסימלי ועמידות טובה יותר לאורך זמן",
        "opt_en": [
            "Keep sandwich plywood across every part when maximum consistency matters more than savings.",
            "Standardize all drilling, screw sizes, and hinge hardware with Plans B/C to reduce setup mistakes.",
            "Use one fixed shelf plus adjustable shelf rows instead of adding more fixed members.",
            "Retain the full 600 mm depth only if the stored items really need it.",
        ],
        "opt_he": [
            "שמור על סנדוויץ' בכל החלקים כאשר עקביות חומרית חשובה יותר מחיסכון.",
            "אחד קידוחים, ברגים וחומרת צירים זהים לתוכניות ב'/ג' כדי לצמצם טעויות.",
            "השאר מדף קבוע אחד ושורות למדפים מתכווננים במקום להוסיף חלקים קבועים.",
            "שמור על עומק 600 מ\"מ רק אם הפריטים המאוחסנים באמת צריכים אותו.",
        ],
    },
    {
        "key": "B",
        "module": PLAN_B,
        "title_en": "Plan B — Balanced Cost / Depth Build",
        "title_he": "תוכנית ב' — איזון בין עלות לעומק",
        "subtitle_en": "Depth 404 mm · 4 sheets · sandwich plywood throughout · balanced without going ultra-shallow",
        "subtitle_he": "עומק 404 מ\"מ · 4 גיליונות · סנדוויץ' בכל החלקים · איזון טוב בלי להפוך לרדוד מאוד",
        "yield_pct": "66.1%",
        "sheets_17": 4,
        "material_en": "17 mm sandwich plywood + 4 mm sandwich plywood",
        "material_he": "סנדוויץ' 17 מ\"מ + סנדוויץ' 4 מ\"מ",
        "cost_en": "Medium",
        "cost_he": "בינונית",
        "complexity_en": "Medium",
        "complexity_he": "בינונית",
        "best_use_en": "Storage room use where lower cost matters more than full depth",
        "best_use_he": "שימוש בחדר מחסן כאשר העלות חשובה יותר מעומק מלא",
        "opt_en": [
            "Keep the same sandwich plywood material family while saving one full sheet through reduced depth.",
            "Use the same joinery and hinge layout as Plan A to lower build complexity.",
            "The 404 mm depth still accepts most pantry items while cutting one full sheet.",
            "This is the best compromise when Plan C feels too shallow for bottles or bulk items.",
        ],
        "opt_he": [
            "שמור על אותה משפחת סנדוויץ' ובכל זאת חסוך גיליון שלם באמצעות הקטנת עומק.",
            "השתמש באותו חיבור גוף ואותו מערך צירים כמו בתוכנית א' כדי לצמצם מורכבות.",
            "עומק 404 מ\"מ עדיין מתאים לרוב פריטי המזווה וחוסך גיליון שלם אחד.",
            "זו הפשרה הטובה ביותר כאשר תוכנית ג' מרגישה רדודה מדי לבקבוקים או אריזות גדולות.",
        ],
    },
    {
        "key": "C",
        "module": PLAN_C,
        "title_en": "Plan C — Maximum Material Optimisation",
        "title_he": "תוכנית ג' — אופטימיזציית חומר מקסימלית",
        "subtitle_en": "Depth 368 mm · 3 sheets · sandwich plywood throughout · lowest sheet count and simplest sourcing",
        "subtitle_he": "עומק 368 מ\"מ · 3 גיליונות · סנדוויץ' בכל החלקים · מספר גיליונות מינימלי ורכש פשוט יותר",
        "yield_pct": "82.5%",
        "sheets_17": 3,
        "material_en": "17 mm sandwich plywood + 4 mm sandwich plywood",
        "material_he": "סנדוויץ' 17 מ\"מ + סנדוויץ' 4 מ\"מ",
        "cost_en": "Low",
        "cost_he": "נמוכה",
        "complexity_en": "Lowest",
        "complexity_he": "הנמוכה ביותר",
        "best_use_en": "Best value when cans, jars, boxes, and typical pantry goods are the main load",
        "best_use_he": "התמורה הטובה ביותר כאשר העומס העיקרי הוא שימורים, צנצנות, קופסאות ומצרכי מזווה רגילים",
        "opt_en": [
            "Co-nest the door strip, side strip, and shelf strip on the same sheet to remove a dedicated door sheet.",
            "Keep the same external width and height while trimming only the depth that does not add much storage value.",
            "Use one hardware family across both cabinets to reduce buying mistakes and setup time.",
            "This is the best option when minimum sheet count and minimum spend are the main targets.",
        ],
        "opt_he": [
            "שבץ יחד רצועת דלת, רצועת צד ורצועת מדף על אותו גיליון כדי לבטל גיליון ייעודי לדלתות.",
            "שמור על אותו גובה ורוחב חיצוניים והקטן רק את העומק שאינו מוסיף הרבה נפח שימושי.",
            "השתמש באותה משפחת חומרה לשני הארונות כדי לצמצם טעויות רכש וזמן כיוון.",
            "זו האפשרות הטובה ביותר כאשר מספר גיליונות מינימלי ועלות מינימלית הם היעד העיקרי.",
        ],
    },
]


def total_hardware(cab_large, cab_small):
    return {
        "hinges": cab_large["hinges_total"] + cab_small["hinges_total"],
        "plates": cab_large["hinges_total"] + cab_small["hinges_total"],
        "shelf_pins": cab_large["shelf_pins"] + cab_small["shelf_pins"],
        "struct_screws": cab_large["struct_screws"] + cab_small["struct_screws"] + 20,
        "hardware_screws": cab_large["hw_screws"] + cab_small["hw_screws"],
        "handles": cab_large["handles"] + cab_small["handles"],
        "brackets": 6,
    }


def combined_parts(plan):
    rows = []
    for cab_label, cab_label_he, cab in (
        ("Large", "גדול", plan["module"].LARGE),
        ("Small", "קטן", plan["module"].SMALL),
    ):
        for part in cab["parts"]:
            rows.append((cab_label, cab_label_he, part))
    return rows


def plan_recommendation(plan, is_he):
    if plan["key"] == "A":
        return (
            "Choose Plan A only when full-depth storage and premium sheet strength matter more than cost.",
            "בחר בתוכנית א' רק כאשר עומק אחסון מלא וחוזק פרימיום חשובים יותר מהעלות.",
        )[1 if is_he else 0]
    if plan["key"] == "B":
        return (
            "Choose Plan B when you want a safer middle ground between usability, price, and workshop effort.",
            "בחר בתוכנית ב' כאשר דרושה פשרה בטוחה בין שימושיות, מחיר ומאמץ בנייה.",
        )[1 if is_he else 0]
    return (
        "Choose Plan C when the priority is the lowest total sheet count while staying entirely in sandwich plywood.",
        "בחר בתוכנית ג' כאשר העדיפות היא למספר גיליונות מינימלי תוך שמירה מלאה על סנדוויץ' בכל החלקים.",
    )[1 if is_he else 0]


def build_pdf(lang):
    is_he = lang == "he"
    text = heb if is_he else (lambda value: value)

    os.makedirs(OUT_DIR, exist_ok=True)
    filename = os.path.join(
        OUT_DIR,
        f"Unified_Pantry_Cabinet_Plans_A_B_C_{'HE' if is_he else 'EN'}.pdf",
    )
    doc = create_doc(filename)
    styles = make_styles(is_he)
    s_title = styles["title"]
    s_h1 = styles["h1"]
    s_h2 = styles["h2"]
    s_body = styles["body"]
    s_small = styles["small"]
    s_center = styles["center"]
    story = []

    def H1(en_text, he_text):
        story.append(Paragraph(text(he_text) if is_he else en_text, s_h1))

    def H2(en_text, he_text):
        story.append(Paragraph(text(he_text) if is_he else en_text, s_h2))

    def P(en_text, he_text):
        story.append(Paragraph(text(he_text) if is_he else en_text, s_body))

    def C(en_text, he_text):
        story.append(Paragraph(text(he_text) if is_he else en_text, s_center))

    def bullets(items_en, items_he):
        items = items_he if is_he else items_en
        for index, item in enumerate(items, 1):
            story.append(Paragraph(f"{index}. {text(item) if is_he else item}", s_body))

    def tbl(headers_en, headers_he, rows_en, rows_he, widths):
        headers = [text(item) for item in headers_he] if is_he else headers_en
        rows = [[text(cell) for cell in row] for row in rows_he] if is_he else rows_en
        return make_table(headers, rows, widths, is_he=is_he)

    story.extend(make_catalog_cover(
        text("קולקציית ארונות מזווה — תוכניות א'/ב'/ג'") if is_he else "Pantry Cabinet Collection — Plans A / B / C",
        text("שלוש אסטרטגיות חומר ועומק תחת מעטפת חיצונית אחת") if is_he else "Three depth and material strategies inside one fixed external envelope",
        text("מהדורת אפריל 2026 | שני ארונות בכל חלופה") if is_he else "April 2026 Edition | Both cabinets included in every option",
        text("מסמך בחירה ברמת קטלוג: השוואה בין גרסת פרימיום, גרסת איזון עלות, וגרסת אופטימיזציה מקסימלית.") if is_he else "A catalog-grade decision document comparing the premium build, the balanced cost build, and the maximum-optimisation build.",
        [
            (text("חלופות") if is_he else "Options", "3"),
            (text("ארונות") if is_he else "Cabinets", "2"),
            (text("טווח עומקים") if is_he else "Depth range", "368-600 mm"),
        ],
        styles,
        is_he=is_he,
        eyebrow=text("קולקציית ארונות מזווה") if is_he else "PANTRY CABINET COLLECTION",
    ))
    story.extend(make_divider(
        text("סקירת תוכניות") if is_he else "PLAN OVERVIEW",
        styles,
    ))
    for plan in PLANS:
        story.append(make_plan_badge(
            plan["key"],
            text(f"תוכנית {plan['key']}") if is_he else f"Plan {plan['key']}",
            styles, is_he=is_he,
        ))
        story.append(Spacer(1, 4))
        story.append(make_product_card(
            text(f"תוכנית {plan['key']}") if is_he else f"Plan {plan['key']}",
            text(plan["subtitle_he"]) if is_he else plan["subtitle_en"],
            [
                (text("עומק") if is_he else "Depth", f"{plan['module'].LARGE['ext'][2]} mm"),
                (text("גיליונות 17 מ\"מ") if is_he else "17 mm sheets", str(plan['sheets_17'])),
                (text("חומר") if is_he else "Material", text(plan["material_he"]) if is_he else plan["material_en"]),
            ],
            text(plan["best_use_he"]) if is_he else plan["best_use_en"],
            styles,
            is_he=is_he,
        ))
        story.append(Spacer(1, 6))
    story.append(make_feature_callout(
        text("איך לקרוא את הקולקציה") if is_he else "How To Read The Collection",
        [
            text("תוכנית א' נותנת את חוויית הרהיט השלמה ביותר עם עומק מלא וחומרי גוף איכותיים.") if is_he else "Plan A is the most furniture-like option, with full depth and premium sheet goods.",
            text("תוכנית ב' מיועדת למי שצריך ירידה ישירה בעלות בלי לעבור לארון רדוד מדי.") if is_he else "Plan B is the best compromise when you want clear cost savings without going ultra-shallow.",
            text("תוכנית ג' מיועדת למקסימום חיסכון בחומר, שינוע פשוט יותר, ופחות מורכבות רכש.") if is_he else "Plan C is the strongest option when sheet count, logistics, and material optimisation are the top priorities.",
        ],
        styles,
        is_he=is_he,
    ))
    story.append(Spacer(1, 6))
    story.append(make_edition_footer(
        text("מהדורת קטלוג אפריל 2026 · קולקציה מאוחדת · RajwanYair/WoodworkingShop")
        if is_he else
        "Catalog Edition April 2026 · Unified Collection · RajwanYair/WoodworkingShop",
        styles,
    ))
    story.append(PageBreak())

    H1("Collection Comparison", "השוואת הקולקציה")
    matrix_headers_en = ["Plan", "Depth", "17 mm sheets", "Material", "Cost", "Complexity", "Best use"]
    matrix_headers_he = ["שימוש מומלץ", "מורכבות", "עלות", "חומר", "גיליונות 17 מ\"מ", "עומק", "תוכנית"]
    matrix_rows_en = []
    matrix_rows_he = []
    for plan in PLANS:
        matrix_rows_en.append([
            f"Plan {plan['key']}",
            f"{plan['module'].LARGE['ext'][2]} mm",
            str(plan["sheets_17"]),
            plan["material_en"],
            plan["cost_en"],
            plan["complexity_en"],
            plan["best_use_en"],
        ])
        matrix_rows_he.append([
            plan["best_use_he"],
            plan["complexity_he"],
            plan["cost_he"],
            plan["material_he"],
            str(plan["sheets_17"]),
            f"{plan['module'].LARGE['ext'][2]} מ\"מ",
            f"תוכנית {plan['key']}",
        ])
    story.append(tbl(
        matrix_headers_en,
        matrix_headers_he,
        matrix_rows_en,
        matrix_rows_he,
        [42, 48, 55, 110, 48, 58, 155],
    ))
    story.append(Spacer(1, 6))

    H2("Shared build language", "שפת בנייה משותפת")
    bullets(
        [
            "Use the same 35 mm concealed hinge system across all plans.",
            "Keep one screw family for carcass assembly and one for hardware/back panels.",
            "Keep one fixed shelf strategy and one shelf-pin drilling pattern across all plans.",
            "Standardize the back panel fastening so the squaring process is identical in every version.",
        ],
        [
            "השתמש באותה מערכת צירים נסתרים 35 מ\"מ בכל התוכניות.",
            "השאר משפחת ברגים אחת לגוף ומשפחה אחת לחומרה ולגב.",
            "שמור על אותה שיטת מדף קבוע ואותו דפוס קידוח לפיני מדף בכל התוכניות.",
            "אחד את חיבור הגב כך שתהליך יישור הגוף יהיה זהה בכל הגרסאות.",
        ],
    )

    for plan in PLANS:
        mod = plan["module"]
        large = mod.LARGE
        small = mod.SMALL
        hardware = total_hardware(large, small)
        all_parts = combined_parts(plan)

        story.append(PageBreak())
        H1(plan["title_en"], plan["title_he"])
        C(plan["subtitle_en"], plan["subtitle_he"])
        P(
            plan_recommendation(plan, False),
            plan_recommendation(plan, True),
        )
        story.append(Spacer(1, 4))
        story.append(make_feature_callout(
            text("קריאות מרכזיות") if is_he else "Feature Callouts",
            [text(item) for item in (plan["opt_he"] if is_he else plan["opt_en"])[:3]],
            styles,
            is_he=is_he,
        ))
        story.append(Spacer(1, 6))

        H2("Plan-specific optimisations", "אופטימיזציות ייעודיות לתוכנית")
        bullets(plan["opt_en"], plan["opt_he"])
        story.append(Spacer(1, 4))

        H2("Cabinet dimensions", "מידות הארונות")
        dim_headers_en = ["Cabinet", "External H x W x D", "Internal W", "Internal H", "Door size", "Notes"]
        dim_headers_he = ["הערות", "מידת דלת", "גובה פנימי", "רוחב פנימי", "חיצוני ג x ר x ע", "ארון"]
        dim_rows_en = [
            [
                "Large",
                f"{large['ext'][0]} x {large['ext'][1]} x {large['ext'][2]}",
                str(large["int_w"]),
                str(large["int_h"]),
                f"2 x {large['door_h']} x {large['door_w']}",
                f"{large['hinges_total']} hinges · {large['shelf_pins']} shelf pins",
            ],
            [
                "Small",
                f"{small['ext'][0]} x {small['ext'][1]} x {small['ext'][2]}",
                str(small["int_w"]),
                str(small["int_h"]),
                f"2 x {small['door_h']} x {small['door_w']}",
                f"{small['hinges_total']} hinges · {small['shelf_pins']} shelf pins",
            ],
        ]
        dim_rows_he = [
            [
                f"{large['hinges_total']} צירים · {large['shelf_pins']} פיני מדף",
                f"2 x {large['door_h']} x {large['door_w']}",
                str(large["int_h"]),
                str(large["int_w"]),
                f"{large['ext'][0]} x {large['ext'][1]} x {large['ext'][2]}",
                "גדול",
            ],
            [
                f"{small['hinges_total']} צירים · {small['shelf_pins']} פיני מדף",
                f"2 x {small['door_h']} x {small['door_w']}",
                str(small["int_h"]),
                str(small["int_w"]),
                f"{small['ext'][0]} x {small['ext'][1]} x {small['ext'][2]}",
                "קטן",
            ],
        ]
        story.append(tbl(dim_headers_en, dim_headers_he, dim_rows_en, dim_rows_he, [52, 110, 58, 58, 88, 170]))
        story.append(Spacer(1, 4))

        H2("Combined cut list", "רשימת חיתוך משולבת")
        cut_headers_en = ["ID", "Cab", "Part", "Qty", "Material", "T", "L", "W", "Edge"]
        cut_headers_he = ["קנט", "רוחב", "אורך", "עובי", "חומר", "כמות", "חלק", "ארון", "מזהה"]
        cut_rows_en = []
        cut_rows_he = []
        for cab_label, cab_label_he, part in all_parts:
            cut_rows_en.append([
                part[0], cab_label, part[1], str(part[3]), part[4], str(part[6]), str(part[7]), str(part[8]), part[9],
            ])
            cut_rows_he.append([
                part[10], str(part[8]), str(part[7]), str(part[6]), part[5], str(part[3]), part[2], cab_label_he, part[0],
            ])
        story.append(tbl(cut_headers_en, cut_headers_he, cut_rows_en, cut_rows_he, [34, 36, 78, 26, 68, 22, 48, 46, 126]))
        story.append(Spacer(1, 4))

        H2("Hardware and purchasing", "חומרה ורכש")
        hardware_headers_en = ["Item", "Qty", "Why it is standardised"]
        hardware_headers_he = ["למה זה מאוחד", "כמות", "פריט"]
        hardware_rows_en = [
            ["110° concealed hinges", str(hardware["hinges"]), "One hinge family across all plans and both cabinets"],
            ["Mounting plates", str(hardware["plates"]), "Same drilling and adjustment procedure"],
            ["5 mm shelf pins", str(hardware["shelf_pins"]), "Same hole pattern for every version"],
            ["4.0 x 50 structural screws", str(hardware["struct_screws"]), "One carcass fastener size for all plans"],
            ["3.5 x 16 hardware screws", str(hardware["hardware_screws"]), "Used for back panel and hinge hardware"],
            ["Handles", str(hardware["handles"]), "Common handle count and mounting routine"],
            ["Heavy-duty L-brackets", str(hardware["brackets"]), "Large cabinet mandatory, small cabinet recommended"],
        ]
        hardware_rows_he = [
            ["אותה משפחת צירים לכל התוכניות ולשני הארונות", str(hardware["hinges"]), "צירים נסתרים 110°"],
            ["אותו קידוח ואותו תהליך כיוון", str(hardware["plates"]), "פלטות הרכבה"],
            ["אותו דפוס חורים בכל הגרסאות", str(hardware["shelf_pins"]), "פיני מדף 5 מ\"מ"],
            ["מידת בורג גוף אחת לכל התוכניות", str(hardware["struct_screws"]), "ברגי מבנה 4.0 x 50"],
            ["לגב ולחומרת צירים", str(hardware["hardware_screws"]), "ברגי חומרה 3.5 x 16"],
            ["אותו מספר ידיות ואותו מהלך התקנה", str(hardware["handles"]), "ידיות"],
            ["חובה לגדול ומומלץ לקטן", str(hardware["brackets"]), "זוויתניות L כבדות"],
        ]
        story.append(tbl(hardware_headers_en, hardware_headers_he, hardware_rows_en, hardware_rows_he, [150, 42, 288]))
        story.append(Spacer(1, 3))
        story.append(Paragraph(
            text(f"17 mm sheet count: {plan['sheets_17']} | 17 mm yield: {plan['yield_pct']} | Recommendation: {plan_recommendation(plan, False)}") if not is_he else
            text(f"מספר גיליונות 17 מ\"מ: {plan['sheets_17']} | ניצולת 17 מ\"מ: {plan['yield_pct']} | המלצה: {plan_recommendation(plan, True)}"),
            s_small,
        ))

        story.append(PageBreak())
        H2("Sheet cut plan", "תוכנית חיתוך גיליונות")
        P(
            "Blue parts belong to the large cabinet. Green parts belong to the small cabinet. Back panel sheet is shown separately.",
            "חלקים בכחול שייכים לארון הגדול. חלקים בירוק שייכים לארון הקטן. גיליון הגב מוצג בנפרד.",
        )
        story.append(Spacer(1, 4))
        cut_scale = 0.19
        part_lookup = build_part_lookup(large, small)
        for index, (yield_pct, parts_layout) in enumerate(mod.SHEETS_17MM, 1):
            drawing = draw_cut_sheet(parts_layout, 2440, 1220, cut_scale, index, yield_pct, part_lookup=part_lookup)
            story.append(KeepTogether([drawing, Spacer(1, 4)]))

        H2("4 mm backer sheet", "גיליון גב 4 מ\"מ")
        for index, (yield_pct, parts_layout) in enumerate(mod.SHEET_4MM, 1):
            drawing = draw_cut_sheet(parts_layout, 2440, 1220, cut_scale, index, yield_pct, part_lookup=part_lookup)
            story.append(drawing)
            story.append(Spacer(1, 4))

        for cab_name_en, cab_name_he, cab in (("Large cabinet", "ארון גדול", large), ("Small cabinet", "ארון קטן", small)):
            story.append(PageBreak())
            H2(f"Technical drawings — {cab_name_en}", f"שרטוטים טכניים — {cab_name_he}")
            view_scale = 0.22 if cab["ext"][0] > 1000 else 0.38
            iso_scale = 0.18 if cab["ext"][0] > 1000 else 0.32

            story.append(Paragraph(text(cab_name_he) if is_he else cab_name_en, s_center))
            story.append(Spacer(1, 4))

            H2("Front elevation (doors closed)", "חזית (דלתות סגורות)")
            story.append(draw_front_closed(cab, view_scale))
            story.append(Spacer(1, 6))

            H2("Front elevation (open)", "חזית (פתוח)")
            story.append(draw_front_open(cab, view_scale))
            story.append(Spacer(1, 6))

            story.append(PageBreak())
            H2("Side elevation", "מבט צד")
            story.append(draw_side_elevation(cab, view_scale))
            story.append(Spacer(1, 6))

            H2("Top view", "מבט עליון")
            story.append(draw_top_view(cab, view_scale))
            story.append(Spacer(1, 6))

            H2("Back elevation", "מבט אחורי")
            story.append(draw_back_elevation(cab, view_scale))
            story.append(Spacer(1, 6))

            story.append(PageBreak())
            H2("3D isometric view", "מבט תלת-ממדי איזומטרי")
            story.append(draw_3d_isometric(cab, iso_scale))

    doc.build(story)
    print(f"Created: {filename}")
    return filename


if __name__ == "__main__":
    print("Generating unified pantry cabinet plan PDFs...")
    files = [build_pdf("en"), build_pdf("he")]
    print("Done.")
    for file_path in files:
        print(f"  {os.path.basename(file_path)}")
