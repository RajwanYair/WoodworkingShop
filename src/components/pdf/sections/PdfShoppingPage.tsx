import { Page, Text, View } from '@react-pdf/renderer';
import type { HardwareItem, OptimizationResult } from '../../../engine/types';
import { s, C } from '../pdf-tokens';
import type { PdfCtx } from '../pdf-i18n';
import { sheetSummary } from '../pdf-helpers';
import { PageHeader, PageFooter } from './PageChrome';

interface PdfShoppingPageProps {
  ctx: PdfCtx;
  optimization: OptimizationResult;
  hardware: HardwareItem[];
  edgeBandingTotal: number;
}

export function PdfShoppingPage({ ctx, optimization, hardware, edgeBandingTotal }: PdfShoppingPageProps) {
  const { T, fontFamily, fontFamilyBold, textAlign, lang, date, coverTitle, pageSize, orientation } = ctx;
  const rows = sheetSummary(optimization, lang);
  return (
    <Page size={pageSize} orientation={orientation} style={s.page}>
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
      {rows.map((row, i) => (
        <View key={i} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
          <Text style={[s.tdText, { width: '50%', fontFamily: fontFamilyBold }]}>{row.material}</Text>
          <Text style={[s.tdText, { width: '32%', color: C.muted }]}>{row.size}</Text>
          <Text style={[s.tdText, { width: '18%', textAlign: 'center' }]}>{row.qty}</Text>
        </View>
      ))}

      <Text style={[s.sectionSubtitle, { marginTop: 14, fontFamily: fontFamilyBold, textAlign }]}>
        🔩 {T.hardwareListTitle}
      </Text>
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
          <Text style={[s.guideText, { fontFamily, textAlign }]}>
            {T.edgeBandingRequired} {(edgeBandingTotal / 1000).toFixed(1)} {T.metres}
          </Text>
        </View>
      )}

      <PageFooter date={date} lang={lang} />
    </Page>
  );
}
