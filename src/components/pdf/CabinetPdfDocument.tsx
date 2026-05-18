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
  const cMat = getMaterial(config.carcassMaterial);
  const bMat = getMaterial(config.backPanelMaterial);
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const coverTitle = projectName?.trim() ? projectName.trim() : 'Cabinet Build Plan';
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
            <Text style={s.coverMainTitle}>CABINET BUILD PLAN</Text>
            <View style={s.coverGoldLine} />
            <Text style={s.coverProjectName}>{coverTitle}</Text>
          </View>

          {/* Mid body with info box */}
          <View style={s.coverMidBody}>
            <View style={s.coverInfoBox}>
              <View style={s.coverInfoRow}>
                <Text style={s.coverInfoLabel}>📐 Dimensions</Text>
                <Text style={s.coverInfoValue}>
                  {config.width} × {config.height} × {config.depth} mm
                </Text>
              </View>
              <View style={s.coverInfoRow}>
                <Text style={s.coverInfoLabel}>🪵 Carcass material</Text>
                <Text style={s.coverInfoValue}>
                  {cMat.name[lang]} ({cMat.thickness} mm)
                </Text>
              </View>
              <View style={s.coverInfoRow}>
                <Text style={s.coverInfoLabel}>🚪 Doors / shelves</Text>
                <Text style={s.coverInfoValue}>
                  {config.doorCount} door{config.doorCount > 1 ? 's' : ''} · {config.shelfCount} shelf/shelves
                </Text>
              </View>
              <View style={s.coverInfoRow}>
                <Text style={s.coverInfoLabel}>✂️ Cut sheets</Text>
                <Text style={s.coverInfoValue}>
                  {optimization.totalSheets} sheet{optimization.totalSheets !== 1 ? 's' : ''} ·{' '}
                  {optimization.overallYield}% yield
                </Text>
              </View>
              <View style={s.coverInfoRow}>
                <Text style={s.coverInfoLabel}>🔩 Hardware items</Text>
                <Text style={s.coverInfoValue}>
                  {hardware.length} item type{hardware.length !== 1 ? 's' : ''}
                </Text>
              </View>
              {cabinetCount > 1 && (
                <View style={s.coverInfoRow}>
                  <Text style={s.coverInfoLabel}>🗄️ Cabinets in project</Text>
                  <Text style={s.coverInfoValue}>{cabinetCount} cabinets</Text>
                </View>
              )}
              <View style={s.coverInfoRowLast}>
                <Text style={s.coverInfoLabel}>📅 Generated</Text>
                <Text style={s.coverInfoValue}>{date}</Text>
              </View>
            </View>
          </View>

          {/* Bottom dark strip */}
          <View style={s.coverBottomStrip}>
            <Text style={s.coverBottomText}>🪵 Cabinet Planner — Interactive Woodworking Design Tool</Text>
            <Text style={s.coverBottomDate}>{date}</Text>
          </View>
        </Page>
      )}

      {/* ══════════════════════════════════════════════════════
          PAGE 2  —  Specifications
         ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader section="📐  Specifications" projectName={coverTitle} />

        <Text style={s.sectionTitle}>📐 Cabinet Specifications</Text>

        <Text style={s.specGroupTitle}>📏 Dimensions</Text>
        <View style={s.specGroup}>
          <SpecRow label="External (W × H × D)" value={`${config.width} × ${config.height} × ${config.depth} mm`} />
          <SpecRow label="Internal width" value={`${d.internalWidth} mm`} />
          <SpecRow label="Internal height" value={`${d.internalHeight} mm`} />
          <SpecRow label="Shelf depth" value={`${d.shelfDepth} mm`} />
          <SpecRow label="Shelf width" value={`${d.shelfWidth} mm`} />
        </View>

        <Text style={s.specGroupTitle}>🪵 Materials</Text>
        <View style={s.specGroup}>
          <SpecRow label="Carcass material" value={`${cMat.name[lang]} (${cMat.thickness} mm)`} />
          <SpecRow label="Back panel material" value={`${bMat.name[lang]} (${bMat.thickness} mm)`} />
          <SpecRow label="Edge banding" value={config.edgeBanding} />
          <SpecRow label="Edge banding total" value={`${(edgeBandingTotal / 1000).toFixed(1)} m`} />
        </View>

        <Text style={s.specGroupTitle}>🚪 Doors & Hardware</Text>
        <View style={s.specGroup}>
          <SpecRow label="Door style" value={config.doorStyle} />
          <SpecRow label="Door count" value={String(config.doorCount)} />
          <SpecRow label="Door dimensions" value={`${Math.round(d.doorWidth)} × ${Math.round(d.doorHeight)} mm`} />
          <SpecRow label="Door reveal" value={`${config.doorReveal} mm`} />
          <SpecRow label="Hinges per door" value={String(d.hingesPerDoor)} />
          <SpecRow label="Handle style" value={config.handleStyle} />
        </View>

        <Text style={s.specGroupTitle}>📚 Shelves</Text>
        <View style={s.specGroup}>
          <SpecRow label="Shelf count" value={String(config.shelfCount)} />
          <SpecRow label="Shelf spacing" value={config.shelfSpacing} />
          <SpecRow label="Back panel" value={`${Math.round(d.backPanelWidth)} × ${Math.round(d.backPanelHeight)} mm`} />
        </View>

        <Text style={[s.sectionTitle, { marginTop: 14 }]}>📊 Cut Sheet Summary</Text>
        <View style={s.statRow}>
          <View style={s.statBox}>
            <Text style={s.statEmoji}>📋</Text>
            <Text style={s.statValue}>{optimization.totalSheets}</Text>
            <Text style={s.statLabel}>Sheets Required</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statEmoji}>📊</Text>
            <Text style={s.statValue}>{optimization.overallYield}%</Text>
            <Text style={s.statLabel}>Material Yield</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statEmoji}>♻️</Text>
            <Text style={s.statValue}>{(optimization.totalWaste / 1_000_000).toFixed(2)}</Text>
            <Text style={s.statLabel}>Waste (m²)</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statEmoji}>🔩</Text>
            <Text style={s.statValue}>{hardware.length}</Text>
            <Text style={s.statLabel}>Hardware Types</Text>
          </View>
        </View>

        <PageFooter date={date} />
      </Page>

      {/* ══════════════════════════════════════════════════════
          PAGE 3  —  Parts List
         ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader section="🔲  Parts List" projectName={coverTitle} />

        <Text style={s.sectionTitle}>
          🔲 Parts List{' '}
          <Text style={{ fontSize: 9, fontFamily: 'Helvetica', color: C.muted }}>— {parts.length} parts total</Text>
        </Text>

        <View style={s.tableHeader}>
          {['ID', 'Part Name', 'Qty', 'Material', 'Length', 'Width', 'Thick.', 'Edge Band'].map((h, i) => (
            <Text key={i} style={[s.thText, { width: partsColWidths[i] }]}>
              {h}
            </Text>
          ))}
        </View>

        {parts.map((p, i) => (
          <View key={p.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
            <Text style={[s.tdText, { width: partsColWidths[0], color: C.accent, fontFamily: 'Helvetica-Bold' }]}>
              {p.id}
            </Text>
            <Text style={[s.tdText, { width: partsColWidths[1] }]}>{p.name[lang]}</Text>
            <Text style={[s.tdText, { width: partsColWidths[2], textAlign: 'center' }]}>{p.qty}</Text>
            <Text style={[s.tdText, { width: partsColWidths[3], color: C.secondary }]}>
              {getMaterial(p.material).name[lang]}
            </Text>
            <Text style={[s.tdText, { width: partsColWidths[4] }]}>{p.length}</Text>
            <Text style={[s.tdText, { width: partsColWidths[5] }]}>{p.width}</Text>
            <Text style={[s.tdText, { width: partsColWidths[6], textAlign: 'center' }]}>{p.thickness}</Text>
            <Text style={[s.tdText, { width: partsColWidths[7], fontSize: 7 }]}>{p.edgeBanding[lang]}</Text>
          </View>
        ))}

        <PageFooter date={date} />
      </Page>

      {/* ══════════════════════════════════════════════════════
          PAGE 4  —  Hardware List
         ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader section="🔩  Hardware List" projectName={coverTitle} />

        <Text style={s.sectionTitle}>
          🔩 Hardware List{' '}
          <Text style={{ fontSize: 9, fontFamily: 'Helvetica', color: C.muted }}>— {hardware.length} item types</Text>
        </Text>

        <View style={s.tableHeader}>
          {['Item', 'Qty', 'Unit', 'Notes'].map((h, i) => (
            <Text key={i} style={[s.thText, { width: hwColWidths[i] }]}>
              {h}
            </Text>
          ))}
        </View>

        {hardware.map((hw, i) => (
          <View key={hw.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
            <Text style={[s.tdText, { width: hwColWidths[0], fontFamily: 'Helvetica-Bold' }]}>{hw.name[lang]}</Text>
            <Text style={[s.tdText, { width: hwColWidths[1], textAlign: 'center' }]}>{hw.qty}</Text>
            <Text style={[s.tdText, { width: hwColWidths[2], color: C.muted }]}>{hw.unit[lang]}</Text>
            <Text style={[s.tdText, { width: hwColWidths[3], fontSize: 7, color: C.muted }]}>{hw.id}</Text>
          </View>
        ))}

        <PageFooter date={date} />
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
              section={`✂️  Cut Sheet ${sheet.sheetIndex + 1} / ${optimization.sheets.length}`}
              projectName={coverTitle}
            />

            {/* Sheet title banner */}
            <View
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}
            >
              <Text style={s.sectionTitle}>
                ✂️ Sheet #{sheet.sheetIndex + 1} — {mat.name[lang]} ({sheet.thickness} mm)
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
                  <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.primary }}>
                    📊 {sheet.yieldPercent}% yield
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
                  <Text style={{ fontSize: 8, color: C.muted }}>🔲 {sheet.parts.length} parts</Text>
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

            <PageFooter date={date} />
          </Page>
        );
      })}

      {/* ══════════════════════════════════════════════════════
          DRILLING & BORING GUIDE
         ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader section="🔧  Drilling Guide" projectName={coverTitle} />

        <Text style={s.sectionTitle}>🔧 Drilling &amp; Boring Guide</Text>

        <Text style={s.sectionSubtitle}>🪛 Hinge Cup Boring</Text>
        <Text style={s.guideText}>• Bore 35 mm diameter cups, 12 mm deep on door inside face</Text>
        <Text style={s.guideText}>• Hinge cup centre: 22.5 mm from door edge</Text>
        <Text style={s.guideText}>• {d.hingesPerDoor} hinge(s) per door — positions from top:</Text>
        {d.hingePositions.map((pos, i) => (
          <Text key={i} style={s.guideIndent}>
            ↳ Hinge {i + 1}: {pos} mm from top
          </Text>
        ))}

        <Text style={s.sectionSubtitle}>🔩 Mounting Plates</Text>
        <Text style={s.guideText}>• Fix mounting plates on side panels, aligned with hinge positions</Text>
        <Text style={s.guideText}>• Plate centre: 37 mm from panel front edge</Text>
        <Text style={s.guideText}>• Pre-drill 3 mm pilot holes for plate screws</Text>

        <Text style={s.sectionSubtitle}>📌 Shelf Pin Holes (System 32)</Text>
        <Text style={s.guideText}>• Drill 5 mm holes, 10 mm deep, on both side panels (inner face)</Text>
        <Text style={s.guideText}>
          {'• Two columns per side: 37 mm and '}
          {d.internalWidth > 400 ? d.shelfDepth - 37 : Math.round(d.shelfDepth / 2)}
          {' mm from front edge'}
        </Text>
        <Text style={s.guideText}>• Spacing: 32 mm on-centre (System 32 line boring)</Text>
        <Text style={s.guideText}>• First hole: 37 mm from bottom of internal space</Text>
        <Text style={s.guideText}>
          {'• Total rows: '}
          {Math.max(1, Math.floor((d.internalHeight - 74) / 32) + 1)}
          {' per column'}
        </Text>

        <Text style={s.sectionSubtitle}>🪛 Confirmat / Assembly Screws</Text>
        <Text style={s.guideText}>• Pre-drill 5 mm through-holes on outer face of top/bottom panels</Text>
        <Text style={s.guideText}>• Pilot drill 3.5 mm × 40 mm into end-grain of side panels</Text>
        <Text style={s.guideText}>• Spacing: ~150 mm apart along each joint</Text>
        <Text style={s.guideText}>• First/last confirmat: ~50 mm from panel edge</Text>

        <Text style={s.sectionSubtitle}>🗂️ Back Panel</Text>
        <Text style={s.guideText}>
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
        <Text style={s.guideText}>
          {'• Fix into 10 × '}
          {bMat.thickness}
          {' mm rabbet, or staple/nail at ~150 mm intervals'}
        </Text>

        <PageFooter date={date} />
      </Page>

      {/* ══════════════════════════════════════════════════════
          EXPLODED VIEW
         ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader section="🏗️  Exploded View" projectName={coverTitle} />

        <Text style={s.sectionTitle}>🏗️ Exploded Assembly View</Text>
        <ExplodedView config={config} dimensions={d} cMat={cMat.name[lang]} bMat={bMat.name[lang]} />
        <PageFooter date={date} />
      </Page>

      {/* ══════════════════════════════════════════════════════
          ASSEMBLY SEQUENCE
         ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader section="🔨  Assembly Sequence" projectName={coverTitle} />

        <Text style={s.sectionTitle}>🔨 Assembly Sequence</Text>

        {assemblySteps(config, d, cMat.name[lang], bMat.name[lang]).map((step, i) => (
          <View key={i} style={s.assemblyStep} wrap={false}>
            <View style={s.stepBadge}>
              <Text style={s.stepBadgeText}>{i + 1}</Text>
            </View>
            <View style={s.stepContent}>
              <Text style={s.stepTitle}>
                {step.emoji} {step.title}
              </Text>
              <Text style={s.stepDesc}>{step.description}</Text>
            </View>
          </View>
        ))}

        <PageFooter date={date} />
      </Page>

      {/* ══════════════════════════════════════════════════════
          SHOPPING LIST
         ══════════════════════════════════════════════════════ */}
      <Page size="A4" style={s.page}>
        <PageHeader section="🛒  Shopping List" projectName={coverTitle} />

        <Text style={s.sectionTitle}>🛒 Shopping List</Text>

        <Text style={s.sectionSubtitle}>🪵 Sheet Goods</Text>
        <View style={s.tableHeader}>
          {['Material', 'Size (mm)', 'Qty'].map((h, i) => (
            <Text key={i} style={[s.thText, { width: ['50%', '32%', '18%'][i] }]}>
              {h}
            </Text>
          ))}
        </View>
        {sheetSummary(optimization, lang).map((row, i) => (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
            <Text style={[s.tdText, { width: '50%', fontFamily: 'Helvetica-Bold' }]}>{row.material}</Text>
            <Text style={[s.tdText, { width: '32%', color: C.muted }]}>{row.size}</Text>
            <Text style={[s.tdText, { width: '18%', textAlign: 'center' }]}>{row.qty}</Text>
          </View>
        ))}

        <Text style={[s.sectionSubtitle, { marginTop: 14 }]}>🔩 Hardware</Text>
        <View style={s.tableHeader}>
          {['Item', 'Qty', 'Unit'].map((h, i) => (
            <Text key={i} style={[s.thText, { width: ['55%', '20%', '25%'][i] }]}>
              {h}
            </Text>
          ))}
        </View>
        {hardware.map((hw, i) => (
          <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
            <Text style={[s.tdText, { width: '55%' }]}>{hw.name[lang]}</Text>
            <Text style={[s.tdText, { width: '20%', textAlign: 'center' }]}>{hw.qty}</Text>
            <Text style={[s.tdText, { width: '25%', color: C.muted }]}>{hw.unit[lang]}</Text>
          </View>
        ))}

        {edgeBandingTotal > 0 && (
          <View style={{ marginTop: 14 }}>
            <Text style={s.sectionSubtitle}>🎀 Edge Banding</Text>
            <Text style={s.guideText}>Total edge banding required: {(edgeBandingTotal / 1000).toFixed(1)} metres</Text>
          </View>
        )}

        <PageFooter date={date} />
      </Page>
    </Document>
  );
}

// ══════════════════════════════════════════════════════════════
//  Sub-components
// ══════════════════════════════════════════════════════════════

function PageHeader({ section, projectName }: { section: string; projectName: string }) {
  return (
    <View style={s.pageHeader} fixed>
      <Text style={s.pageHeaderBrand}>🪵 Cabinet Planner</Text>
      <Text style={s.pageHeaderSection}>{section}</Text>
      <Text style={s.pageHeaderRight}>{projectName}</Text>
    </View>
  );
}

function PageFooter({ date }: { date: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerLeft}>🪵 Cabinet Planner</Text>
      <Text style={s.footerCenter}>📅 {date}</Text>
      <Text style={s.footerRight} render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
    </View>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.specRow}>
      <Text style={s.specLabel}>{label}</Text>
      <Text style={s.specValue}>{value}</Text>
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

function assemblySteps(
  config: CabinetConfig,
  d: DerivedDimensions,
  carcassName: string,
  backName: string,
): AssemblyStep[] {
  const steps: AssemblyStep[] = [
    {
      emoji: '✂️',
      title: 'Prepare all panels',
      description: `Cut all parts per the cut list. Sand faces to 180 grit. Apply edge banding (${config.edgeBanding}) to all designated edges.`,
    },
    {
      emoji: '📌',
      title: 'Drill shelf pin holes',
      description: `Drill 5 mm × 10 mm holes on both side panels (inner face), 32 mm apart, two columns per side. Use a line-boring jig for precision.`,
    },
    {
      emoji: '🔧',
      title: 'Pre-drill confirmat holes',
      description: `Drill 5 mm through-holes on top and bottom panels. Drill 3.5 mm × 40 mm pilot holes into side panel end-grain. Mark positions ~50 mm from edges, ~150 mm apart.`,
    },
    {
      emoji: '🏗️',
      title: 'Assemble the carcass box',
      description: `Join side panels to top and bottom with confirmat screws. Use ${carcassName} panels. Internal width: ${d.internalWidth} mm. Verify square with diagonal measurements — both diagonals must match.`,
    },
  ];

  if (config.height > 1200) {
    steps.push({
      emoji: '📐',
      title: 'Install fixed centre shelf',
      description: `Install the fixed structural shelf at mid-height (required for cabinets > 1200 mm tall). Secure with confirmats through both side panels.`,
    });
  }

  steps.push(
    {
      emoji: '🗂️',
      title: 'Attach back panel',
      description: `Fit the ${backName} back panel (${Math.round(d.backPanelWidth)} × ${Math.round(d.backPanelHeight)} mm) into the rabbet or staple/nail at ~150 mm intervals. The back panel keeps the carcass square — check again before fastening.`,
    },
    {
      emoji: '🪛',
      title: 'Bore hinge cups on doors',
      description: `Bore 35 mm cups, 12 mm deep, centre 22.5 mm from door edge. ${d.hingesPerDoor} hinges per door at positions: ${d.hingePositions.join(', ')} mm from top.`,
    },
    {
      emoji: '🔩',
      title: 'Mount hinge plates on carcass',
      description: `Screw mounting plates on side panels aligned with hinge positions. Plate centre: 37 mm from front edge. Pre-drill pilot holes.`,
    },
    {
      emoji: '🚪',
      title: 'Hang doors and adjust',
      description: `Clip hinges into mounting plates. Adjust 3-way (in/out, up/down, lateral) until doors are flush with ${config.doorReveal} mm reveal all around.`,
    },
    {
      emoji: '📚',
      title: 'Install shelf pins and shelves',
      description: `Insert shelf pins at desired heights. Place ${config.shelfCount} adjustable shelf/shelves (${d.shelfWidth} × ${d.shelfDepth} mm).`,
    },
  );

  if (config.handleStyle !== 'none') {
    steps.push({
      emoji: '🖐️',
      title: 'Install handles',
      description: `Mount ${config.handleStyle} handles on door(s). For bar handles use 128 mm or 160 mm centre-to-centre. Pre-drill before fastening to avoid tear-out.`,
    });
  }

  steps.push({
    emoji: '✅',
    title: 'Final checks',
    description: `Verify all doors open and close smoothly with consistent reveal. Check shelf levels with a spirit level. Tighten any loose confirmats. Clean all sawdust.`,
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
}: {
  config: CabinetConfig;
  dimensions: DerivedDimensions;
  cMat: string;
  bMat: string;
}) {
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
      <Text style={{ fontSize: 8, color: C.muted, marginBottom: 6 }}>
        Parts shown separated for clarity — arrows indicate assembly direction.
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
      {partBox(baseY, baseX - gap - t, t, H, '#D2B48C', 'Side L')}
      {lbl('① Left', baseY - 11, baseX - gap - t)}
      {arrow(baseY + H / 2 - 6, baseX - gap + 2, '→')}

      {/* ② Right side */}
      {partBox(baseY, baseX + W + gap, t, H, '#D2B48C', 'Side R')}
      {lbl('② Right', baseY - 11, baseX + W + gap)}
      {arrow(baseY + H / 2 - 6, baseX + W + gap - 14, '←')}

      {/* ③ Top panel */}
      {partBox(baseY - gap - t, baseX + t, W - 2 * t, t, '#DEB887', 'Top panel')}
      {lbl('③ Top', baseY - gap - t - 11, baseX + t)}
      {arrow(baseY - gap, baseX + W / 2 - 5, '↓')}

      {/* ④ Bottom panel */}
      {partBox(baseY + H + gap, baseX + t, W - 2 * t, t, '#DEB887', 'Bottom panel')}
      {lbl('④ Bottom', baseY + H + gap + t + 3, baseX + t)}
      {arrow(baseY + H + gap - 14, baseX + W / 2 - 5, '↑')}

      {/* Shelves inside ghost */}
      {config.shelfCount > 0 &&
        Array.from({ length: Math.min(config.shelfCount, 5) }).map((_, i) => {
          const sy = baseY + (H / (config.shelfCount + 1)) * (i + 1);
          return partBox(sy - t / 2, baseX + t + 2, W - 2 * t - 4, t, '#F5DEB3', `Shelf ${i + 1}`);
        })}

      {/* ⑤ Back panel */}
      {partBox(baseY + 4, baseX + W + gap * 2.8, W * 0.12, H - 8, '#C8B090', `Back\n${bMat}`)}
      {lbl('⑤ Back', baseY - 11, baseX + W + gap * 2.8)}

      {/* ⑥ Door(s) */}
      {config.doorStyle !== 'none' &&
        Array.from({ length: config.doorCount }).map((_, i) => {
          const dw = (W / config.doorCount) * 0.88;
          const dx = baseX + (W / config.doorCount) * i + (W / config.doorCount) * 0.06;
          return partBox(baseY + H + gap * 2.8, dx, dw, H * 0.14, '#E8D5B7', `Door ${i + 1}`);
        })}
      {config.doorStyle !== 'none' && lbl('⑥ Door(s)', baseY + H + gap * 2.8 - 11, baseX)}

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
