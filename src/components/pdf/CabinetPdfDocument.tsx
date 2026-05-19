import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type {
  CabinetConfig,
  DerivedDimensions,
  Part,
  HardwareItem,
  OptimizationResult,
  Lang,
} from '../../engine/types';
import { getMaterial } from '../../engine/materials';

// ─── Emoji rendering (Twemoji via CDN) ───
Font.registerEmojiSource({
  format: 'png',
  url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/',
});

// ─── Hebrew font registration (Noto Sans Hebrew from Google Fonts) ───
Font.register({
  family: 'NotoSansHebrew',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/notosanshebrew/v46/or3HQ7v33eiDljA1IufXTtVf7V6RvEEdhQlk0LlGxCyaeNKYZC0sq0G1.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/notosanshebrew/v46/or3HQ7v33eiDljA1IufXTtVf7V6RvEEdhQlk0LlGxCyaeNKYZC0sq6e0.ttf', fontWeight: 700 },
  ],
});

// ─── Design tokens ───

const C = {
  primary: '#6B4226', // deep walnut
  secondary: '#8B5E1A', // amber oak
  accent: '#C17B32', // warm amber
  accentLight: '#E8A030', // golden
  bg: '#FDF8F0', // parchment
  text: '#2D1A0E', // near-black
  muted: '#8B7355', // muted wood
  border: '#D4C4A0', // light wood
  headerBg: '#F0E8D8', // section header
  white: '#FFFFFF',
  coverTop: '#2C1206', // dark espresso cover band
  coverAccent: '#E8A030', // golden cover accent
  tableOdd: '#FAF6EF', // alternate table row
  tableHead: '#EDE4D4', // table header row
  statBorder: '#C4A87A',
  greenBadge: '#2D7A4F',
  blueBadge: '#1A4F7A',
  pageHeaderBg: '#F7F2EA',
  divider: '#C8B48A',
};

// ─── Styles ───

const s = StyleSheet.create({
  // ── Page layouts ──
  page: {
    paddingTop: 52, // room for fixed header
    paddingBottom: 36,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: C.text,
    backgroundColor: C.white,
  },
  coverPage: {
    padding: 0,
    fontFamily: 'Helvetica',
    backgroundColor: C.bg,
  },

  // ── Fixed page header (content pages only) ──
  pageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.pageHeaderBg,
    borderBottomWidth: 1.5,
    borderBottomColor: C.accent,
    paddingHorizontal: 40,
  },
  pageHeaderBrand: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.primary,
    flex: 1,
  },
  pageHeaderSection: {
    fontSize: 8,
    color: C.muted,
    flex: 2,
    textAlign: 'center',
  },
  pageHeaderRight: {
    fontSize: 8,
    color: C.accent,
    flex: 1,
    textAlign: 'right',
  },

  // ── Footer ──
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.divider,
    backgroundColor: C.pageHeaderBg,
    paddingHorizontal: 40,
  },
  footerLeft: { fontSize: 7, color: C.muted, flex: 1 },
  footerCenter: { fontSize: 7, color: C.muted, flex: 1, textAlign: 'center' },
  footerRight: { fontSize: 7, color: C.accent, fontFamily: 'Helvetica-Bold', flex: 1, textAlign: 'right' },

  // ── Cover ──
  coverTopBand: {
    backgroundColor: C.coverTop,
    paddingTop: 56,
    paddingBottom: 40,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  coverBigEmoji: { fontSize: 42, marginBottom: 12 },
  coverMainTitle: { fontSize: 30, fontFamily: 'Helvetica-Bold', color: C.white, textAlign: 'center', letterSpacing: 2 },
  coverGoldLine: { width: 200, height: 2, backgroundColor: C.coverAccent, marginVertical: 14 },
  coverProjectName: {
    fontSize: 16,
    fontFamily: 'Helvetica-BoldOblique',
    color: C.coverAccent,
    textAlign: 'center',
    letterSpacing: 1,
  },
  coverMidBody: {
    backgroundColor: C.bg,
    flex: 1,
    paddingVertical: 36,
    paddingHorizontal: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverInfoBox: {
    borderWidth: 1.5,
    borderColor: C.accent,
    borderRadius: 6,
    paddingVertical: 20,
    paddingHorizontal: 28,
    width: '100%',
    maxWidth: 380,
    gap: 10,
  },
  coverInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  coverInfoRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
  },
  coverInfoLabel: { fontSize: 9, color: C.muted, width: 130 },
  coverInfoValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.text, flex: 1 },
  coverBottomStrip: {
    backgroundColor: C.coverTop,
    paddingVertical: 12,
    paddingHorizontal: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coverBottomText: { fontSize: 8, color: '#B8996A' },
  coverBottomDate: { fontSize: 8, color: C.coverAccent, fontFamily: 'Helvetica-Bold' },

  // ── Sections ──
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: C.primary,
    marginBottom: 10,
    marginTop: 4,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: C.accent,
  },
  sectionSubtitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: C.secondary,
    marginTop: 12,
    marginBottom: 5,
    paddingLeft: 2,
  },

  // ── Spec table ──
  specGroup: { marginBottom: 14 },
  specGroupTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 8,
  },
  specRow: {
    flexDirection: 'row',
    paddingVertical: 3.5,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  specLabel: { width: '45%', fontSize: 9, color: C.muted },
  specValue: { width: '55%', fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.text },

  // ── Stat boxes ──
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 14, marginTop: 4 },
  statBox: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: C.statBorder,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    backgroundColor: C.tableOdd,
  },
  statEmoji: { fontSize: 16, marginBottom: 4 },
  statValue: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: C.primary },
  statLabel: { fontSize: 7, color: C.muted, marginTop: 2, textAlign: 'center' },

  // ── Data tables ──
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.tableHead,
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: C.border,
    borderBottomWidth: 1.5,
    borderBottomColor: C.accent,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  tableRowAlt: { backgroundColor: C.tableOdd },
  thText: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.primary },
  tdText: { fontSize: 8, color: C.text },

  // ── Guide text ──
  guideText: { fontSize: 9, color: C.text, marginBottom: 3, paddingLeft: 4 },
  guideIndent: { fontSize: 9, color: C.text, marginBottom: 2, paddingLeft: 22 },

  // ── Assembly steps ──
  assemblyStep: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  stepBadgeText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    textAlign: 'center',
  },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.text, marginBottom: 2 },
  stepDesc: { fontSize: 8.5, color: C.muted, lineHeight: 1.4 },
});

// ─── Column widths ───
const partsColWidths = ['7%', '23%', '5%', '18%', '11%', '11%', '8%', '17%'];
const hwColWidths = ['45%', '15%', '20%', '20%'];

// ─── PDF i18n dictionary ───
// @react-pdf/renderer runs outside the React tree so useTranslation() is unavailable.
// This dictionary provides all structural labels in both languages.
const pdfI18n = {
  en: {
    coverTitle: 'CABINET BUILD PLAN',
    dimensions: 'Dimensions',
    carcassMaterial: 'Carcass material',
    doorsShelves: 'Doors / shelves',
    cutSheets: 'Cut sheets',
    hardwareItems: 'Hardware items',
    cabinetsInProject: 'Cabinets in project',
    generated: 'Generated',
    brandFooter: 'Cabinet Planner — Interactive Woodworking Design Tool',
    specTitle: 'Cabinet Specifications',
    specDimensions: 'Dimensions',
    specExternal: 'External (W × H × D)',
    specInternalWidth: 'Internal width',
    specInternalHeight: 'Internal height',
    specShelfDepth: 'Shelf depth',
    specShelfWidth: 'Shelf width',
    specMaterials: 'Materials',
    specCarcass: 'Carcass material',
    specBackPanel: 'Back panel material',
    specEdgeBanding: 'Edge banding',
    specEdgeBandingTotal: 'Edge banding total',
    specDoorsHardware: 'Doors & Hardware',
    specDoorStyle: 'Door style',
    specDoorCount: 'Door count',
    specDoorDimensions: 'Door dimensions',
    specDoorReveal: 'Door reveal',
    specHingesPerDoor: 'Hinges per door',
    specHandleStyle: 'Handle style',
    specShelves: 'Shelves',
    specShelfCount: 'Shelf count',
    specShelfSpacing: 'Shelf spacing',
    specBackPanelSize: 'Back panel',
    cutSheetSummary: 'Cut Sheet Summary',
    sheetsRequired: 'Sheets Required',
    materialYield: 'Material Yield',
    waste: 'Waste (m²)',
    hardwareTypes: 'Hardware Types',
    partsListTitle: 'Parts List',
    partsTotal: 'parts total',
    thId: 'ID',
    thPartName: 'Part Name',
    thQty: 'Qty',
    thMaterial: 'Material',
    thLength: 'Length',
    thWidth: 'Width',
    thThickness: 'Thick.',
    thEdgeBand: 'Edge Band',
    hardwareListTitle: 'Hardware List',
    itemTypes: 'item types',
    thItem: 'Item',
    thUnit: 'Unit',
    thNotes: 'Notes',
    cutSheetPage: 'Cut Sheet',
    yield: 'yield',
    parts: 'parts',
    drillingGuide: 'Drilling & Boring Guide',
    hingeCupBoring: 'Hinge Cup Boring',
    hingeCupDesc1: 'Bore 35 mm diameter cups, 12 mm deep on door inside face',
    hingeCupDesc2: 'Hinge cup centre: 22.5 mm from door edge',
    hingePositions: 'hinge(s) per door — positions from top:',
    hingeFromTop: 'from top',
    mountingPlates: 'Mounting Plates',
    mountPlateDesc1: 'Fix mounting plates on side panels, aligned with hinge positions',
    mountPlateDesc2: 'Plate centre: 37 mm from panel front edge',
    mountPlateDesc3: 'Pre-drill 3 mm pilot holes for plate screws',
    shelfPinHoles: 'Shelf Pin Holes (System 32)',
    shelfPinDesc1: 'Drill 5 mm holes, 10 mm deep, on both side panels (inner face)',
    shelfPinDesc2Front: 'Two columns per side: 37 mm and',
    shelfPinDesc2Back: 'mm from front edge',
    shelfPinDesc3: 'Spacing: 32 mm on-centre (System 32 line boring)',
    shelfPinDesc4: 'First hole: 37 mm from bottom of internal space',
    shelfPinDesc5: 'Total rows:',
    shelfPinDesc5Suffix: 'per column',
    confirmatScrews: 'Confirmat / Assembly Screws',
    confirmatDesc1: 'Pre-drill 5 mm through-holes on outer face of top/bottom panels',
    confirmatDesc2: 'Pilot drill 3.5 mm × 40 mm into end-grain of side panels',
    confirmatDesc3: 'Spacing: ~150 mm apart along each joint',
    confirmatDesc4: 'First/last confirmat: ~50 mm from panel edge',
    backPanelSection: 'Back Panel',
    backPanelFix: 'Fix into 10 ×',
    backPanelMethod: 'mm rabbet, or staple/nail at ~150 mm intervals',
    explodedView: 'Exploded Assembly View',
    explodedNote: 'Parts shown separated for clarity — arrows indicate assembly direction.',
    assemblySequence: 'Assembly Sequence',
    shoppingList: 'Shopping List',
    sheetGoods: 'Sheet Goods',
    thSize: 'Size (mm)',
    edgeBandingSection: 'Edge Banding',
    edgeBandingRequired: 'Total edge banding required:',
    metres: 'metres',
    door: 'door',
    doors: 'doors',
    sheet: 'sheet',
    sheets: 'sheets',
    cabinets: 'cabinets',
    itemType: 'item type',
    itemTypePlural: 'item types',
    page: 'Page',
    sideL: 'Side L',
    sideR: 'Side R',
    topPanel: 'Top panel',
    bottomPanel: 'Bottom panel',
    shelf: 'Shelf',
    back: 'Back',
    doorLabel: 'Door',
    stepPrepare: 'Prepare all panels',
    stepPrepareDesc: 'Cut all parts per the cut list. Sand faces to 180 grit. Apply edge banding ({edgeBanding}) to all designated edges.',
    stepDrillPins: 'Drill shelf pin holes',
    stepDrillPinsDesc: 'Drill 5 mm × 10 mm holes on both side panels (inner face), 32 mm apart, two columns per side. Use a line-boring jig for precision.',
    stepPreDrill: 'Pre-drill confirmat holes',
    stepPreDrillDesc: 'Drill 5 mm through-holes on top and bottom panels. Drill 3.5 mm × 40 mm pilot holes into side panel end-grain. Mark positions ~50 mm from edges, ~150 mm apart.',
    stepAssemble: 'Assemble the carcass box',
    stepAssembleDesc: 'Join side panels to top and bottom with confirmat screws. Use {carcass} panels. Internal width: {internalWidth} mm. Verify square with diagonal measurements — both diagonals must match.',
    stepCentreShelf: 'Install fixed centre shelf',
    stepCentreShelfDesc: 'Install the fixed structural shelf at mid-height (required for cabinets > 1200 mm tall). Secure with confirmats through both side panels.',
    stepBackPanel: 'Attach back panel',
    stepBackPanelDesc: 'Fit the {back} back panel ({w} × {h} mm) into the rabbet or staple/nail at ~150 mm intervals. The back panel keeps the carcass square — check again before fastening.',
    stepBoreHinges: 'Bore hinge cups on doors',
    stepBoreHingesDesc: 'Bore 35 mm cups, 12 mm deep, centre 22.5 mm from door edge. {hinges} hinges per door at positions: {positions} mm from top.',
    stepMountPlates: 'Mount hinge plates on carcass',
    stepMountPlatesDesc: 'Screw mounting plates on side panels aligned with hinge positions. Plate centre: 37 mm from front edge. Pre-drill pilot holes.',
    stepHangDoors: 'Hang doors and adjust',
    stepHangDoorsDesc: 'Clip hinges into mounting plates. Adjust 3-way (in/out, up/down, lateral) until doors are flush with {reveal} mm reveal all around.',
    stepShelves: 'Install shelf pins and shelves',
    stepShelvesDesc: 'Insert shelf pins at desired heights. Place {count} adjustable shelf/shelves ({w} × {d} mm).',
    stepHandles: 'Install handles',
    stepHandlesDesc: 'Mount {style} handles on door(s). For bar handles use 128 mm or 160 mm centre-to-centre. Pre-drill before fastening to avoid tear-out.',
    stepFinal: 'Final checks',
    stepFinalDesc: 'Verify all doors open and close smoothly with consistent reveal. Check shelf levels with a spirit level. Tighten any loose confirmats. Clean all sawdust.',
  },
  he: {
    coverTitle: 'תוכנית בנייה לארון',
    dimensions: 'מידות',
    carcassMaterial: 'חומר שלד',
    doorsShelves: 'דלתות / מדפים',
    cutSheets: 'גיליונות חיתוך',
    hardwareItems: 'פריטי חומרה',
    cabinetsInProject: 'ארונות בפרויקט',
    generated: 'תאריך הפקה',
    brandFooter: 'מתכנן ארונות — כלי עיצוב נגרות אינטראקטיבי',
    specTitle: 'מפרט הארון',
    specDimensions: 'מידות',
    specExternal: 'חיצוני (ר × ג × ע)',
    specInternalWidth: 'רוחב פנימי',
    specInternalHeight: 'גובה פנימי',
    specShelfDepth: 'עומק מדף',
    specShelfWidth: 'רוחב מדף',
    specMaterials: 'חומרים',
    specCarcass: 'חומר שלד',
    specBackPanel: 'חומר גב',
    specEdgeBanding: 'קנט',
    specEdgeBandingTotal: 'סה"כ קנט',
    specDoorsHardware: 'דלתות וחומרה',
    specDoorStyle: 'סגנון דלת',
    specDoorCount: 'מספר דלתות',
    specDoorDimensions: 'מידות דלת',
    specDoorReveal: 'מרווח דלת',
    specHingesPerDoor: 'צירים לדלת',
    specHandleStyle: 'סגנון ידית',
    specShelves: 'מדפים',
    specShelfCount: 'מספר מדפים',
    specShelfSpacing: 'מרווח מדפים',
    specBackPanelSize: 'גב',
    cutSheetSummary: 'סיכום גיליונות חיתוך',
    sheetsRequired: 'גיליונות נדרשים',
    materialYield: 'ניצולת חומר',
    waste: 'פסולת (מ"ר)',
    hardwareTypes: 'סוגי חומרה',
    partsListTitle: 'רשימת חלקים',
    partsTotal: 'חלקים סה"כ',
    thId: 'מזהה',
    thPartName: 'שם חלק',
    thQty: 'כמות',
    thMaterial: 'חומר',
    thLength: 'אורך',
    thWidth: 'רוחב',
    thThickness: 'עובי',
    thEdgeBand: 'קנט',
    hardwareListTitle: 'רשימת חומרה',
    itemTypes: 'סוגי פריטים',
    thItem: 'פריט',
    thUnit: 'יחידה',
    thNotes: 'הערות',
    cutSheetPage: 'גיליון חיתוך',
    yield: 'ניצולת',
    parts: 'חלקים',
    drillingGuide: 'מדריך קידוח',
    hingeCupBoring: 'קידוח גביעי ציר',
    hingeCupDesc1: 'קדח גביעים בקוטר 35 מ"מ, עומק 12 מ"מ בצד הפנימי של הדלת',
    hingeCupDesc2: 'מרכז גביע: 22.5 מ"מ מקצה הדלת',
    hingePositions: 'ציר(ים) לדלת — מיקומים מלמעלה:',
    hingeFromTop: 'מלמעלה',
    mountingPlates: 'פלטות הרכבה',
    mountPlateDesc1: 'חבר פלטות הרכבה על פאנלים צדדיים, מיושרות עם מיקומי הצירים',
    mountPlateDesc2: 'מרכז פלטה: 37 מ"מ מהקצה הקדמי',
    mountPlateDesc3: 'קדח חורי טייס 3 מ"מ לברגי פלטה',
    shelfPinHoles: 'חורי פיני מדף (מערכת 32)',
    shelfPinDesc1: 'קדח חורים 5 מ"מ, עומק 10 מ"מ, בשני הפאנלים הצדדיים (צד פנימי)',
    shelfPinDesc2Front: 'שני טורים בכל צד: 37 מ"מ ו-',
    shelfPinDesc2Back: 'מ"מ מהקצה הקדמי',
    shelfPinDesc3: 'מרווח: 32 מ"מ מרכז-למרכז (קידוח קו מערכת 32)',
    shelfPinDesc4: 'חור ראשון: 37 מ"מ מתחתית החלל הפנימי',
    shelfPinDesc5: 'סה"כ שורות:',
    shelfPinDesc5Suffix: 'לטור',
    confirmatScrews: 'ברגי קונפירמט / הרכבה',
    confirmatDesc1: 'קדח חורים 5 מ"מ בצד החיצוני של פאנלים עליונים/תחתונים',
    confirmatDesc2: 'קדח טייס 3.5 מ"מ × 40 מ"מ בסיבי הקצה של פאנלים צדדיים',
    confirmatDesc3: 'מרווח: ~150 מ"מ בין כל חיבור',
    confirmatDesc4: 'קונפירמט ראשון/אחרון: ~50 מ"מ מקצה הפאנל',
    backPanelSection: 'פאנל גב',
    backPanelFix: 'חבר לתוך חריץ 10 ×',
    backPanelMethod: 'מ"מ, או סכך/מסמר כל ~150 מ"מ',
    explodedView: 'תצוגת הרכבה מפורקת',
    explodedNote: 'חלקים מוצגים בהפרדה לבהירות — חיצים מציינים כיוון הרכבה.',
    assemblySequence: 'רצף הרכבה',
    shoppingList: 'רשימת קניות',
    sheetGoods: 'גיליונות חומר',
    thSize: 'גודל (מ"מ)',
    edgeBandingSection: 'קנט',
    edgeBandingRequired: 'סה"כ קנט נדרש:',
    metres: 'מטרים',
    door: 'דלת',
    doors: 'דלתות',
    sheet: 'גיליון',
    sheets: 'גיליונות',
    cabinets: 'ארונות',
    itemType: 'סוג פריט',
    itemTypePlural: 'סוגי פריטים',
    page: 'עמוד',
    sideL: 'צד שמאל',
    sideR: 'צד ימין',
    topPanel: 'פאנל עליון',
    bottomPanel: 'פאנל תחתון',
    shelf: 'מדף',
    back: 'גב',
    doorLabel: 'דלת',
    stepPrepare: 'הכנת כל הפאנלים',
    stepPrepareDesc: 'חתוך את כל החלקים לפי רשימת החיתוך. לטש פנים ל-180 גריט. הדבק קנט ({edgeBanding}) על כל הקצוות המיועדים.',
    stepDrillPins: 'קידוח חורי פיני מדף',
    stepDrillPinsDesc: 'קדח חורים 5 מ"מ × 10 מ"מ בשני הפאנלים הצדדיים (צד פנימי), 32 מ"מ מרווח, שני טורים בכל צד. השתמש בג\'יג קידוח קו לדיוק.',
    stepPreDrill: 'קידוח מוקדם לקונפירמט',
    stepPreDrillDesc: 'קדח חורים 5 מ"מ בפאנלים עליונים ותחתונים. קדח טייס 3.5 מ"מ × 40 מ"מ בסיבי הקצה של הצדדיים. סמן מיקומים ~50 מ"מ מהקצוות, ~150 מ"מ מרווח.',
    stepAssemble: 'הרכבת תיבת השלד',
    stepAssembleDesc: 'חבר פאנלים צדדיים לעליון ותחתון עם ברגי קונפירמט. השתמש בפאנלים מ-{carcass}. רוחב פנימי: {internalWidth} מ"מ. וודא ריבוע עם מדידות אלכסוניות — שני האלכסונים חייבים להיות שווים.',
    stepCentreShelf: 'התקנת מדף מרכזי קבוע',
    stepCentreShelfDesc: 'התקן את המדף המבני הקבוע בגובה האמצע (נדרש לארונות מעל 1200 מ"מ). חזק עם קונפירמטים דרך שני הפאנלים הצדדיים.',
    stepBackPanel: 'חיבור פאנל הגב',
    stepBackPanelDesc: 'התקן את גב {back} ({w} × {h} מ"מ) בחריץ או סכך/מסמר כל ~150 מ"מ. פאנל הגב שומר על ריבוע השלד — בדוק שוב לפני החיזוק.',
    stepBoreHinges: 'קידוח גביעי ציר בדלתות',
    stepBoreHingesDesc: 'קדח גביעים 35 מ"מ, עומק 12 מ"מ, מרכז 22.5 מ"מ מקצה הדלת. {hinges} צירים לדלת במיקומים: {positions} מ"מ מלמעלה.',
    stepMountPlates: 'הרכבת פלטות ציר על השלד',
    stepMountPlatesDesc: 'הברג פלטות הרכבה על הפאנלים הצדדיים מיושרות עם מיקומי הצירים. מרכז פלטה: 37 מ"מ מהקצה הקדמי. קדח חורי טייס.',
    stepHangDoors: 'תליית דלתות וכיוונון',
    stepHangDoorsDesc: 'הכנס צירים לפלטות ההרכבה. כוונן ב-3 כיוונים (פנימה/החוצה, למעלה/למטה, צדדי) עד שהדלתות מיושרות עם מרווח {reveal} מ"מ מכל הצדדים.',
    stepShelves: 'התקנת פיני מדף ומדפים',
    stepShelvesDesc: 'הכנס פיני מדף בגבהים הרצויים. הנח {count} מדפים מתכווננים ({w} × {d} מ"מ).',
    stepHandles: 'התקנת ידיות',
    stepHandlesDesc: 'הרכב ידיות {style} על הדלת(ות). לידיות בר השתמש ב-128 מ"מ או 160 מ"מ מרכז-למרכז. קדח מראש למניעת קריעה.',
    stepFinal: 'בדיקות סופיות',
    stepFinalDesc: 'וודא שכל הדלתות נפתחות ונסגרות בצורה חלקה עם מרווח אחיד. בדוק פלס מדפים עם פלס מים. הדק קונפירמטים רופפים. נקה כל שבבי עץ.',
  },
} as const;

type PdfLang = keyof typeof pdfI18n;

// ─── Props ───

export interface CabinetPdfProps {
  config: CabinetConfig;
  dimensions: DerivedDimensions;
  parts: Part[];
  hardware: HardwareItem[];
  optimization: OptimizationResult;
  edgeBandingTotal: number;
  lang: Lang;
  /** v3.19.0 — project name shown on cover page title */
  projectName?: string;
  /** v3.19.0 — whether to render the cover page (default: true) */
  includeCover?: boolean;
  /** v3.39.0 — total number of cabinets in the project (shown on cover) */
  cabinetCount?: number;
}

// ─── Document ───

export function CabinetPdfDocument({
  config,
  dimensions: d,
  parts,
  hardware,
  optimization,
  edgeBandingTotal,
  lang,
  projectName,
  includeCover = true,
  cabinetCount = 1,
}: CabinetPdfProps) {
  const T = pdfI18n[lang as PdfLang] ?? pdfI18n.en;
  const isRTL = lang === 'he';
  const fontFamily = isRTL ? 'NotoSansHebrew' : 'Helvetica';
  const fontFamilyBold = isRTL ? 'NotoSansHebrew' : 'Helvetica-Bold';
  const textAlign = isRTL ? 'right' as const : 'left' as const;

  const cMat = getMaterial(config.carcassMaterial);
  const bMat = getMaterial(config.backPanelMaterial);
  const dateLocale = isRTL ? 'he-IL' : 'en-GB';
  const date = new Date().toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' });
  const coverTitle = projectName?.trim() ? projectName.trim() : T.coverTitle;
  const docTitle = `${coverTitle} — ${config.width}×${config.height}×${config.depth}`;

  return (
    <Document title={docTitle} author="Cabinet Planner" subject="Woodworking Build Plan">
      {/* ══════════════════════════════════════════════════════
          PAGE 1  —  Cover (optional)
         ══════════════════════════════════════════════════════ */}
      {includeCover && (
        <Page size="A4" style={s.coverPage}>
          {/* Top dark band */}
          <View style={s.coverTopBand}>
            <Text style={s.coverBigEmoji}>🪚</Text>
            <Text style={[s.coverMainTitle, { fontFamily: fontFamilyBold }]}>{T.coverTitle}</Text>
            <View style={s.coverGoldLine} />
            <Text style={[s.coverProjectName, { fontFamily: fontFamilyBold }]}>{coverTitle}</Text>
          </View>

          {/* Mid body with info box */}
          <View style={s.coverMidBody}>
            <View style={s.coverInfoBox}>
              <View style={[s.coverInfoRow, isRTL ? { flexDirection: 'row-reverse' } : {}]}>
                <Text style={[s.coverInfoLabel, { fontFamily, textAlign }]}>📐 {T.dimensions}</Text>
                <Text style={[s.coverInfoValue, { fontFamily: fontFamilyBold, textAlign }]}>
                  {config.width} × {config.height} × {config.depth} mm
                </Text>
              </View>
              <View style={[s.coverInfoRow, isRTL ? { flexDirection: 'row-reverse' } : {}]}>
                <Text style={[s.coverInfoLabel, { fontFamily, textAlign }]}>🪵 {T.carcassMaterial}</Text>
                <Text style={[s.coverInfoValue, { fontFamily: fontFamilyBold, textAlign }]}>
                  {cMat.name[lang]} ({cMat.thickness} mm)
                </Text>
              </View>
              <View style={[s.coverInfoRow, isRTL ? { flexDirection: 'row-reverse' } : {}]}>
                <Text style={[s.coverInfoLabel, { fontFamily, textAlign }]}>🚪 {T.doorsShelves}</Text>
                <Text style={[s.coverInfoValue, { fontFamily: fontFamilyBold, textAlign }]}>
                  {config.doorCount} {config.doorCount > 1 ? T.doors : T.door} · {config.shelfCount} {T.specShelves}
                </Text>
              </View>
              <View style={[s.coverInfoRow, isRTL ? { flexDirection: 'row-reverse' } : {}]}>
                <Text style={[s.coverInfoLabel, { fontFamily, textAlign }]}>✂️ {T.cutSheets}</Text>
                <Text style={[s.coverInfoValue, { fontFamily: fontFamilyBold, textAlign }]}>
                  {optimization.totalSheets} {optimization.totalSheets !== 1 ? T.sheets : T.sheet} ·{' '}
                  {optimization.overallYield}% {T.yield}
                </Text>
              </View>
              <View style={[s.coverInfoRow, isRTL ? { flexDirection: 'row-reverse' } : {}]}>
                <Text style={[s.coverInfoLabel, { fontFamily, textAlign }]}>🔩 {T.hardwareItems}</Text>
                <Text style={[s.coverInfoValue, { fontFamily: fontFamilyBold, textAlign }]}>
                  {hardware.length} {hardware.length !== 1 ? T.itemTypePlural : T.itemType}
                </Text>
              </View>
              {cabinetCount > 1 && (
                <View style={[s.coverInfoRow, isRTL ? { flexDirection: 'row-reverse' } : {}]}>
                  <Text style={[s.coverInfoLabel, { fontFamily, textAlign }]}>🗄️ {T.cabinetsInProject}</Text>
                  <Text style={[s.coverInfoValue, { fontFamily: fontFamilyBold, textAlign }]}>{cabinetCount} {T.cabinets}</Text>
                </View>
              )}
              <View style={[s.coverInfoRowLast, isRTL ? { flexDirection: 'row-reverse' } : {}]}>
                <Text style={[s.coverInfoLabel, { fontFamily, textAlign }]}>📅 {T.generated}</Text>
                <Text style={[s.coverInfoValue, { fontFamily: fontFamilyBold, textAlign }]}>{date}</Text>
              </View>
            </View>
          </View>

          {/* Bottom dark strip */}
          <View style={[s.coverBottomStrip, isRTL ? { flexDirection: 'row-reverse' } : {}]}>
            <Text style={[s.coverBottomText, { fontFamily }]}>🪵 {T.brandFooter}</Text>
            <Text style={[s.coverBottomDate, { fontFamily: fontFamilyBold }]}>{date}</Text>
          </View>
        </Page>
      )}

      {/* ══════════════════════════════════════════════════════
          PAGE 2  —  Specifications
         ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader section={`📐  ${T.specTitle}`} projectName={coverTitle} lang={lang} />

        <Text style={[s.sectionTitle, { fontFamily: fontFamilyBold, textAlign }]}>📐 {T.specTitle}</Text>

        <Text style={[s.specGroupTitle, { fontFamily: fontFamilyBold, textAlign }]}>📏 {T.specDimensions}</Text>
        <View style={s.specGroup}>
          <SpecRow label={T.specExternal} value={`${config.width} × ${config.height} × ${config.depth} mm`} isRTL={isRTL} fontFamily={fontFamily} fontFamilyBold={fontFamilyBold} />
          <SpecRow label={T.specInternalWidth} value={`${d.internalWidth} mm`} isRTL={isRTL} fontFamily={fontFamily} fontFamilyBold={fontFamilyBold} />
          <SpecRow label={T.specInternalHeight} value={`${d.internalHeight} mm`} isRTL={isRTL} fontFamily={fontFamily} fontFamilyBold={fontFamilyBold} />
          <SpecRow label={T.specShelfDepth} value={`${d.shelfDepth} mm`} isRTL={isRTL} fontFamily={fontFamily} fontFamilyBold={fontFamilyBold} />
          <SpecRow label={T.specShelfWidth} value={`${d.shelfWidth} mm`} isRTL={isRTL} fontFamily={fontFamily} fontFamilyBold={fontFamilyBold} />
        </View>

        <Text style={[s.specGroupTitle, { fontFamily: fontFamilyBold, textAlign }]}>🪵 {T.specMaterials}</Text>
        <View style={s.specGroup}>
          <SpecRow label={T.specCarcass} value={`${cMat.name[lang]} (${cMat.thickness} mm)`} isRTL={isRTL} fontFamily={fontFamily} fontFamilyBold={fontFamilyBold} />
          <SpecRow label={T.specBackPanel} value={`${bMat.name[lang]} (${bMat.thickness} mm)`} isRTL={isRTL} fontFamily={fontFamily} fontFamilyBold={fontFamilyBold} />
          <SpecRow label={T.specEdgeBanding} value={config.edgeBanding} isRTL={isRTL} fontFamily={fontFamily} fontFamilyBold={fontFamilyBold} />
          <SpecRow label={T.specEdgeBandingTotal} value={`${(edgeBandingTotal / 1000).toFixed(1)} m`} isRTL={isRTL} fontFamily={fontFamily} fontFamilyBold={fontFamilyBold} />
        </View>

        <Text style={[s.specGroupTitle, { fontFamily: fontFamilyBold, textAlign }]}>🚪 {T.specDoorsHardware}</Text>
        <View style={s.specGroup}>
          <SpecRow label={T.specDoorStyle} value={config.doorStyle} isRTL={isRTL} fontFamily={fontFamily} fontFamilyBold={fontFamilyBold} />
          <SpecRow label={T.specDoorCount} value={String(config.doorCount)} isRTL={isRTL} fontFamily={fontFamily} fontFamilyBold={fontFamilyBold} />
          <SpecRow label={T.specDoorDimensions} value={`${Math.round(d.doorWidth)} × ${Math.round(d.doorHeight)} mm`} isRTL={isRTL} fontFamily={fontFamily} fontFamilyBold={fontFamilyBold} />
          <SpecRow label={T.specDoorReveal} value={`${config.doorReveal} mm`} isRTL={isRTL} fontFamily={fontFamily} fontFamilyBold={fontFamilyBold} />
          <SpecRow label={T.specHingesPerDoor} value={String(d.hingesPerDoor)} isRTL={isRTL} fontFamily={fontFamily} fontFamilyBold={fontFamilyBold} />
          <SpecRow label={T.specHandleStyle} value={config.handleStyle} isRTL={isRTL} fontFamily={fontFamily} fontFamilyBold={fontFamilyBold} />
        </View>

        <Text style={[s.specGroupTitle, { fontFamily: fontFamilyBold, textAlign }]}>📚 {T.specShelves}</Text>
        <View style={s.specGroup}>
          <SpecRow label={T.specShelfCount} value={String(config.shelfCount)} isRTL={isRTL} fontFamily={fontFamily} fontFamilyBold={fontFamilyBold} />
          <SpecRow label={T.specShelfSpacing} value={config.shelfSpacing} isRTL={isRTL} fontFamily={fontFamily} fontFamilyBold={fontFamilyBold} />
          <SpecRow label={T.specBackPanelSize} value={`${Math.round(d.backPanelWidth)} × ${Math.round(d.backPanelHeight)} mm`} isRTL={isRTL} fontFamily={fontFamily} fontFamilyBold={fontFamilyBold} />
        </View>

        <Text style={[s.sectionTitle, { marginTop: 14, fontFamily: fontFamilyBold, textAlign }]}>📊 {T.cutSheetSummary}</Text>
        <View style={[s.statRow, isRTL ? { flexDirection: 'row-reverse' } : {}]}>
          <View style={s.statBox}>
            <Text style={s.statEmoji}>📋</Text>
            <Text style={s.statValue}>{optimization.totalSheets}</Text>
            <Text style={[s.statLabel, { fontFamily }]}>{T.sheetsRequired}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statEmoji}>📊</Text>
            <Text style={s.statValue}>{optimization.overallYield}%</Text>
            <Text style={[s.statLabel, { fontFamily }]}>{T.materialYield}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statEmoji}>♻️</Text>
            <Text style={s.statValue}>{(optimization.totalWaste / 1_000_000).toFixed(2)}</Text>
            <Text style={[s.statLabel, { fontFamily }]}>{T.waste}</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statEmoji}>🔩</Text>
            <Text style={s.statValue}>{hardware.length}</Text>
            <Text style={[s.statLabel, { fontFamily }]}>{T.hardwareTypes}</Text>
          </View>
        </View>

        <PageFooter date={date} lang={lang} />
      </Page>

      {/* ══════════════════════════════════════════════════════
          PAGE 3  —  Parts List
         ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader section={`🔲  ${T.partsListTitle}`} projectName={coverTitle} lang={lang} />

        <Text style={[s.sectionTitle, { fontFamily: fontFamilyBold, textAlign }]}>
          🔲 {T.partsListTitle}{' '}
          <Text style={{ fontSize: 9, fontFamily, color: C.muted }}>— {parts.length} {T.partsTotal}</Text>
        </Text>

        <View style={s.tableHeader}>
          {[T.thId, T.thPartName, T.thQty, T.thMaterial, T.thLength, T.thWidth, T.thThickness, T.thEdgeBand].map((h, i) => (
            <Text key={i} style={[s.thText, { width: partsColWidths[i], fontFamily: fontFamilyBold }]}>
              {h}
            </Text>
          ))}
        </View>

        {parts.map((p, i) => (
          <View key={p.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
            <Text style={[s.tdText, { width: partsColWidths[0], color: C.accent, fontFamily: fontFamilyBold }]}>
              {p.id}
            </Text>
            <Text style={[s.tdText, { width: partsColWidths[1], fontFamily }]}>{p.name[lang]}</Text>
            <Text style={[s.tdText, { width: partsColWidths[2], textAlign: 'center' }]}>{p.qty}</Text>
            <Text style={[s.tdText, { width: partsColWidths[3], color: C.secondary, fontFamily }]}>
              {getMaterial(p.material).name[lang]}
            </Text>
            <Text style={[s.tdText, { width: partsColWidths[4] }]}>{p.length}</Text>
            <Text style={[s.tdText, { width: partsColWidths[5] }]}>{p.width}</Text>
            <Text style={[s.tdText, { width: partsColWidths[6], textAlign: 'center' }]}>{p.thickness}</Text>
            <Text style={[s.tdText, { width: partsColWidths[7], fontSize: 7, fontFamily }]}>{p.edgeBanding[lang]}</Text>
          </View>
        ))}

        <PageFooter date={date} lang={lang} />
      </Page>

      {/* ══════════════════════════════════════════════════════
          PAGE 4  —  Hardware List
         ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader section={`🔩  ${T.hardwareListTitle}`} projectName={coverTitle} lang={lang} />

        <Text style={[s.sectionTitle, { fontFamily: fontFamilyBold, textAlign }]}>
          🔩 {T.hardwareListTitle}{' '}
          <Text style={{ fontSize: 9, fontFamily, color: C.muted }}>— {hardware.length} {T.itemTypes}</Text>
        </Text>

        <View style={s.tableHeader}>
          {[T.thItem, T.thQty, T.thUnit, T.thNotes].map((h, i) => (
            <Text key={i} style={[s.thText, { width: hwColWidths[i], fontFamily: fontFamilyBold }]}>
              {h}
            </Text>
          ))}
        </View>

        {hardware.map((hw, i) => (
          <View key={hw.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
            <Text style={[s.tdText, { width: hwColWidths[0], fontFamily: fontFamilyBold }]}>{hw.name[lang]}</Text>
            <Text style={[s.tdText, { width: hwColWidths[1], textAlign: 'center' }]}>{hw.qty}</Text>
            <Text style={[s.tdText, { width: hwColWidths[2], color: C.muted, fontFamily }]}>{hw.unit[lang]}</Text>
            <Text style={[s.tdText, { width: hwColWidths[3], fontSize: 7, color: C.muted }]}>{hw.id}</Text>
          </View>
        ))}

        <PageFooter date={date} lang={lang} />
      </Page>

      {/* ══════════════════════════════════════════════════════
          PAGES 5+  —  Cut Sheet Diagrams
         ══════════════════════════════════════════════════════ */}
      {optimization.sheets.map((sheet) => {
        const mat = getMaterial(sheet.material);
        const isLandscape = sheet.sheetLength > sheet.sheetWidth;
        const maxLen = isLandscape ? 700 : 460;
        const maxWid = isLandscape ? 390 : 390;
        const scale = Math.min(maxLen / sheet.sheetLength, maxWid / sheet.sheetWidth);

        return (
          <Page key={sheet.sheetIndex} size="A4" orientation={isLandscape ? 'landscape' : 'portrait'} style={s.page}>
            <PageHeader
              section={`✂️  ${T.cutSheetPage} ${sheet.sheetIndex + 1} / ${optimization.sheets.length}`}
              projectName={coverTitle}
              lang={lang}
            />

            {/* Sheet title banner */}
            <View
              style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}
            >
              <Text style={[s.sectionTitle, { fontFamily: fontFamilyBold, textAlign }]}>
                ✂️ {T.cutSheetPage} #{sheet.sheetIndex + 1} — {mat.name[lang]} ({sheet.thickness} mm)
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View
                  style={{
                    backgroundColor: C.tableOdd,
                    borderWidth: 1,
                    borderColor: C.statBorder,
                    borderRadius: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 8, fontFamily: fontFamilyBold, color: C.primary }}>
                    📊 {sheet.yieldPercent}% {T.yield}
                  </Text>
                </View>
                <View
                  style={{
                    backgroundColor: C.tableOdd,
                    borderWidth: 1,
                    borderColor: C.statBorder,
                    borderRadius: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 8, color: C.muted, fontFamily }}>🔲 {sheet.parts.length} {T.parts}</Text>
                </View>
              </View>
            </View>

            {/* Sheet board diagram */}
            <View
              style={{
                width: sheet.sheetLength * scale,
                height: sheet.sheetWidth * scale,
                borderWidth: 1.5,
                borderColor: C.primary,
                backgroundColor: mat.color ?? '#E8D5B0',
                position: 'relative',
              }}
            >
              {/* Grain lines overlay */}
              {Array.from({ length: Math.floor((sheet.sheetWidth * scale) / 12) }).map((_, gi) => (
                <View
                  key={gi}
                  style={{
                    position: 'absolute',
                    top: gi * 12,
                    left: 0,
                    right: 0,
                    height: 0.3,
                    backgroundColor: 'rgba(0,0,0,0.06)',
                  }}
                />
              ))}
              {sheet.parts.map((p, i) => (
                <View
                  key={i}
                  style={{
                    position: 'absolute',
                    left: p.x * scale,
                    top: p.y * scale,
                    width: p.width * scale,
                    height: p.length * scale,
                    backgroundColor: C.white,
                    borderWidth: 0.75,
                    borderColor: C.primary,
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <Text
                    style={{
                      fontSize: Math.min(7, p.width * scale * 0.15),
                      fontFamily: 'Helvetica-Bold',
                      color: C.primary,
                    }}
                  >
                    {p.partId}
                  </Text>
                  <Text style={{ fontSize: Math.min(5.5, p.width * scale * 0.1), color: C.muted }}>
                    {p.width}×{p.length}
                  </Text>
                </View>
              ))}
            </View>

            {/* Legend */}
            <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {sheet.parts.map((p, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 3, marginRight: 10 }}>
                  <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: C.accent }}>{p.partId}</Text>
                  <Text style={{ fontSize: 7, color: C.muted }}>
                    {p.label} — {p.width}×{p.length} mm
                  </Text>
                </View>
              ))}
            </View>

            <PageFooter date={date} lang={lang} />
          </Page>
        );
      })}

      {/* ══════════════════════════════════════════════════════
          DRILLING & BORING GUIDE
         ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader section={`🔧  ${T.drillingGuide}`} projectName={coverTitle} lang={lang} />

        <Text style={[s.sectionTitle, { fontFamily: fontFamilyBold, textAlign }]}>🔧 {T.drillingGuide}</Text>

        <Text style={[s.sectionSubtitle, { fontFamily: fontFamilyBold, textAlign }]}>🪛 {T.hingeCupBoring}</Text>
        <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.hingeCupDesc1}</Text>
        <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.hingeCupDesc2}</Text>
        <Text style={[s.guideText, { fontFamily, textAlign }]}>• {d.hingesPerDoor} {T.hingePositions}</Text>
        {d.hingePositions.map((pos, i) => (
          <Text key={i} style={[s.guideIndent, { fontFamily }]}>
            {isRTL ? `← ציר ${i + 1}: ${pos} מ"מ ${T.hingeFromTop}` : `↳ Hinge ${i + 1}: ${pos} mm ${T.hingeFromTop}`}
          </Text>
        ))}

        <Text style={[s.sectionSubtitle, { fontFamily: fontFamilyBold, textAlign }]}>🔩 {T.mountingPlates}</Text>
        <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.mountPlateDesc1}</Text>
        <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.mountPlateDesc2}</Text>
        <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.mountPlateDesc3}</Text>

        <Text style={[s.sectionSubtitle, { fontFamily: fontFamilyBold, textAlign }]}>📌 {T.shelfPinHoles}</Text>
        <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.shelfPinDesc1}</Text>
        <Text style={[s.guideText, { fontFamily, textAlign }]}>
          {'• '}
          {T.shelfPinDesc2Front}
          {d.internalWidth > 400 ? d.shelfDepth - 37 : Math.round(d.shelfDepth / 2)}
          {' '}
          {T.shelfPinDesc2Back}
        </Text>
        <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.shelfPinDesc3}</Text>
        <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.shelfPinDesc4}</Text>
        <Text style={[s.guideText, { fontFamily, textAlign }]}>
          {'• '}
          {T.shelfPinDesc5}
          {' '}
          {Math.max(1, Math.floor((d.internalHeight - 74) / 32) + 1)}
          {' '}
          {T.shelfPinDesc5Suffix}
        </Text>

        <Text style={[s.sectionSubtitle, { fontFamily: fontFamilyBold, textAlign }]}>🪛 {T.confirmatScrews}</Text>
        <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.confirmatDesc1}</Text>
        <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.confirmatDesc2}</Text>
        <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.confirmatDesc3}</Text>
        <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.confirmatDesc4}</Text>

        <Text style={[s.sectionSubtitle, { fontFamily: fontFamilyBold, textAlign }]}>🗂️ {T.backPanelSection}</Text>
        <Text style={[s.guideText, { fontFamily, textAlign }]}>
          {'• '}
          {bMat.name[lang]}
          {' ('}
          {bMat.thickness}
          {' mm) — '}
          {Math.round(d.backPanelWidth)}
          {' × '}
          {Math.round(d.backPanelHeight)}
          {' mm'}
        </Text>
        <Text style={[s.guideText, { fontFamily, textAlign }]}>
          {'• '}
          {T.backPanelFix}
          {' '}
          {bMat.thickness}
          {' '}
          {T.backPanelMethod}
        </Text>

        <PageFooter date={date} lang={lang} />
      </Page>

      {/* ══════════════════════════════════════════════════════
          EXPLODED VIEW
         ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader section={`🏗️  ${T.explodedView}`} projectName={coverTitle} lang={lang} />

        <Text style={[s.sectionTitle, { fontFamily: fontFamilyBold, textAlign }]}>🏗️ {T.explodedView}</Text>
        <ExplodedView config={config} dimensions={d} cMat={cMat.name[lang]} bMat={bMat.name[lang]} lang={lang} />
        <PageFooter date={date} lang={lang} />
      </Page>

      {/* ══════════════════════════════════════════════════════
          ASSEMBLY SEQUENCE
         ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader section={`🔨  ${T.assemblySequence}`} projectName={coverTitle} lang={lang} />

        <Text style={[s.sectionTitle, { fontFamily: fontFamilyBold, textAlign }]}>🔨 {T.assemblySequence}</Text>

        {assemblyStepsI18n(config, d, cMat.name[lang], bMat.name[lang], lang).map((step, i) => (
          <View key={i} style={[s.assemblyStep, isRTL ? { flexDirection: 'row-reverse' } : {}]} wrap={false}>
            <View style={[s.stepBadge, isRTL ? { marginRight: 0, marginLeft: 10 } : {}]}>
              <Text style={s.stepBadgeText}>{i + 1}</Text>
            </View>
            <View style={s.stepContent}>
              <Text style={[s.stepTitle, { fontFamily: fontFamilyBold, textAlign }]}>
                {step.emoji} {step.title}
              </Text>
              <Text style={[s.stepDesc, { fontFamily, textAlign }]}>{step.description}</Text>
            </View>
          </View>
        ))}

        <PageFooter date={date} lang={lang} />
      </Page>

      {/* ══════════════════════════════════════════════════════
          SHOPPING LIST
         ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader section={`🛒  ${T.shoppingList}`} projectName={coverTitle} lang={lang} />

        <Text style={[s.sectionTitle, { fontFamily: fontFamilyBold, textAlign }]}>🛒 {T.shoppingList}</Text>

        <Text style={[s.sectionSubtitle, { fontFamily: fontFamilyBold, textAlign }]}>🪵 {T.sheetGoods}</Text>
        <View style={s.tableHeader}>
          {[T.thMaterial, T.thSize, T.thQty].map((h, i) => (
            <Text key={i} style={[s.thText, { width: ['50%', '32%', '18%'][i], fontFamily: fontFamilyBold }]}>
              {h}
            </Text>
          ))}
        </View>
        {sheetSummary(optimization, lang).map((row, i) => (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
            <Text style={[s.tdText, { width: '50%', fontFamily: fontFamilyBold }]}>{row.material}</Text>
            <Text style={[s.tdText, { width: '32%', color: C.muted }]}>{row.size}</Text>
            <Text style={[s.tdText, { width: '18%', textAlign: 'center' }]}>{row.qty}</Text>
          </View>
        ))}

        <Text style={[s.sectionSubtitle, { marginTop: 14, fontFamily: fontFamilyBold, textAlign }]}>🔩 {T.hardwareListTitle}</Text>
        <View style={s.tableHeader}>
          {[T.thItem, T.thQty, T.thUnit].map((h, i) => (
            <Text key={i} style={[s.thText, { width: ['55%', '20%', '25%'][i], fontFamily: fontFamilyBold }]}>
              {h}
            </Text>
          ))}
        </View>
        {hardware.map((hw, i) => (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
            <Text style={[s.tdText, { width: '55%', fontFamily }]}>{hw.name[lang]}</Text>
            <Text style={[s.tdText, { width: '20%', textAlign: 'center' }]}>{hw.qty}</Text>
            <Text style={[s.tdText, { width: '25%', color: C.muted, fontFamily }]}>{hw.unit[lang]}</Text>
          </View>
        ))}

        {edgeBandingTotal > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={[s.sectionSubtitle, { fontFamily: fontFamilyBold, textAlign }]}>🎀 {T.edgeBandingSection}</Text>
            <Text style={[s.guideText, { fontFamily, textAlign }]}>{T.edgeBandingRequired} {(edgeBandingTotal / 1000).toFixed(1)} {T.metres}</Text>
          </View>
        )}

        <PageFooter date={date} lang={lang} />
      </Page>
    </Document>
  );
}

// ══════════════════════════════════════════════════════════════
//  Sub-components
// ══════════════════════════════════════════════════════════════

function PageHeader({ section, projectName, lang = 'en' }: { section: string; projectName: string; lang?: Lang }) {
  const isRTL = lang === 'he';
  const ff = isRTL ? 'NotoSansHebrew' : 'Helvetica';
  const ffBold = isRTL ? 'NotoSansHebrew' : 'Helvetica-Bold';
  return (
    <View style={[s.pageHeader, isRTL ? { flexDirection: 'row-reverse' } : {}]} fixed>
      <Text style={[s.pageHeaderBrand, { fontFamily: ffBold }]}>🪵 {isRTL ? 'מתכנן ארונות' : 'Cabinet Planner'}</Text>
      <Text style={[s.pageHeaderSection, { fontFamily: ff }]}>{section}</Text>
      <Text style={[s.pageHeaderRight, { fontFamily: ffBold }]}>{projectName}</Text>
    </View>
  );
}

function PageFooter({ date, lang = 'en' }: { date: string; lang?: Lang }) {
  const isRTL = lang === 'he';
  const ff = isRTL ? 'NotoSansHebrew' : 'Helvetica';
  const ffBold = isRTL ? 'NotoSansHebrew' : 'Helvetica-Bold';
  const pageLabel = isRTL ? 'עמוד' : 'Page';
  return (
    <View style={[s.footer, isRTL ? { flexDirection: 'row-reverse' } : {}]} fixed>
      <Text style={[s.footerLeft, { fontFamily: ff }]}>🪵 {isRTL ? 'מתכנן ארונות' : 'Cabinet Planner'}</Text>
      <Text style={[s.footerCenter, { fontFamily: ff }]}>📅 {date}</Text>
      <Text style={[s.footerRight, { fontFamily: ffBold }]} render={({ pageNumber, totalPages }) => `${pageLabel} ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function SpecRow({ label, value, isRTL = false, fontFamily = 'Helvetica', fontFamilyBold = 'Helvetica-Bold' }: { label: string; value: string; isRTL?: boolean; fontFamily?: string; fontFamilyBold?: string }) {
  return (
    <View style={[s.specRow, isRTL ? { flexDirection: 'row-reverse' } : {}]}>
      <Text style={[s.specLabel, { fontFamily, textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
      <Text style={[s.specValue, { fontFamily: fontFamilyBold, textAlign: isRTL ? 'right' : 'left' }]}>{value}</Text>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════════════════════════

interface AssemblyStep {
  emoji: string;
  title: string;
  description: string;
}

function assemblyStepsI18n(
  config: CabinetConfig,
  d: DerivedDimensions,
  carcassName: string,
  backName: string,
  lang: Lang,
): AssemblyStep[] {
  const T = pdfI18n[lang as PdfLang] ?? pdfI18n.en;
  const steps: AssemblyStep[] = [
    {
      emoji: '✂️',
      title: T.stepPrepare,
      description: T.stepPrepareDesc.replace('{edgeBanding}', config.edgeBanding),
    },
    {
      emoji: '📌',
      title: T.stepDrillPins,
      description: T.stepDrillPinsDesc,
    },
    {
      emoji: '🔧',
      title: T.stepPreDrill,
      description: T.stepPreDrillDesc,
    },
    {
      emoji: '🏗️',
      title: T.stepAssemble,
      description: T.stepAssembleDesc.replace('{carcass}', carcassName).replace('{internalWidth}', String(d.internalWidth)),
    },
  ];

  if (config.height > 1200) {
    steps.push({
      emoji: '📐',
      title: T.stepCentreShelf,
      description: T.stepCentreShelfDesc,
    });
  }

  steps.push(
    {
      emoji: '🗂️',
      title: T.stepBackPanel,
      description: T.stepBackPanelDesc
        .replace('{back}', backName)
        .replace('{w}', String(Math.round(d.backPanelWidth)))
        .replace('{h}', String(Math.round(d.backPanelHeight))),
    },
    {
      emoji: '🪛',
      title: T.stepBoreHinges,
      description: T.stepBoreHingesDesc
        .replace('{hinges}', String(d.hingesPerDoor))
        .replace('{positions}', d.hingePositions.join(', ')),
    },
    {
      emoji: '🔩',
      title: T.stepMountPlates,
      description: T.stepMountPlatesDesc,
    },
    {
      emoji: '🚪',
      title: T.stepHangDoors,
      description: T.stepHangDoorsDesc.replace('{reveal}', String(config.doorReveal)),
    },
    {
      emoji: '📚',
      title: T.stepShelves,
      description: T.stepShelvesDesc
        .replace('{count}', String(config.shelfCount))
        .replace('{w}', String(d.shelfWidth))
        .replace('{d}', String(d.shelfDepth)),
    },
  );

  if (config.handleStyle !== 'none') {
    steps.push({
      emoji: '🖐️',
      title: T.stepHandles,
      description: T.stepHandlesDesc.replace('{style}', config.handleStyle),
    });
  }

  steps.push({
    emoji: '✅',
    title: T.stepFinal,
    description: T.stepFinalDesc,
  });

  return steps;
}

interface SheetRow {
  material: string;
  size: string;
  qty: number;
}

function sheetSummary(optimization: OptimizationResult, lang: Lang): SheetRow[] {
  const map = new Map<string, SheetRow>();
  for (const sheet of optimization.sheets) {
    const mat = getMaterial(sheet.material);
    const key = `${sheet.material}-${sheet.thickness}`;
    const existing = map.get(key);
    if (existing) {
      existing.qty++;
    } else {
      map.set(key, {
        material: `${mat.name[lang]} (${sheet.thickness} mm)`,
        size: `${mat.sheetWidth} × ${mat.sheetLength}`,
        qty: 1,
      });
    }
  }
  return Array.from(map.values());
}

// ══════════════════════════════════════════════════════════════
//  Exploded view diagram
// ══════════════════════════════════════════════════════════════

function ExplodedView({
  config,
  dimensions: _dimensions,
  cMat,
  bMat,
  lang = 'en',
}: {
  config: CabinetConfig;
  dimensions: DerivedDimensions;
  cMat: string;
  bMat: string;
  lang?: Lang;
}) {
  const T = pdfI18n[lang as PdfLang] ?? pdfI18n.en;
  const ff = lang === 'he' ? 'NotoSansHebrew' : 'Helvetica';
  const maxW = 400;
  const maxH = 480;
  const sc = Math.min(maxW / config.width, maxH / config.height) * 0.65;

  const W = config.width * sc;
  const H = config.height * sc;
  const t = getMaterial(config.carcassMaterial).thickness * sc;
  const gap = 28;

  const baseX = 64;
  const baseY = 36;

  const partBox = (
    top: number,
    left: number,
    width: number,
    height: number,
    bg: string,
    label: string,
    border = '#8B7355',
  ) => (
    <View
      style={{
        position: 'absolute',
        top,
        left,
        width,
        height,
        backgroundColor: bg,
        borderWidth: 0.75,
        borderColor: border,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 5.5, color: C.text, textAlign: 'center' }}>{label}</Text>
    </View>
  );

  const arrow = (top: number, left: number, char: string) => (
    <Text style={{ position: 'absolute', top, left, fontSize: 11, color: C.accent }}>{char}</Text>
  );

  const lbl = (text: string, top: number, left: number) => (
    <Text style={{ position: 'absolute', top, left, fontSize: 6.5, color: C.muted }}>{text}</Text>
  );

  return (
    <View style={{ width: maxW + 140, height: maxH + 60, position: 'relative', marginTop: 6 }}>
      <Text style={{ fontSize: 8, color: C.muted, marginBottom: 6, fontFamily: ff }}>
        {T.explodedNote}
      </Text>

      {/* Ghost carcass outline */}
      <View
        style={{
          position: 'absolute',
          top: baseY,
          left: baseX,
          width: W,
          height: H,
          borderWidth: 0.75,
          borderColor: '#CCC',
          borderStyle: 'dashed',
        }}
      />

      {/* ① Left side */}
      {partBox(baseY, baseX - gap - t, t, H, '#D2B48C', T.sideL)}
      {lbl(`① ${T.sideL}`, baseY - 11, baseX - gap - t)}
      {arrow(baseY + H / 2 - 6, baseX - gap + 2, '→')}

      {/* ② Right side */}
      {partBox(baseY, baseX + W + gap, t, H, '#D2B48C', T.sideR)}
      {lbl(`② ${T.sideR}`, baseY - 11, baseX + W + gap)}
      {arrow(baseY + H / 2 - 6, baseX + W + gap - 14, '←')}

      {/* ③ Top panel */}
      {partBox(baseY - gap - t, baseX + t, W - 2 * t, t, '#DEB887', T.topPanel)}
      {lbl(`③ ${T.topPanel}`, baseY - gap - t - 11, baseX + t)}
      {arrow(baseY - gap, baseX + W / 2 - 5, '↓')}

      {/* ④ Bottom panel */}
      {partBox(baseY + H + gap, baseX + t, W - 2 * t, t, '#DEB887', T.bottomPanel)}
      {lbl(`④ ${T.bottomPanel}`, baseY + H + gap + t + 3, baseX + t)}
      {arrow(baseY + H + gap - 14, baseX + W / 2 - 5, '↑')}

      {/* Shelves inside ghost */}
      {config.shelfCount > 0 &&
        Array.from({ length: Math.min(config.shelfCount, 5) }).map((_, i) => {
          const sy = baseY + (H / (config.shelfCount + 1)) * (i + 1);
          return partBox(sy - t / 2, baseX + t + 2, W - 2 * t - 4, t, '#F5DEB3', `${T.shelf} ${i + 1}`);
        })}

      {/* ⑤ Back panel */}
      {partBox(baseY + 4, baseX + W + gap * 2.8, W * 0.12, H - 8, '#C8B090', `${T.back}\n${bMat}`)}
      {lbl(`⑤ ${T.back}`, baseY - 11, baseX + W + gap * 2.8)}

      {/* ⑥ Door(s) */}
      {config.doorStyle !== 'none' &&
        Array.from({ length: config.doorCount }).map((_, i) => {
          const dw = (W / config.doorCount) * 0.88;
          const dx = baseX + (W / config.doorCount) * i + (W / config.doorCount) * 0.06;
          return partBox(baseY + H + gap * 2.8, dx, dw, H * 0.14, '#E8D5B7', `${T.doorLabel} ${i + 1}`);
        })}
      {config.doorStyle !== 'none' && lbl(`⑥ ${T.doorLabel}(s)`, baseY + H + gap * 2.8 - 11, baseX)}

      {/* Dimension line */}
      <Text
        style={{
          position: 'absolute',
          top: baseY + H + gap * 1.6 + t + 14,
          left: baseX,
          fontSize: 7.5,
          color: C.secondary,
          fontFamily: 'Helvetica-Bold',
        }}
      >
        {config.width} mm × {config.height} mm × {config.depth} mm
      </Text>
      <Text
        style={{
          position: 'absolute',
          top: baseY + H + gap * 1.6 + t + 26,
          left: baseX,
          fontSize: 6.5,
          color: C.muted,
        }}
      >
        Material: {cMat} · Shelves: {config.shelfCount} · Doors: {config.doorCount}
      </Text>
    </View>
  );
}
