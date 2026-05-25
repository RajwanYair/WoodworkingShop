import { Text, View } from '@react-pdf/renderer';
import type { Lang } from '../../../engine/types';
import { s } from '../pdf-tokens';

export function PageHeader({
  section,
  projectName,
  lang = 'en',
}: {
  section: string;
  projectName: string;
  lang?: Lang;
}) {
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

export function PageFooter({ date, lang = 'en' }: { date: string; lang?: Lang }) {
  const isRTL = lang === 'he';
  const ff = isRTL ? 'NotoSansHebrew' : 'Helvetica';
  const ffBold = isRTL ? 'NotoSansHebrew' : 'Helvetica-Bold';
  const pageLabel = isRTL ? 'עמוד' : 'Page';
  return (
    <View style={[s.footer, isRTL ? { flexDirection: 'row-reverse' } : {}]} fixed>
      <Text style={[s.footerLeft, { fontFamily: ff }]}>🪵 {isRTL ? 'מתכנן ארונות' : 'Cabinet Planner'}</Text>
      <Text style={[s.footerCenter, { fontFamily: ff }]}>📅 {date}</Text>
      <Text
        style={[s.footerRight, { fontFamily: ffBold }]}
        render={({ pageNumber, totalPages }) => `${pageLabel} ${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}
