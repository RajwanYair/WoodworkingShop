import { Page, Text, View } from '@react-pdf/renderer';
import type { Part } from '../../../engine/types';
import { getMaterial } from '../../../engine/materials';
import { s, C, partsColWidths } from '../pdf-tokens';
import type { PdfCtx } from '../pdf-i18n';
import { PageHeader, PageFooter } from './PageChrome';

interface PdfPartsPageProps {
  ctx: PdfCtx;
  parts: Part[];
}

export function PdfPartsPage({ ctx, parts }: PdfPartsPageProps) {
  const { T, fontFamily, fontFamilyBold, textAlign, lang, date, coverTitle, pageSize, orientation } = ctx;
  return (
    <Page size={pageSize} orientation={orientation} style={[s.page, { fontFamily }]}>
      <PageHeader section={`🔲  ${T.partsListTitle}`} projectName={coverTitle} lang={lang} />

      <View style={[{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', gap: 4 }]}>
        <Text style={[s.sectionTitle, { fontFamily: 'Helvetica', flex: 0 }]}>🔲</Text>
        <Text style={[s.sectionTitle, { fontFamily: fontFamilyBold, textAlign }]}>
          {T.partsListTitle}{' '}
          <Text style={{ fontSize: 9, fontFamily, color: C.muted }}>
            — {parts.length} {T.partsTotal}
          </Text>
        </Text>
      </View>

      <View style={s.tableHeader}>
        {[T.thId, T.thPartName, T.thQty, T.thMaterial, T.thLength, T.thWidth, T.thThickness, T.thEdgeBand].map(
          (h, i) => (
            <Text key={i} style={[s.thText, { width: partsColWidths[i], fontFamily: fontFamilyBold }]}>
              {h}
            </Text>
          ),
        )}
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
  );
}
