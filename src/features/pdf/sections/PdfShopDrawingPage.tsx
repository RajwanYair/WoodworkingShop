import { Line, Page, Rect, Svg, Text, View } from '@react-pdf/renderer';
import type { CabinetConfig, DerivedDimensions } from '../../../engine/core/types';
import { getMaterial } from '../../../engine/materials/materials';
import { pdfI18n } from '../pdf-i18n';
import type { PdfCtx } from '../pdf-i18n';
import { C, s } from '../pdf-tokens';
import { PdfCalibrationRuler } from './PdfCalibrationRuler';
import { PageFooter, PageHeader } from './PageChrome';

interface PdfShopDrawingPageProps {
  ctx: PdfCtx;
  config: CabinetConfig;
  d: DerivedDimensions;
}

export function PdfShopDrawingPage({ ctx, config, d }: Readonly<PdfShopDrawingPageProps>) {
  const { fontFamily, fontFamilyBold, textAlign, lang, date, coverTitle, pageSize, orientation } = ctx;
  const labels = pdfI18n[lang];
  const thickness = getMaterial(config.carcassMaterial).thickness;
  const views = [
    {
      id: 'front',
      title: labels.drawingFront,
      width: config.width,
      height: config.height,
      detail: `${labels.overallWidth}: ${config.width} mm · ${labels.overallHeight}: ${config.height} mm\n18 · ${d.internalWidth} · 18 mm`,
    },
    {
      id: 'side',
      title: labels.drawingSide,
      width: config.depth,
      height: config.height,
      detail: `${labels.overallDepth}: ${config.depth} mm · ${labels.overallHeight}: ${config.height} mm`,
    },
    {
      id: 'top',
      title: labels.drawingTop,
      width: config.width,
      height: config.depth,
      detail: `${labels.overallWidth}: ${config.width} mm · ${labels.overallDepth}: ${config.depth} mm`,
    },
    {
      id: 'section',
      title: labels.drawingSection,
      width: config.width,
      height: config.height,
      detail: `${labels.overallWidth}: ${config.width} mm · ${labels.overallHeight}: ${config.height} mm\n${d.internalWidth} · ${d.internalHeight} mm`,
    },
  ];

  return (
    <Page size={pageSize} orientation={orientation} style={[s.page, { fontFamily }]}>
      <PageHeader section={labels.shopDrawing} projectName={coverTitle} lang={lang} />
      <Text style={[s.sectionTitle, { fontFamily: fontFamilyBold, textAlign }]}>{labels.shopDrawing}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {views.map((view) => {
          const scale = Math.min(160 / Math.max(view.width, 1), 70 / Math.max(view.height, 1));
          const drawingWidth = view.width * scale;
          const drawingHeight = view.height * scale;
          const x = (190 - drawingWidth) / 2;
          const y = (96 - drawingHeight) / 2;
          const wall = thickness * scale;

          return (
            <View key={view.id} style={{ width: 210, height: 142, alignItems: 'center' }}>
              <Text style={{ width: '100%', fontSize: 8, fontFamily: fontFamilyBold, textAlign }}>{view.title}</Text>
              <Svg width={190} height={96} viewBox="0 0 190 96">
                <Rect
                  x={x}
                  y={y}
                  width={drawingWidth}
                  height={drawingHeight}
                  fill="none"
                  stroke={C.text}
                  strokeWidth={1}
                />
                {view.id === 'front' && (
                  <Rect
                    x={x + wall}
                    y={y + wall}
                    width={Math.max(0, drawingWidth - 2 * wall)}
                    height={Math.max(0, drawingHeight - 2 * wall)}
                    fill="none"
                    stroke={C.muted}
                    strokeWidth={0.7}
                    strokeDasharray="3 2"
                  />
                )}
                {view.id === 'side' &&
                  Array.from({ length: config.shelfCount }, (_, index) => {
                    const shelfY = y + ((index + 1) * drawingHeight) / (config.shelfCount + 1);
                    return (
                      <Line
                        key={`side-shelf-${index}`}
                        x1={x}
                        y1={shelfY}
                        x2={x + drawingWidth}
                        y2={shelfY}
                        stroke={C.text}
                        strokeWidth={0.7}
                      />
                    );
                  })}
                {view.id === 'section' && (
                  <Rect
                    x={x + wall}
                    y={y + wall}
                    width={Math.max(0, drawingWidth - 2 * wall)}
                    height={Math.max(0, drawingHeight - 2 * wall)}
                    fill="none"
                    stroke={C.muted}
                    strokeWidth={0.7}
                  />
                )}
                {view.id === 'section' &&
                  Array.from({ length: config.shelfCount }, (_, index) => {
                    const shelfY = y + wall + ((index + 1) * (drawingHeight - 2 * wall)) / (config.shelfCount + 1);
                    return (
                      <Line
                        key={`section-shelf-${index}`}
                        x1={x + wall}
                        y1={shelfY}
                        x2={x + drawingWidth - wall}
                        y2={shelfY}
                        stroke={C.text}
                        strokeWidth={Math.max(wall / 2, 0.6)}
                      />
                    );
                  })}
                <Line
                  x1={x}
                  y1={y + drawingHeight + 4}
                  x2={x + drawingWidth}
                  y2={y + drawingHeight + 4}
                  stroke={C.secondary}
                  strokeWidth={0.7}
                />
                <Line x1={x - 4} y1={y} x2={x - 4} y2={y + drawingHeight} stroke={C.secondary} strokeWidth={0.7} />
              </Svg>
              <Text style={{ width: '100%', fontSize: 6.5, lineHeight: 1.2, color: C.secondary, textAlign: 'center' }}>
                {view.detail}
              </Text>
            </View>
          );
        })}
      </View>
      <PdfCalibrationRuler title={labels.calibrationRuler} instructions={labels.printAtActualSize} />
      <PageFooter date={date} lang={lang} />
    </Page>
  );
}
