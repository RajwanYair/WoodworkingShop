import { Page, Text, View } from '@react-pdf/renderer';
import type { Part } from '../../../engine/types';
import { getMaterial } from '../../../engine/materials';
import { s, C, partsColWidths, partsColWidthsWithoutRaw } from '../pdf-tokens';
import type { PdfCtx } from '../pdf-i18n';
import { PageHeader, PageFooter } from './PageChrome';

interface PdfPartsPageProps {
  ctx: PdfCtx;
  parts: Part[];
  showRawDimensions: boolean;
}

export function PdfPartsPage({ ctx, parts, showRawDimensions }: PdfPartsPageProps) {
  const { T, fontFamily, fontFamilyBold, textAlign, lang, date, coverTitle, pageSize, orientation } = ctx;
  const columns = showRawDimensions
    ? [
        T.thId,
        T.thPartName,
        T.thQty,
        T.thMaterial,
        T.thLength,
        T.thWidth,
        T.thRawLength,
        T.thRawWidth,
        T.thThickness,
        T.thEdgeBand,
      ]
    : [T.thId, T.thPartName, T.thQty, T.thMaterial, T.thLength, T.thWidth, T.thThickness, T.thEdgeBand];
  const columnWidths = showRawDimensions ? partsColWidths : partsColWidthsWithoutRaw;
  return (
    <Page size={pageSize} orientation={orientation} style={[s.page, { fontFamily }]}>
      <PageHeader section={`🔲  ${T.partsListTitle}`} projectName={coverTitle} lang={lang} />

      <Text style={[s.sectionTitle, { fontFamily: fontFamilyBold, textAlign }]}>
        {T.partsListTitle}{' '}
        <Text style={{ fontSize: 9, fontFamily, color: C.muted }}>
          — {parts.length} {T.partsTotal}
        </Text>
      </Text>

      <View style={s.tableHeader}>
        {columns.map((h, i) => (
          <Text key={i} style={[s.thText, { width: columnWidths[i], fontFamily: fontFamilyBold }]}>
            {h}
          </Text>
        ))}
      </View>

      {parts.map((p, i) => (
        <View key={p.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
          <Text style={[s.tdText, { width: columnWidths[0], color: C.accent, fontFamily: fontFamilyBold }]}>
            {p.id}
          </Text>
          <Text style={[s.tdText, { width: columnWidths[1], fontFamily }]}>{p.name[lang]}</Text>
          <Text style={[s.tdText, { width: columnWidths[2], textAlign: 'center' }]}>{p.qty}</Text>
          <Text style={[s.tdText, { width: columnWidths[3], color: C.secondary, fontFamily }]}>
            {getMaterial(p.material).name[lang]}
          </Text>
          <Text style={[s.tdText, { width: columnWidths[4] }]}>{p.length}</Text>
          <Text style={[s.tdText, { width: columnWidths[5] }]}>{p.width}</Text>
          {showRawDimensions && (
            <>
              <Text style={[s.tdText, { width: columnWidths[6] }]}>{p.rawLength ?? p.length}</Text>
              <Text style={[s.tdText, { width: columnWidths[7] }]}>{p.rawWidth ?? p.width}</Text>
            </>
          )}
          <Text style={[s.tdText, { width: columnWidths[showRawDimensions ? 8 : 6], textAlign: 'center' }]}>
            {p.thickness}
          </Text>
          <Text style={[s.tdText, { width: columnWidths[showRawDimensions ? 9 : 7], fontSize: 7, fontFamily }]}>
            {p.edgeBanding[lang]}
          </Text>
        </View>
      ))}

      <PageFooter date={date} lang={lang} />
    </Page>
  );
}
