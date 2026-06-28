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
      {/* Separate emoji from text to avoid bidi algorithm conflicts with RTL */}
      <View style={[{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
        <Text style={[s.pageHeaderBrand, { fontFamily: 'Helvetica', flex: 0 }]}>🪵</Text>
        <Text style={[s.pageHeaderBrand, { fontFamily: ffBold }]}>{isRTL ? 'מתכנן ארונות' : 'Cabinet Planner'}</Text>
      </View>
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
      {/* Separate emoji from text to avoid bidi algorithm conflicts with RTL */}
      <View style={[{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
        <Text style={[s.footerLeft, { fontFamily: 'Helvetica', flex: 0 }]}>🪵</Text>
        <Text style={[s.footerLeft, { fontFamily: ff }]}>{isRTL ? 'מתכנן ארונות' : 'Cabinet Planner'}</Text>
      </View>
      {/* Separate calendar emoji from date text */}
      <View style={[{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
        <Text style={[s.footerCenter, { fontFamily: 'Helvetica', flex: 0 }]}>📅</Text>
        <Text style={[s.footerCenter, { fontFamily: ff }]}>{date}</Text>
      </View>
      <Text
        style={[s.footerRight, { fontFamily: ffBold }]}
        render={({ pageNumber, totalPages }) => `${pageLabel} ${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}
