import { Text, View } from '@react-pdf/renderer';
import type { CabinetConfig, DerivedDimensions, Lang } from '../../../engine/types';
import { getMaterial } from '../../../engine/materials';
import { pdfI18n } from '../pdf-i18n';
import type { PdfLang } from '../pdf-i18n';
import { C } from '../pdf-tokens';

export function ExplodedView({
  config,
  dimensions: _dimensions,
  cMat,
  bMat,
  lang = 'en',
}: {
  config: CabinetConfig;
  dimensions: DerivedDimensions;
  cMat: string;
  bMat: string;
  lang?: Lang;
}) {
  const T = pdfI18n[lang as PdfLang] ?? pdfI18n.en;
  const ff = lang === 'he' ? 'NotoSansHebrew' : 'Helvetica';
  const maxW = 400;
  const maxH = 480;
  const sc = Math.min(maxW / config.width, maxH / config.height) * 0.65;

  const W = config.width * sc;
  const H = config.height * sc;
  const t = getMaterial(config.carcassMaterial).thickness * sc;
  const gap = 28;

  const baseX = 64;
  const baseY = 36;

  const partBox = (
    top: number,
    left: number,
    width: number,
    height: number,
    bg: string,
    label: string,
    border = '#8B7355',
  ) => (
    <View
      style={{
        position: 'absolute',
        top,
        left,
        width,
        height,
        backgroundColor: bg,
        borderWidth: 0.75,
        borderColor: border,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ fontSize: 5.5, color: C.text, textAlign: 'center' }}>{label}</Text>
    </View>
  );

  const arrow = (top: number, left: number, char: string) => (
    <Text style={{ position: 'absolute', top, left, fontSize: 11, color: C.accent }}>{char}</Text>
  );

  const lbl = (text: string, top: number, left: number) => (
    <Text style={{ position: 'absolute', top, left, fontSize: 6.5, color: C.muted }}>{text}</Text>
  );

  return (
    <View style={{ width: maxW + 140, height: maxH + 60, position: 'relative', marginTop: 6 }}>
      <Text style={{ fontSize: 8, color: C.muted, marginBottom: 6, fontFamily: ff }}>{T.explodedNote}</Text>

      {/* Ghost carcass outline */}
      <View
        style={{
          position: 'absolute',
          top: baseY,
          left: baseX,
          width: W,
          height: H,
          borderWidth: 0.75,
          borderColor: '#CCC',
          borderStyle: 'dashed',
        }}
      />

      {/* ① Left side */}
      {partBox(baseY, baseX - gap - t, t, H, '#D2B48C', T.sideL)}
      {lbl(`① ${T.sideL}`, baseY - 11, baseX - gap - t)}
      {arrow(baseY + H / 2 - 6, baseX - gap + 2, '→')}

      {/* ② Right side */}
      {partBox(baseY, baseX + W + gap, t, H, '#D2B48C', T.sideR)}
      {lbl(`② ${T.sideR}`, baseY - 11, baseX + W + gap)}
      {arrow(baseY + H / 2 - 6, baseX + W + gap - 14, '←')}

      {/* ③ Top panel */}
      {partBox(baseY - gap - t, baseX + t, W - 2 * t, t, '#DEB887', T.topPanel)}
      {lbl(`③ ${T.topPanel}`, baseY - gap - t - 11, baseX + t)}
      {arrow(baseY - gap, baseX + W / 2 - 5, '↓')}

      {/* ④ Bottom panel */}
      {partBox(baseY + H + gap, baseX + t, W - 2 * t, t, '#DEB887', T.bottomPanel)}
      {lbl(`④ ${T.bottomPanel}`, baseY + H + gap + t + 3, baseX + t)}
      {arrow(baseY + H + gap - 14, baseX + W / 2 - 5, '↑')}

      {/* Shelves inside ghost */}
      {config.shelfCount > 0 &&
        Array.from({ length: Math.min(config.shelfCount, 5) }).map((_, i) => {
          const sy = baseY + (H / (config.shelfCount + 1)) * (i + 1);
          return partBox(sy - t / 2, baseX + t + 2, W - 2 * t - 4, t, '#F5DEB3', `${T.shelf} ${i + 1}`);
        })}

      {/* ⑤ Back panel */}
      {partBox(baseY + 4, baseX + W + gap * 2.8, W * 0.12, H - 8, '#C8B090', `${T.back}\n${bMat}`)}
      {lbl(`⑤ ${T.back}`, baseY - 11, baseX + W + gap * 2.8)}

      {/* ⑥ Door(s) */}
      {config.doorStyle !== 'none' &&
        Array.from({ length: config.doorCount }).map((_, i) => {
          const dw = (W / config.doorCount) * 0.88;
          const dx = baseX + (W / config.doorCount) * i + (W / config.doorCount) * 0.06;
          return partBox(baseY + H + gap * 2.8, dx, dw, H * 0.14, '#E8D5B7', `${T.doorLabel} ${i + 1}`);
        })}
      {config.doorStyle !== 'none' && lbl(`⑥ ${T.doorLabel}(s)`, baseY + H + gap * 2.8 - 11, baseX)}

      {/* Dimension line */}
      <Text
        style={{
          position: 'absolute',
          top: baseY + H + gap * 1.6 + t + 14,
          left: baseX,
          fontSize: 7.5,
          color: C.secondary,
          fontFamily: 'Helvetica-Bold',
        }}
      >
        {config.width} mm × {config.height} mm × {config.depth} mm
      </Text>
      <Text
        style={{
          position: 'absolute',
          top: baseY + H + gap * 1.6 + t + 26,
          left: baseX,
          fontSize: 6.5,
          color: C.muted,
        }}
      >
        Material: {cMat} · Shelves: {config.shelfCount} · Doors: {config.doorCount}
      </Text>
    </View>
  );
}
