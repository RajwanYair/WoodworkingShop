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
  // (grain direction).  Standard sheet: sheetWidth=1220 mm, sheetLength=2440 mm.
  //
  // Cut-sheet pages are ALWAYS rendered in landscape so the long axis sits
  // horizontally (matching how a sheet rests on a table saw).  We normalise
  // by identifying which axis is longer:
  //
  //   yIsHorizontal = true  (sheetLength ≥ sheetWidth — normal case):
  //     Diagram : width = sheetLength * scale, height = sheetWidth * scale
  //     left = p.y * scale, top = p.x * scale
  //     rendered-w = p.length * scale, rendered-h = p.width * scale
  //
  //   yIsHorizontal = false (sheetWidth > sheetLength — custom-override case):
  //     Diagram : width = sheetWidth * scale, height = sheetLength * scale
  //     left = p.x * scale, top = p.y * scale
  //     rendered-w = p.width * scale, rendered-h = p.length * scale
  const longDim = Math.max(sheet.sheetLength, sheet.sheetWidth);
  const shortDim = Math.min(sheet.sheetLength, sheet.sheetWidth);
  const yIsHorizontal = sheet.sheetLength >= sheet.sheetWidth;

  const maxHoriz = 740;
  const maxVert = 390;
  const scale = Math.min(maxHoriz / longDim, maxVert / shortDim);

  const diagW = longDim * scale;
  const diagH = shortDim * scale;

  const sectionLabel = isMultiCabinet ? T.projectCutPlan : T.cutSheetPage;

  return (
    <Page key={sheet.sheetIndex} size={pageSize} orientation="landscape" style={[s.page, { fontFamily }]}>
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
            <View style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 8, fontFamily: 'Helvetica', flex: 0, color: C.primary }}>📊</Text>
              <Text style={{ fontSize: 8, fontFamily: fontFamilyBold, color: C.primary }}>
                {sheet.yieldPercent}% {T.yield}
              </Text>
            </View>
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
            <View style={[{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 4 }]}>
              <Text style={{ fontSize: 8, color: C.muted, fontFamily: 'Helvetica', flex: 0 }}>🔲</Text>
              <Text style={{ fontSize: 8, color: C.muted, fontFamily }}>
                {sheet.parts.length} {T.parts}
              </Text>
            </View>
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
          const pl = (yIsHorizontal ? p.y : p.x) * scale;
          const pt = (yIsHorizontal ? p.x : p.y) * scale;
          const pw = (yIsHorizontal ? p.length : p.width) * scale;
          const ph = (yIsHorizontal ? p.width : p.length) * scale;
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
                  fontFamily: fontFamilyBold,
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
            <Text style={{ fontSize: 7, fontFamily: fontFamilyBold, color: C.accent }}>{p.partId}</Text>
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
