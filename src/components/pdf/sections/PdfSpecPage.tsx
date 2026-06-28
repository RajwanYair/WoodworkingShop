import { Page, Text, View } from '@react-pdf/renderer';
import type { CabinetConfig, DerivedDimensions, Part, HardwareItem, OptimizationResult } from '../../../engine/types';
import { s } from '../pdf-tokens';
import type { PdfCtx } from '../pdf-i18n';
import { PageHeader } from './PageChrome';
import { PageFooter } from './PageChrome';
import { SpecRow } from './SpecRow';

interface PdfSpecPageProps {
  ctx: PdfCtx;
  config: CabinetConfig;
  d: DerivedDimensions;
  parts: Part[];
  hardware: HardwareItem[];
  optimization: OptimizationResult;
  edgeBandingTotal: number;
  cMatName: string;
  cMatThickness: number;
  bMatName: string;
  bMatThickness: number;
}

export function PdfSpecPage({
  ctx,
  config,
  d,
  parts: _parts,
  hardware,
  optimization,
  edgeBandingTotal,
  cMatName,
  cMatThickness,
  bMatName,
  bMatThickness,
}: PdfSpecPageProps) {
  const { T, fontFamily, fontFamilyBold, textAlign, isRTL, date, coverTitle, lang, pageSize, orientation } = ctx;
  const rowDir = isRTL ? ({ flexDirection: 'row-reverse' } as const) : {};
  const specRowProps = { isRTL, fontFamily, fontFamilyBold };
  return (
    <Page size={pageSize} orientation={orientation} style={[s.page, { fontFamily }]}>
      <PageHeader section={`📐  ${T.specTitle}`} projectName={coverTitle} lang={lang} />

      <View style={[{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
        <Text style={[s.sectionTitle, { fontFamily: 'Helvetica', flex: 0 }]}>📐</Text>
        <Text style={[s.sectionTitle, { fontFamily: fontFamilyBold, textAlign }]}>{T.specTitle}</Text>
      </View>

      <View style={[{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }]}>
        <Text style={[s.specGroupTitle, { fontFamily: 'Helvetica', flex: 0 }]}>📏</Text>
        <Text style={[s.specGroupTitle, { fontFamily: fontFamilyBold, textAlign }]}>{T.specDimensions}</Text>
      </View>
      <View style={s.specGroup}>
        <SpecRow
          {...specRowProps}
          label={T.specExternal}
          value={`${config.width} × ${config.height} × ${config.depth} mm`}
        />
        <SpecRow {...specRowProps} label={T.specInternalWidth} value={`${d.internalWidth} mm`} />
        <SpecRow {...specRowProps} label={T.specInternalHeight} value={`${d.internalHeight} mm`} />
        <SpecRow {...specRowProps} label={T.specShelfDepth} value={`${d.shelfDepth} mm`} />
        <SpecRow {...specRowProps} label={T.specShelfWidth} value={`${d.shelfWidth} mm`} />
      </View>

      <Text style={[s.specGroupTitle, { fontFamily: fontFamilyBold, textAlign }]}>🪵 {T.specMaterials}</Text>
      <View style={s.specGroup}>
        <SpecRow {...specRowProps} label={T.specCarcass} value={`${cMatName} (${cMatThickness} mm)`} />
        <SpecRow {...specRowProps} label={T.specBackPanel} value={`${bMatName} (${bMatThickness} mm)`} />
        <SpecRow {...specRowProps} label={T.specEdgeBanding} value={config.edgeBanding} />
        <SpecRow {...specRowProps} label={T.specEdgeBandingTotal} value={`${(edgeBandingTotal / 1000).toFixed(1)} m`} />
      </View>

      <Text style={[s.specGroupTitle, { fontFamily: fontFamilyBold, textAlign }]}>🚪 {T.specDoorsHardware}</Text>
      <View style={s.specGroup}>
        <SpecRow {...specRowProps} label={T.specDoorStyle} value={config.doorStyle} />
        <SpecRow {...specRowProps} label={T.specDoorCount} value={String(config.doorCount)} />
        <SpecRow
          {...specRowProps}
          label={T.specDoorDimensions}
          value={`${Math.round(d.doorWidth)} × ${Math.round(d.doorHeight)} mm`}
        />
        <SpecRow {...specRowProps} label={T.specDoorReveal} value={`${config.doorReveal} mm`} />
        <SpecRow {...specRowProps} label={T.specHingesPerDoor} value={String(d.hingesPerDoor)} />
        <SpecRow {...specRowProps} label={T.specHandleStyle} value={config.handleStyle} />
      </View>

      <Text style={[s.specGroupTitle, { fontFamily: fontFamilyBold, textAlign }]}>📚 {T.specShelves}</Text>
      <View style={s.specGroup}>
        <SpecRow {...specRowProps} label={T.specShelfCount} value={String(config.shelfCount)} />
        <SpecRow {...specRowProps} label={T.specShelfSpacing} value={config.shelfSpacing} />
        <SpecRow
          {...specRowProps}
          label={T.specBackPanelSize}
          value={`${Math.round(d.backPanelWidth)} × ${Math.round(d.backPanelHeight)} mm`}
        />
      </View>

      <View style={[{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 14 }]}>
        <Text style={[s.sectionTitle, { fontFamily: 'Helvetica', flex: 0 }]}>📊</Text>
        <Text style={[s.sectionTitle, { fontFamily: fontFamilyBold, textAlign }]}>{T.cutSheetSummary}</Text>
      </View>
      <View style={[s.statRow, rowDir]}>
        <View style={s.statBox}>
          <Text style={s.statEmoji}>📋</Text>
          <Text style={s.statValue}>{optimization.totalSheets}</Text>
          <Text style={[s.statLabel, { fontFamily }]}>{T.sheetsRequired}</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statEmoji}>📊</Text>
          <Text style={s.statValue}>{optimization.overallYield}%</Text>
          <Text style={[s.statLabel, { fontFamily }]}>{T.materialYield}</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statEmoji}>♻️</Text>
          <Text style={s.statValue}>{(optimization.totalWaste / 1_000_000).toFixed(2)}</Text>
          <Text style={[s.statLabel, { fontFamily }]}>{T.waste}</Text>
        </View>
        <View style={s.statBox}>
          <Text style={s.statEmoji}>🔩</Text>
          <Text style={s.statValue}>{hardware.length}</Text>
          <Text style={[s.statLabel, { fontFamily }]}>{T.hardwareTypes}</Text>
        </View>
      </View>

      <PageFooter date={date} lang={lang} />
    </Page>
  );
}
