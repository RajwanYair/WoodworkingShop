import type { CabinetConfig, DerivedDimensions, OptimizationResult, Lang } from '../../engine/types';
import { getMaterial } from '../../engine/materials';
import { pdfI18n } from './pdf-i18n';
import type { PdfLang } from './pdf-i18n';

export interface AssemblyStep {
  emoji: string;
  title: string;
  description: string;
}

export function assemblyStepsI18n(
  config: CabinetConfig,
  d: DerivedDimensions,
  carcassName: string,
  backName: string,
  lang: Lang,
): AssemblyStep[] {
  const T = pdfI18n[lang as PdfLang] ?? pdfI18n.en;
  const steps: AssemblyStep[] = [
    {
      emoji: '✂️',
      title: T.stepPrepare,
      description: T.stepPrepareDesc.replace('{edgeBanding}', config.edgeBanding),
    },
    {
      emoji: '📌',
      title: T.stepDrillPins,
      description: T.stepDrillPinsDesc,
    },
    {
      emoji: '🔧',
      title: T.stepPreDrill,
      description: T.stepPreDrillDesc,
    },
    {
      emoji: '🏗️',
      title: T.stepAssemble,
      description: T.stepAssembleDesc
        .replace('{carcass}', carcassName)
        .replace('{internalWidth}', String(d.internalWidth)),
    },
  ];

  if (config.height > 1200) {
    steps.push({
      emoji: '📐',
      title: T.stepCentreShelf,
      description: T.stepCentreShelfDesc,
    });
  }

  steps.push(
    {
      emoji: '🗂️',
      title: T.stepBackPanel,
      description: T.stepBackPanelDesc
        .replace('{back}', backName)
        .replace('{w}', String(Math.round(d.backPanelWidth)))
        .replace('{h}', String(Math.round(d.backPanelHeight))),
    },
    {
      emoji: '🪛',
      title: T.stepBoreHinges,
      description: T.stepBoreHingesDesc
        .replace('{hinges}', String(d.hingesPerDoor))
        .replace('{positions}', d.hingePositions.join(', ')),
    },
    {
      emoji: '🔩',
      title: T.stepMountPlates,
      description: T.stepMountPlatesDesc,
    },
    {
      emoji: '🚪',
      title: T.stepHangDoors,
      description: T.stepHangDoorsDesc.replace('{reveal}', String(config.doorReveal)),
    },
    {
      emoji: '📚',
      title: T.stepShelves,
      description: T.stepShelvesDesc
        .replace('{count}', String(config.shelfCount))
        .replace('{w}', String(d.shelfWidth))
        .replace('{d}', String(d.shelfDepth)),
    },
  );

  if (config.handleStyle !== 'none') {
    steps.push({
      emoji: '🖐️',
      title: T.stepHandles,
      description: T.stepHandlesDesc.replace('{style}', config.handleStyle),
    });
  }

  steps.push({
    emoji: '✅',
    title: T.stepFinal,
    description: T.stepFinalDesc,
  });

  return steps;
}

export interface SheetRow {
  material: string;
  size: string;
  qty: number;
}

export function sheetSummary(optimization: OptimizationResult, lang: Lang): SheetRow[] {
  const map = new Map<string, SheetRow>();
  for (const sheet of optimization.sheets) {
    const mat = getMaterial(sheet.material);
    const key = `${sheet.material}-${sheet.thickness}`;
    const existing = map.get(key);
    if (existing) {
      existing.qty++;
    } else {
      map.set(key, {
        material: `${mat.name[lang]} (${sheet.thickness} mm)`,
        size: `${mat.sheetWidth} × ${mat.sheetLength}`,
        qty: 1,
      });
    }
  }
  return Array.from(map.values());
}
