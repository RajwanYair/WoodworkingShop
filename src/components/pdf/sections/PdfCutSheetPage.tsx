import { Page, Text, View } from '@react-pdf/renderer';
import type { CutSheet } from '../../../engine/types';
import { getMaterial } from '../../../engine/materials';
import { s, C } from '../pdf-tokens';
import type { PdfCtx } from '../pdf-i18n';
import { PageHeader, PageFooter } from './PageChrome';

interface PdfCutSheetPageProps {
  ctx: PdfCtx;
  sheet: CutSheet;
  totalSheets: number;
  isMultiCabinet: boolean;
}

export function PdfCutSheetPage({ ctx, sheet, totalSheets, isMultiCabinet }: PdfCutSheetPageProps) {
  const { T, fontFamily, fontFamilyBold, isRTL, lang, date, coverTitle, pageSize } = ctx;

  const mat = getMaterial(sheet.material);
  // ── Coordinate system note ──────────────────────────────────────────
  // The cut-optimizer uses: x → across sheetWidth, y → along sheetLength
  // (grain direction).  A standard 4×8 sheet has sheetWidth=1220 mm and
  // sheetLength=2440 mm, so isLandscape is almost always true.
  //
  // For LANDSCAPE sheets we rotate the diagram 90° so the long grain
  // direction runs left→right (matching how a sheet sits on a table):
  //   Diagram box : width = sheetLength * scale, height = sheetWidth * scale
  //   Part mapping : left = p.y * scale, top = p.x * scale,
  //                  rendered-width = p.length * scale, rendered-height = p.width * scale
  //
  // For PORTRAIT sheets (rare — sheetWidth ≥ sheetLength) the natural
  // orientation is already correct:
  //   Diagram box : width = sheetWidth * scale, height = sheetLength * scale
  //   Part mapping : left = p.x * scale, top = p.y * scale,
  //                  rendered-width = p.width * scale, rendered-height = p.length * scale
  const isLandscape = sheet.sheetLength > sheet.sheetWidth;

  const maxHoriz = isLandscape ? 700 : 460;
  const maxVert = isLandscape ? 380 : 600;
  const diagHorizMm = isLandscape ? sheet.sheetLength : sheet.sheetWidth;
  const diagVertMm = isLandscape ? sheet.sheetWidth : sheet.sheetLength;
  const scale = Math.min(maxHoriz / diagHorizMm, maxVert / diagVertMm);

  const diagW = diagHorizMm * scale;
  const diagH = diagVertMm * scale;

  const sectionLabel = isMultiCabinet ? T.projectCutPlan : T.cutSheetPage;

  return (
    <Page key={sheet.sheetIndex} size={pageSize} orientation={isLandscape ? 'landscape' : 'portrait'} style={s.page}>
      <PageHeader
        section={`✂️  ${sectionLabel} ${sheet.sheetIndex + 1} / ${totalSheets}`}
        projectName={coverTitle}
        lang={lang}
      />

      {/* Sheet title banner */}
      <View
        style={{
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <Text style={[s.sectionTitle, { fontFamily: fontFamilyBold, textAlign: isRTL ? 'right' : 'left' }]}>
          ✂️ {T.cutSheetPage} #{sheet.sheetIndex + 1} / {totalSheets} — {mat.name[lang]} ({sheet.thickness} mm)
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
            <Text style={{ fontSize: 8, color: C.muted, fontFamily }}>
              🔲 {sheet.parts.length} {T.parts}
            </Text>
          </View>
        </View>
      </View>

      {/* Sheet board diagram */}
      <View
        style={{
          width: diagW,
          height: diagH,
          borderWidth: 1.5,
          borderColor: C.primary,
          backgroundColor: mat.color ?? '#E8D5B0',
          position: 'relative',
          overflow: 'hidden',
          alignSelf: 'center',
        }}
      >
        {/* Grain direction lines */}
        {Array.from({ length: Math.floor(diagH / 12) }).map((_, gi) => (
          <View
            key={gi}
            style={{
              position: 'absolute',
              top: gi * 12,
              left: 0,
              width: diagW,
              height: 0.3,
              backgroundColor: 'rgba(0,0,0,0.06)',
            }}
          />
        ))}
        {sheet.parts.map((p, i) => {
          const pl = isLandscape ? p.y * scale : p.x * scale;
          const pt = isLandscape ? p.x * scale : p.y * scale;
          const pw = isLandscape ? p.length * scale : p.width * scale;
          const ph = isLandscape ? p.width * scale : p.length * scale;
          return (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: pl,
                top: pt,
                width: pw,
                height: ph,
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
                  fontSize: Math.min(7, Math.min(pw, ph) * 0.2),
                  fontFamily: 'Helvetica-Bold',
                  color: C.primary,
                }}
              >
                {p.partId}
              </Text>
              <Text style={{ fontSize: Math.min(5.5, Math.min(pw, ph) * 0.15), color: C.muted }}>
                {p.width}×{p.length}
              </Text>
            </View>
          );
        })}
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
}
