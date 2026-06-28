import { Page, Text, View } from '@react-pdf/renderer';
import type { DerivedDimensions } from '../../../engine/types';
import { getMaterial } from '../../../engine/materials';
import { s } from '../pdf-tokens';
import type { PdfCtx } from '../pdf-i18n';
import { PageHeader, PageFooter } from './PageChrome';

interface PdfDrillingPageProps {
  ctx: PdfCtx;
  d: DerivedDimensions;
  backPanelMaterial: string;
}

export function PdfDrillingPage({ ctx, d, backPanelMaterial }: PdfDrillingPageProps) {
  const { T, fontFamily, fontFamilyBold, textAlign, isRTL, lang, date, coverTitle, pageSize, orientation } = ctx;
  const bMat = getMaterial(backPanelMaterial);
  return (
    <Page size={pageSize} orientation={orientation} style={[s.page, { fontFamily }]}>
      <PageHeader section={`🔧  ${T.drillingGuide}`} projectName={coverTitle} lang={lang} />

      <View style={[{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
        <Text style={[s.sectionTitle, { fontFamily: 'Helvetica', flex: 0 }]}>🔧</Text>
        <Text style={[s.sectionTitle, { fontFamily: fontFamilyBold, textAlign }]}>{T.drillingGuide}</Text>
      </View>

      <View style={[{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
        <Text style={[s.sectionSubtitle, { fontFamily: 'Helvetica', flex: 0 }]}>🪛</Text>
        <Text style={[s.sectionSubtitle, { fontFamily: fontFamilyBold, textAlign }]}>{T.hingeCupBoring}</Text>
      </View>
      <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.hingeCupDesc1}</Text>
      <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.hingeCupDesc2}</Text>
      <Text style={[s.guideText, { fontFamily, textAlign }]}>
        • {d.hingesPerDoor} {T.hingePositions}
      </Text>
      {d.hingePositions.map((pos, i) => (
        <Text key={i} style={[s.guideIndent, { fontFamily }]}>
          {isRTL ? `← ציר ${i + 1}: ${pos} מ"מ ${T.hingeFromTop}` : `↳ Hinge ${i + 1}: ${pos} mm ${T.hingeFromTop}`}
        </Text>
      ))}

      <Text style={[s.sectionSubtitle, { fontFamily: fontFamilyBold, textAlign }]}>🔩 {T.mountingPlates}</Text>
      <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.mountPlateDesc1}</Text>
      <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.mountPlateDesc2}</Text>
      <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.mountPlateDesc3}</Text>

      <Text style={[s.sectionSubtitle, { fontFamily: fontFamilyBold, textAlign }]}>📌 {T.shelfPinHoles}</Text>
      <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.shelfPinDesc1}</Text>
      <Text style={[s.guideText, { fontFamily, textAlign }]}>
        {'• '}
        {T.shelfPinDesc2Front}
        {d.internalWidth > 400 ? d.shelfDepth - 37 : Math.round(d.shelfDepth / 2)} {T.shelfPinDesc2Back}
      </Text>
      <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.shelfPinDesc3}</Text>
      <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.shelfPinDesc4}</Text>
      <Text style={[s.guideText, { fontFamily, textAlign }]}>
        {'• '}
        {T.shelfPinDesc5} {Math.max(1, Math.floor((d.internalHeight - 74) / 32) + 1)} {T.shelfPinDesc5Suffix}
      </Text>

      <Text style={[s.sectionSubtitle, { fontFamily: fontFamilyBold, textAlign }]}>🪛 {T.confirmatScrews}</Text>
      <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.confirmatDesc1}</Text>
      <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.confirmatDesc2}</Text>
      <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.confirmatDesc3}</Text>
      <Text style={[s.guideText, { fontFamily, textAlign }]}>• {T.confirmatDesc4}</Text>

      <Text style={[s.sectionSubtitle, { fontFamily: fontFamilyBold, textAlign }]}>🗂️ {T.backPanelSection}</Text>
      <Text style={[s.guideText, { fontFamily, textAlign }]}>
        {'• '}
        {bMat.name[lang]}
        {' ('}
        {bMat.thickness}
        {' mm) — '}
        {Math.round(d.backPanelWidth)}
        {' × '}
        {Math.round(d.backPanelHeight)}
        {' mm'}
      </Text>
      <Text style={[s.guideText, { fontFamily, textAlign }]}>
        {'• '}
        {T.backPanelFix} {bMat.thickness} {T.backPanelMethod}
      </Text>

      <PageFooter date={date} lang={lang} />
    </Page>
  );
}
