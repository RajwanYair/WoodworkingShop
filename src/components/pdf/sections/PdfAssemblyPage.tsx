import { Page, Text, View } from '@react-pdf/renderer';
import type { CabinetConfig, DerivedDimensions } from '../../../engine/types';
import { s } from '../pdf-tokens';
import type { PdfCtx } from '../pdf-i18n';
import { assemblyStepsI18n } from '../pdf-helpers';
import { PageHeader, PageFooter } from './PageChrome';
import { ExplodedView } from './ExplodedView';

interface PdfAssemblyPageProps {
  ctx: PdfCtx;
  config: CabinetConfig;
  d: DerivedDimensions;
  cMatName: string;
  bMatName: string;
}

export function PdfExplodedPage({ ctx, config, d, cMatName, bMatName }: PdfAssemblyPageProps) {
  const { T, fontFamily: _ff, fontFamilyBold, textAlign, lang, date, coverTitle, pageSize, orientation } = ctx;
  return (
    <Page size={pageSize} orientation={orientation} style={s.page}>
      <PageHeader section={`🏗️  ${T.explodedView}`} projectName={coverTitle} lang={lang} />
      <Text style={[s.sectionTitle, { fontFamily: fontFamilyBold, textAlign }]}>🏗️ {T.explodedView}</Text>
      <ExplodedView config={config} dimensions={d} cMat={cMatName} bMat={bMatName} lang={lang} />
      <PageFooter date={date} lang={lang} />
    </Page>
  );
}

export function PdfAssemblyPage({ ctx, config, d, cMatName, bMatName }: PdfAssemblyPageProps) {
  const { T, fontFamily, fontFamilyBold, textAlign, isRTL, lang, date, coverTitle, pageSize, orientation } = ctx;
  const steps = assemblyStepsI18n(config, d, cMatName, bMatName, lang);
  return (
    <Page size={pageSize} orientation={orientation} style={s.page}>
      <PageHeader section={`🔨  ${T.assemblySequence}`} projectName={coverTitle} lang={lang} />
      <Text style={[s.sectionTitle, { fontFamily: fontFamilyBold, textAlign }]}>🔨 {T.assemblySequence}</Text>
      {steps.map((step, i) => (
        <View key={i} style={[s.assemblyStep, isRTL ? { flexDirection: 'row-reverse' } : {}]} wrap={false}>
          <View style={[s.stepBadge, isRTL ? { marginRight: 0, marginLeft: 10 } : {}]}>
            <Text style={s.stepBadgeText}>{i + 1}</Text>
          </View>
          <View style={s.stepContent}>
            <Text style={[s.stepTitle, { fontFamily: fontFamilyBold, textAlign }]}>
              {step.emoji} {step.title}
            </Text>
            <Text style={[s.stepDesc, { fontFamily, textAlign }]}>{step.description}</Text>
          </View>
        </View>
      ))}
      <PageFooter date={date} lang={lang} />
    </Page>
  );
}
