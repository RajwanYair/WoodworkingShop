import { Page, Text, View } from '@react-pdf/renderer';
import type { HardwareItem } from '../../../engine/types';
import { s, C, hwColWidths } from '../pdf-tokens';
import type { PdfCtx } from '../pdf-i18n';
import { PageHeader, PageFooter } from './PageChrome';

interface PdfHardwarePageProps {
  ctx: PdfCtx;
  hardware: HardwareItem[];
}

export function PdfHardwarePage({ ctx, hardware }: PdfHardwarePageProps) {
  const { T, fontFamily, fontFamilyBold, textAlign, lang, date, coverTitle, pageSize, orientation } = ctx;
  return (
    <Page size={pageSize} orientation={orientation} style={[s.page, { fontFamily }]}>
      <PageHeader section={`🔩  ${T.hardwareListTitle}`} projectName={coverTitle} lang={lang} />

      <Text style={[s.sectionTitle, { fontFamily: fontFamilyBold, textAlign }]}>
        🔩 {T.hardwareListTitle}{' '}
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
