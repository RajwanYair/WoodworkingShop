import { useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
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

type CalculatorSection = {
  id: string;
  titleKey: string;
  Component: () => ReactElement;
};

const CALCULATOR_SECTIONS: CalculatorSection[] = [
  { id: 'finish', titleKey: 'finish.title', Component: FinishCalculatorPanel },
  { id: 'face-frame', titleKey: 'faceFrame.title', Component: FaceFramePanel },
  { id: 'cabinet-door', titleKey: 'cabinetDoor.title', Component: CabinetDoorPanel },
  { id: 'drawer-box', titleKey: 'drawerBox.title', Component: DrawerBoxPanel },
  { id: 'screw-pullout', titleKey: 'screwPullout.title', Component: ScrewPulloutPanel },
  { id: 'kerf-bending', titleKey: 'kerfBending.title', Component: KerfBendingPanel },
  { id: 'dado-rabbet', titleKey: 'dadoRabbet.title', Component: DadoRabbetPanel },
  { id: 'finishing-coat', titleKey: 'finishingCoat.title', Component: FinishingCoatPanel },
  { id: 'wood-turning', titleKey: 'woodTurning.title', Component: WoodTurningPanel },
  { id: 'frame-panel', titleKey: 'framePanel.title', Component: FramePanelCalcPanel },
  { id: 'taper-jig', titleKey: 'taperJig.title', Component: TaperJigPanel },
  { id: 'stair-stringer', titleKey: 'stairStringer.title', Component: StairStringerPanel },
  { id: 'box-joint', titleKey: 'boxJoint.title', Component: BoxJointPanel },
  { id: 'glue-coverage', titleKey: 'glueCoverage.title', Component: GlueCoveragePanel },
  { id: 'planer-passes', titleKey: 'planerPasses.title', Component: PlanerPassesPanel },
  { id: 'honing-guide', titleKey: 'honingGuide.title', Component: HoningGuidePanel },
  { id: 'crown-moulding', titleKey: 'crownMoulding.title', Component: CrownMouldingPanel },
  { id: 'router-circle', titleKey: 'routerCircle.title', Component: RouterCirclePanel },
  { id: 'cove-cut', titleKey: 'coveCut.title', Component: CoveCutPanel },
  { id: 'moisture-shrinkage', titleKey: 'moistureShrinkage.title', Component: MoistureShrinkagePanel },
  { id: 'rafter-length', titleKey: 'rafterLength.title', Component: RafterLengthPanel },
  { id: 'router-template', titleKey: 'routerTemplate.title', Component: RouterTemplatePanel },
  { id: 'half-lap', titleKey: 'halfLap.title', Component: HalfLapPanel },
  { id: 'spline-joint', titleKey: 'splineJoint.title', Component: SplineJointPanel },
];

export function CalculatorsPanel() {
  const { t } = useTranslation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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
      {CALCULATOR_SECTIONS.map(({ id, titleKey, Component }) => (
        <div key={id} className="border-wood-200 dark:border-wood-700 bg-wood-50 dark:bg-wood-900 rounded-lg border">
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
              <Component />
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
