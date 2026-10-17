import { Circle, G, Line, Polygon, Svg, Text, View } from '@react-pdf/renderer';
import type { Lang, Part } from '../../../engine/core/types';
import { createExplodedDrawingLayout } from '../../preview/exploded-drawing-layout';
import { C } from '../pdf-tokens';

interface ExplodedDrawingPdfProps {
  parts: Part[];
  lang: Lang;
}

export function ExplodedDrawingPdf({ parts, lang }: Readonly<ExplodedDrawingPdfProps>) {
  const layout = createExplodedDrawingLayout(parts, lang);
  const scale = Math.min(500 / layout.width, 460 / layout.height);
  const width = layout.width * scale;
  const height = layout.height * scale;
  const pointList = (points: readonly { x: number; y: number }[]) => points.map(({ x, y }) => `${x},${y}`).join(' ');

  return (
    <View style={{ width, height, position: 'relative', marginTop: 6 }}>
      <Svg width={width} height={height} viewBox={`0 0 ${layout.width} ${layout.height}`}>
        {layout.items.map((item) => (
          <G key={item.partId}>
            <Polygon
              points={pointList(item.sideFace)}
              fill={C.secondary}
              fillOpacity={0.22}
              stroke={C.text}
              strokeWidth={1}
            />
            <Polygon
              points={pointList(item.frontFace)}
              fill={C.primary}
              fillOpacity={0.1}
              stroke={C.text}
              strokeWidth={1}
            />
            <Polygon
              points={pointList(item.topFace)}
              fill={C.accent}
              fillOpacity={0.34}
              stroke={C.text}
              strokeWidth={1}
            />
            <Line
              x1={item.balloon.x}
              y1={item.balloon.y - 12}
              x2={item.topFace[0]!.x}
              y2={item.topFace[0]!.y}
              stroke={C.text}
              strokeWidth={0.8}
            />
            <Circle cx={item.balloon.x} cy={item.balloon.y} r={12} fill={C.secondary} />
          </G>
        ))}
      </Svg>
      {layout.items.map((item) => (
        <View key={`${item.partId}-labels`}>
          <Text
            style={{
              position: 'absolute',
              left: (item.balloon.x - 12) * scale,
              top: (item.balloon.y - 4) * scale,
              width: 24 * scale,
              fontSize: 5.5,
              fontWeight: 700,
              color: C.white,
              textAlign: 'center',
            }}
          >
            {item.partId}
          </Text>
          <Text
            style={{
              position: 'absolute',
              left: item.label.x * scale,
              top: (item.label.y - 8) * scale,
              width: 280 * scale,
              fontSize: 6,
              color: C.text,
              fontFamily: lang === 'he' ? 'NotoSansHebrew' : 'Helvetica',
              textAlign: lang === 'he' ? 'right' : 'left',
            }}
          >
            {item.partId}: {item.partName} × {item.quantity}
          </Text>
        </View>
      ))}
    </View>
  );
}
