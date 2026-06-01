import { Page, Text, View } from '@react-pdf/renderer';
import type { HardwareItem } from '../../../engine/types';
import { getMaterial } from '../../../engine/materials';
import { s, C, partsColWidths, hwColWidths } from '../pdf-tokens';
import type { PdfCtx } from '../pdf-i18n';
import type { CabinetPdfEntry } from '../CabinetPdfDocument';
import { PageHeader, PageFooter } from './PageChrome';

interface PdfMultiCabSectionProps {
  ctx: PdfCtx;
  allCabinetsData: CabinetPdfEntry[];
}

export function PdfMultiCabSection({ ctx, allCabinetsData }: PdfMultiCabSectionProps) {
  const { T, fontFamily, fontFamilyBold, textAlign, isRTL, lang, date, coverTitle, pageSize, orientation } = ctx;
  return (
    <>
      {allCabinetsData.map((cab, ci) => {
        const cabCMat = getMaterial(cab.config.carcassMaterial);
        const cabBMat = getMaterial(cab.config.backPanelMaterial);
        const cabLabel = `${T.cabinetOfPrefix} ${ci + 1} ${T.cabinetOfMiddle} ${allCabinetsData.length}`;
        const cabTitle = cab.name.trim() || cabLabel;
        return (
          <Page key={`cab-${ci}`} size={pageSize} orientation={orientation} style={[s.page, { fontFamily }]}>
            <PageHeader section={`🗄️  ${cabTitle}`} projectName={coverTitle} lang={lang} />

            {/* Cabinet section header */}
            <View
              style={{
                backgroundColor: C.headerBg,
                borderRadius: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                marginBottom: 10,
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 18 }}>🗄️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontFamily: fontFamilyBold, color: C.primary }}>{cabTitle}</Text>
                <Text style={{ fontSize: 8, color: C.muted, fontFamily }}>
                  {cab.config.width} × {cab.config.height} × {cab.config.depth} mm · {cabCMat.name[lang]} ·{' '}
                  {cab.parts.length} {T.partsTotal}
                </Text>
              </View>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: C.accent,
                  borderRadius: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ fontSize: 8, fontFamily: fontFamilyBold, color: C.accent }}>{cabLabel}</Text>
              </View>
            </View>

            {/* Compact specs row */}
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {[
                {
                  emoji: '📐',
                  label: T.specExternal,
                  val: `${cab.config.width}×${cab.config.height}×${cab.config.depth}`,
                },
                { emoji: '🪵', label: T.specCarcass, val: `${cabCMat.name[lang]} ${cabCMat.thickness}mm` },
                { emoji: '🗂️', label: T.specBackPanel, val: `${cabBMat.name[lang]} ${cabBMat.thickness}mm` },
                { emoji: '🚪', label: T.specDoorStyle, val: `${cab.config.doorCount} × ${cab.config.doorStyle}` },
                { emoji: '📚', label: T.specShelfCount, val: String(cab.config.shelfCount) },
                { emoji: '📏', label: T.specEdgeBandingTotal, val: `${(cab.edgeBandingTotal / 1000).toFixed(1)} m` },
              ].map(({ emoji, label, val }) => (
                <View
                  key={label}
                  style={{
                    borderWidth: 0.5,
                    borderColor: C.border,
                    borderRadius: 4,
                    paddingHorizontal: 6,
                    paddingVertical: 4,
                    backgroundColor: C.tableOdd,
                  }}
                >
                  <Text style={{ fontSize: 7, color: C.muted, fontFamily }}>
                    {emoji} {label}
                  </Text>
                  <Text style={{ fontSize: 9, fontFamily: fontFamilyBold, color: C.text }}>{val}</Text>
                </View>
              ))}
            </View>

            {/* Parts list for this cabinet */}
            <Text style={[s.sectionSubtitle, { fontFamily: fontFamilyBold, textAlign }]}>
              🔲 {T.partsListTitle} — {cab.parts.length} {T.partsTotal}
            </Text>
            <View style={s.tableHeader}>
              {[T.thId, T.thPartName, T.thQty, T.thMaterial, T.thLength, T.thWidth, T.thThickness, T.thEdgeBand].map(
                (h, i) => (
                  <Text key={i} style={[s.thText, { width: partsColWidths[i], fontFamily: fontFamilyBold }]}>
                    {h}
                  </Text>
                ),
              )}
            </View>
            {cab.parts.map((p, i) => (
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
                <Text style={[s.tdText, { width: partsColWidths[7], fontSize: 7, fontFamily }]}>
                  {p.edgeBanding[lang]}
                </Text>
              </View>
            ))}

            <PageFooter date={date} lang={lang} />
          </Page>
        );
      })}
    </>
  );
}

interface PdfMultiCabHardwarePageProps {
  ctx: PdfCtx;
  hardware: HardwareItem[];
}

export function PdfMultiCabHardwarePage({ ctx, hardware }: PdfMultiCabHardwarePageProps) {
  const { T, fontFamily, fontFamilyBold, textAlign, lang, date, coverTitle, pageSize, orientation } = ctx;
  return (
    <Page size={pageSize} orientation={orientation} style={[s.page, { fontFamily }]}>
      <PageHeader section={`🔩  ${T.projectHardware}`} projectName={coverTitle} lang={lang} />
      <Text style={[s.sectionTitle, { fontFamily: fontFamilyBold, textAlign }]}>
        🔩 {T.projectHardware}{' '}
        <Text style={{ fontSize: 9, fontFamily, color: C.muted }}>
          — {hardware.length} {T.itemTypes}
        </Text>
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
  );
}
