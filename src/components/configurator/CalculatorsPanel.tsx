import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { CALCULATOR_CATALOG, type CalculatorId } from './calculator-catalog';
import { FinishCalculatorPanel } from './FinishCalculatorPanel';
import { FaceFramePanel } from './FaceFramePanel';
import { CabinetDoorPanel } from './CabinetDoorPanel';
import { DrawerBoxPanel } from './DrawerBoxPanel';
import { ScrewPulloutPanel } from './ScrewPulloutPanel';
import { KerfBendingPanel } from './KerfBendingPanel';
import { DadoRabbetPanel } from './DadoRabbetPanel';
import { FinishingCoatPanel } from './FinishingCoatPanel';
import { WoodTurningPanel } from './WoodTurningPanel';
import { FramePanelCalcPanel } from './FramePanelCalcPanel';
import { TaperJigPanel } from './TaperJigPanel';
import { StairStringerPanel } from './StairStringerPanel';
import { BoxJointPanel } from './BoxJointPanel';
import { GlueCoveragePanel } from './GlueCoveragePanel';
import { PlanerPassesPanel } from './PlanerPassesPanel';
import { HoningGuidePanel } from './HoningGuidePanel';
import { CrownMouldingPanel } from './CrownMouldingPanel';
import { RouterCirclePanel } from './RouterCirclePanel';
import { CoveCutPanel } from './CoveCutPanel';
import { MoistureShrinkagePanel } from './MoistureShrinkagePanel';
import { RafterLengthPanel } from './RafterLengthPanel';
import { RouterTemplatePanel } from './RouterTemplatePanel';
import { HalfLapPanel } from './HalfLapPanel';
import { SplineJointPanel } from './SplineJointPanel';

const ShelfDeflectionPanel = lazy(() =>
  import('./ShelfDeflectionPanel').then(({ ShelfDeflectionPanel }) => ({ default: ShelfDeflectionPanel })),
);
const PocketHolePanel = lazy(() =>
  import('./PocketHolePanel').then(({ PocketHolePanel }) => ({ default: PocketHolePanel })),
);
const DowelJointPanel = lazy(() =>
  import('./DowelJointPanel').then(({ DowelJointPanel }) => ({ default: DowelJointPanel })),
);
const MortiseTenonPanel = lazy(() =>
  import('./MortiseTenonPanel').then(({ MortiseTenonPanel }) => ({ default: MortiseTenonPanel })),
);
const DovetailLayoutPanel = lazy(() =>
  import('./DovetailLayoutPanel').then(({ DovetailLayoutPanel }) => ({ default: DovetailLayoutPanel })),
);

const CALCULATOR_COMPONENTS = {
  finish: FinishCalculatorPanel,
  'face-frame': FaceFramePanel,
  'cabinet-door': CabinetDoorPanel,
  'drawer-box': DrawerBoxPanel,
  'screw-pullout': ScrewPulloutPanel,
  'kerf-bending': KerfBendingPanel,
  'dado-rabbet': DadoRabbetPanel,
  'finishing-coat': FinishingCoatPanel,
  'wood-turning': WoodTurningPanel,
  'frame-panel': FramePanelCalcPanel,
  'taper-jig': TaperJigPanel,
  'stair-stringer': StairStringerPanel,
  'box-joint': BoxJointPanel,
  'glue-coverage': GlueCoveragePanel,
  'planer-passes': PlanerPassesPanel,
  'honing-guide': HoningGuidePanel,
  'crown-moulding': CrownMouldingPanel,
  'router-circle': RouterCirclePanel,
  'cove-cut': CoveCutPanel,
  'moisture-shrinkage': MoistureShrinkagePanel,
  'rafter-length': RafterLengthPanel,
  'router-template': RouterTemplatePanel,
  'half-lap': HalfLapPanel,
  'spline-joint': SplineJointPanel,
  'shelf-deflection': ShelfDeflectionPanel,
  'pocket-hole': PocketHolePanel,
  'dowel-joint': DowelJointPanel,
  'mortise-tenon': MortiseTenonPanel,
  'dovetail-layout': DovetailLayoutPanel,
} satisfies Record<CalculatorId, ComponentType>;

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
        const Component = CALCULATOR_COMPONENTS[id];
        return (
          <div
            key={id}
            id={`calculator-${id}`}
            className="border-wood-200 dark:border-wood-700 bg-wood-50 dark:bg-wood-900 rounded-lg border"
          >
            <button
              type="button"
              onClick={() => toggleSection(id)}
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
