import { Page, Text, View } from '@react-pdf/renderer';
import type { CabinetConfig, OptimizationResult, HardwareItem } from '../../../engine/types';
import { s } from '../pdf-tokens';
import type { PdfCtx } from '../pdf-i18n';

interface PdfCoverPageProps {
  ctx: PdfCtx;
  config: CabinetConfig;
  cMatName: string;
  cMatThickness: number;
  optimization: OptimizationResult;
  hardware: HardwareItem[];
  cabinetCount: number;
}

export function PdfCoverPage({
  ctx,
  config,
  cMatName,
  cMatThickness,
  optimization,
  hardware,
  cabinetCount,
}: PdfCoverPageProps) {
  const { T, fontFamily, fontFamilyBold, textAlign, isRTL, date, coverTitle, pageSize } = ctx;
  const rowDir = isRTL ? ({ flexDirection: 'row-reverse' } as const) : {};
  return (
    <Page size={pageSize} style={[s.coverPage, { fontFamily }]}>
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
          <View style={[s.coverInfoRow, rowDir]}>
            <Text style={[s.coverInfoLabel, { fontFamily, textAlign }]}>📐 {T.dimensions}</Text>
            <Text style={[s.coverInfoValue, { fontFamily: fontFamilyBold, textAlign }]}>
              {config.width} × {config.height} × {config.depth} mm
            </Text>
          </View>
          <View style={[s.coverInfoRow, rowDir]}>
            <Text style={[s.coverInfoLabel, { fontFamily, textAlign }]}>🪵 {T.carcassMaterial}</Text>
            <Text style={[s.coverInfoValue, { fontFamily: fontFamilyBold, textAlign }]}>
              {cMatName} ({cMatThickness} mm)
            </Text>
          </View>
          <View style={[s.coverInfoRow, rowDir]}>
            <Text style={[s.coverInfoLabel, { fontFamily, textAlign }]}>🚪 {T.doorsShelves}</Text>
            <Text style={[s.coverInfoValue, { fontFamily: fontFamilyBold, textAlign }]}>
              {config.doorCount} {config.doorCount > 1 ? T.doors : T.door} · {config.shelfCount} {T.specShelves}
            </Text>
          </View>
          <View style={[s.coverInfoRow, rowDir]}>
            <Text style={[s.coverInfoLabel, { fontFamily, textAlign }]}>✂️ {T.cutSheets}</Text>
            <Text style={[s.coverInfoValue, { fontFamily: fontFamilyBold, textAlign }]}>
              {optimization.totalSheets} {optimization.totalSheets !== 1 ? T.sheets : T.sheet} ·{' '}
              {optimization.overallYield}% {T.yield}
            </Text>
          </View>
          <View style={[s.coverInfoRow, rowDir]}>
            <Text style={[s.coverInfoLabel, { fontFamily, textAlign }]}>🔩 {T.hardwareItems}</Text>
            <Text style={[s.coverInfoValue, { fontFamily: fontFamilyBold, textAlign }]}>
              {hardware.length} {hardware.length !== 1 ? T.itemTypePlural : T.itemType}
            </Text>
          </View>
          {cabinetCount > 1 && (
            <View style={[s.coverInfoRow, rowDir]}>
              <Text style={[s.coverInfoLabel, { fontFamily, textAlign }]}>🗄️ {T.cabinetsInProject}</Text>
              <Text style={[s.coverInfoValue, { fontFamily: fontFamilyBold, textAlign }]}>
                {cabinetCount} {T.cabinets}
              </Text>
            </View>
          )}
          <View style={[s.coverInfoRowLast, rowDir]}>
            <Text style={[s.coverInfoLabel, { fontFamily, textAlign }]}>📅 {T.generated}</Text>
            <Text style={[s.coverInfoValue, { fontFamily: fontFamilyBold, textAlign }]}>{date}</Text>
          </View>
        </View>
      </View>

      {/* Bottom dark strip */}
      <View style={[s.coverBottomStrip, rowDir]}>
        <Text style={[s.coverBottomText, { fontFamily }]}>🪵 {T.brandFooter}</Text>
        <Text style={[s.coverBottomDate, { fontFamily: fontFamilyBold }]}>{date}</Text>
      </View>
    </Page>
  );
}
