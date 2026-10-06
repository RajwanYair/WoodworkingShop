import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { CALCULATOR_CATALOG, type CalculatorId } from './calculator-catalog';

function lazyCalculator<T extends ComponentType>(loader: () => Promise<{ default: T }>) {
  return {
    Component: lazy(loader),
    preload: () => {
      void loader().catch(() => undefined);
    },
  };
}

const CALCULATOR_PANELS = {
  finish: lazyCalculator(() =>
    import('./FinishCalculatorPanel').then(({ FinishCalculatorPanel }) => ({ default: FinishCalculatorPanel })),
  ),
  'face-frame': lazyCalculator(() =>
    import('./FaceFramePanel').then(({ FaceFramePanel }) => ({ default: FaceFramePanel })),
  ),
  'cabinet-door': lazyCalculator(() =>
    import('./CabinetDoorPanel').then(({ CabinetDoorPanel }) => ({ default: CabinetDoorPanel })),
  ),
  'drawer-box': lazyCalculator(() =>
    import('./DrawerBoxPanel').then(({ DrawerBoxPanel }) => ({ default: DrawerBoxPanel })),
  ),
  'screw-pullout': lazyCalculator(() =>
    import('./ScrewPulloutPanel').then(({ ScrewPulloutPanel }) => ({ default: ScrewPulloutPanel })),
  ),
  'kerf-bending': lazyCalculator(() =>
    import('./KerfBendingPanel').then(({ KerfBendingPanel }) => ({ default: KerfBendingPanel })),
  ),
  'dado-rabbet': lazyCalculator(() =>
    import('./DadoRabbetPanel').then(({ DadoRabbetPanel }) => ({ default: DadoRabbetPanel })),
  ),
  'finishing-coat': lazyCalculator(() =>
    import('./FinishingCoatPanel').then(({ FinishingCoatPanel }) => ({ default: FinishingCoatPanel })),
  ),
  'wood-turning': lazyCalculator(() =>
    import('./WoodTurningPanel').then(({ WoodTurningPanel }) => ({ default: WoodTurningPanel })),
  ),
  'frame-panel': lazyCalculator(() =>
    import('./FramePanelCalcPanel').then(({ FramePanelCalcPanel }) => ({ default: FramePanelCalcPanel })),
  ),
  'taper-jig': lazyCalculator(() =>
    import('./TaperJigPanel').then(({ TaperJigPanel }) => ({ default: TaperJigPanel })),
  ),
  'stair-stringer': lazyCalculator(() =>
    import('./StairStringerPanel').then(({ StairStringerPanel }) => ({ default: StairStringerPanel })),
  ),
  'box-joint': lazyCalculator(() =>
    import('./BoxJointPanel').then(({ BoxJointPanel }) => ({ default: BoxJointPanel })),
  ),
  'glue-coverage': lazyCalculator(() =>
    import('./GlueCoveragePanel').then(({ GlueCoveragePanel }) => ({ default: GlueCoveragePanel })),
  ),
  'planer-passes': lazyCalculator(() =>
    import('./PlanerPassesPanel').then(({ PlanerPassesPanel }) => ({ default: PlanerPassesPanel })),
  ),
  'honing-guide': lazyCalculator(() =>
    import('./HoningGuidePanel').then(({ HoningGuidePanel }) => ({ default: HoningGuidePanel })),
  ),
  'crown-moulding': lazyCalculator(() =>
    import('./CrownMouldingPanel').then(({ CrownMouldingPanel }) => ({ default: CrownMouldingPanel })),
  ),
  'router-circle': lazyCalculator(() =>
    import('./RouterCirclePanel').then(({ RouterCirclePanel }) => ({ default: RouterCirclePanel })),
  ),
  'cove-cut': lazyCalculator(() => import('./CoveCutPanel').then(({ CoveCutPanel }) => ({ default: CoveCutPanel }))),
  'moisture-shrinkage': lazyCalculator(() =>
    import('./MoistureShrinkagePanel').then(({ MoistureShrinkagePanel }) => ({ default: MoistureShrinkagePanel })),
  ),
  'rafter-length': lazyCalculator(() =>
    import('./RafterLengthPanel').then(({ RafterLengthPanel }) => ({ default: RafterLengthPanel })),
  ),
  'router-template': lazyCalculator(() =>
    import('./RouterTemplatePanel').then(({ RouterTemplatePanel }) => ({ default: RouterTemplatePanel })),
  ),
  'half-lap': lazyCalculator(() => import('./HalfLapPanel').then(({ HalfLapPanel }) => ({ default: HalfLapPanel }))),
  'spline-joint': lazyCalculator(() =>
    import('./SplineJointPanel').then(({ SplineJointPanel }) => ({ default: SplineJointPanel })),
  ),
  'shelf-deflection': lazyCalculator(() =>
    import('./ShelfDeflectionPanel').then(({ ShelfDeflectionPanel }) => ({ default: ShelfDeflectionPanel })),
  ),
  'pocket-hole': lazyCalculator(() =>
    import('./PocketHolePanel').then(({ PocketHolePanel }) => ({ default: PocketHolePanel })),
  ),
  'dowel-joint': lazyCalculator(() =>
    import('./DowelJointPanel').then(({ DowelJointPanel }) => ({ default: DowelJointPanel })),
  ),
  'mortise-tenon': lazyCalculator(() =>
    import('./MortiseTenonPanel').then(({ MortiseTenonPanel }) => ({ default: MortiseTenonPanel })),
  ),
  'dovetail-layout': lazyCalculator(() =>
    import('./DovetailLayoutPanel').then(({ DovetailLayoutPanel }) => ({ default: DovetailLayoutPanel })),
  ),
} satisfies Record<CalculatorId, ReturnType<typeof lazyCalculator>>;

interface CalculatorsPanelProps {
  request?: { id: CalculatorId; sequence: number } | null;
}

export function CalculatorsPanel({ request = null }: CalculatorsPanelProps) {
  const { t } = useTranslation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!request) return;
    setExpandedIds((previous) => new Set(previous).add(request.id));
  }, [request]);

  const toggleSection = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <section className="mx-auto max-w-2xl space-y-4" aria-label={t('tabs.calculators')}>
      <h2 className="text-wood-700 dark:text-wood-200 text-lg font-semibold">{t('tabs.calculators')}</h2>
      {CALCULATOR_CATALOG.map(({ id, titleKey }) => {
        const { Component, preload } = CALCULATOR_PANELS[id];
        return (
          <div
            key={id}
            id={`calculator-${id}`}
            className="border-wood-200 dark:border-wood-700 bg-wood-50 dark:bg-wood-900 rounded-lg border"
          >
            <button
              type="button"
              onClick={() => toggleSection(id)}
              onPointerEnter={preload}
              onFocus={preload}
              aria-expanded={expandedIds.has(id)}
              className="text-wood-700 dark:text-wood-200 hover:bg-wood-100 dark:hover:bg-wood-800 flex w-full items-center justify-between rounded-lg px-4 py-3 text-start text-sm font-semibold transition-colors"
            >
              <span>{t(titleKey)}</span>
              <span aria-hidden="true">{expandedIds.has(id) ? '▾' : '▸'}</span>
            </button>
            {expandedIds.has(id) && (
              <div className="border-wood-200 dark:border-wood-700 border-t px-4 py-3">
                <Suspense fallback={<p role="status">{t('skeleton.loading')}</p>}>
                  <Component />
                </Suspense>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
