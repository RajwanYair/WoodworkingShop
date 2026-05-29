import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { validateConfig } from '../../engine/validation';
import { getTemplateDefaults } from '../../engine/templates';
import { ValidationPanel } from './ValidationPanel';
import { SubstitutionPanel } from './SubstitutionPanel';
import { CabinetSelector } from './CabinetSelector';
import { DimensionSliders } from './DimensionSliders';
import { MaterialSelector } from './MaterialSelector';
import { ShelfConfig } from './ShelfConfig';
import { DoorConfig } from './DoorConfig';
import { DrawerConfig } from './DrawerConfig';
import { CustomMaterialEditor } from './CustomMaterialEditor';
import { CatalogImportPanel } from './CatalogImportPanel';
import { MeasurementHintsPanel } from './MeasurementHintsPanel';
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
import { PresetsPanel } from './PresetsPanel';
import { SaveLoadPanel } from './SaveLoadPanel';
import { ConstraintSuggestionsPanel } from './ConstraintSuggestionsPanel';
import type { FurnitureType, JoineryType } from '../../engine/types';

export function ConfiguratorPanel() {
  const { t } = useTranslation();
  const { config, setConfig, resetConfig } = useCabinetStore();

  const validationIssues = useMemo(() => validateConfig(config), [config]);

  const handleFurnitureChange = (type: FurnitureType) => {
    setConfig({ ...getTemplateDefaults(type) });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <CabinetSelector />
      <SaveLoadPanel />
      <PresetsPanel />

      {/* Manufacturing constraint validation — shown when config has issues */}
      {validationIssues.length > 0 && <ValidationPanel issues={validationIssues} />}

      {/* Sprint 85 — ergonomic + best-practice measurement hints */}
      <MeasurementHintsPanel />

      {/* Sprint 88 — finish/paint calculator */}
      <FinishCalculatorPanel />

      {/* Sprint 221 — face frame cut list calculator */}
      <FaceFramePanel />

      {/* Sprint 222 — cabinet door sizing calculator */}
      <CabinetDoorPanel />

      {/* Sprint 223 — drawer box sizing calculator */}
      <DrawerBoxPanel />

      {/* Sprint 224 — screw pull-out strength estimator */}
      <ScrewPulloutPanel />

      {/* Sprint 225 — kerf bending calculator */}
      <KerfBendingPanel />

      {/* Sprint 226 — dado / rabbet joint calculator */}
      <DadoRabbetPanel />

      {/* Sprint 227 — finishing coat calculator */}
      <FinishingCoatPanel />

      {/* Sprint 228 — wood turning speed calculator */}
      <WoodTurningPanel />

      {/* Sprint 229 — frame and panel calculator */}
      <FramePanelCalcPanel />

      {/* Sprint 230 — taper jig calculator */}
      <TaperJigPanel />

      {/* Sprint 231 — stair stringer calculator */}
      <StairStringerPanel />

      {/* Sprint 232 — box joint calculator */}
      <BoxJointPanel />

      {/* Sprint 233 — wood glue coverage calculator */}
      <GlueCoveragePanel />

      {/* Sprint 235 — lumber planer pass calculator */}
      <PlanerPassesPanel />

      {/* Sprint 236 — honing guide calculator */}
      <HoningGuidePanel />

      {/* Sprint 237 — crown moulding cut calculator */}
      <CrownMouldingPanel />

      {/* Sprint 238 — router circle jig calculator */}
      <RouterCirclePanel />

      {/* Sprint 240 — table-saw cove cut calculator */}
      <CoveCutPanel />

      {/* Sprint 110 — real-time constraint violations and dimension range hints */}
      <ConstraintSuggestionsPanel />

      {/* Material substitution suggestions from engine (Sprint 43) */}
      <SubstitutionPanel />

      {/* Furniture type selector */}
      <fieldset className="space-y-2">
        <legend className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
          {t('config.furnitureType')}
        </legend>
        <div className="flex gap-3">
          {(['cabinet', 'bookshelf', 'desk', 'wardrobe', 'panel'] as const).map((ft) => (
            <label
              key={ft}
              className={`flex-1 cursor-pointer rounded border px-3 py-2 text-center text-sm font-medium transition-colors ${
                config.furnitureType === ft
                  ? 'bg-wood-600 border-wood-500 text-white'
                  : 'bg-wood-50 dark:bg-wood-800 text-wood-600 dark:text-wood-300 border-wood-200 dark:border-wood-700 hover:bg-wood-100 dark:hover:bg-wood-700'
              }`}
            >
              <input
                type="radio"
                name="furnitureType"
                value={ft}
                checked={config.furnitureType === ft}
                onChange={() => handleFurnitureChange(ft)}
                className="sr-only"
              />
              {t(`config.ft_${ft}`)}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Panel: choose which material's thickness governs the plate depth */}
      {config.furnitureType === 'panel' && (
        <fieldset className="space-y-2">
          <legend className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
            {t('config.panelMaterialSource')}
          </legend>
          <div className="flex gap-3">
            {(['carcass', 'back'] as const).map((src) => (
              <label
                key={src}
                className={`flex-1 cursor-pointer rounded border px-3 py-2 text-center text-sm font-medium transition-colors ${
                  (config.panelMaterialSource ?? 'carcass') === src
                    ? 'bg-wood-600 border-wood-500 text-white'
                    : 'bg-wood-50 dark:bg-wood-800 text-wood-600 dark:text-wood-300 border-wood-200 dark:border-wood-700 hover:bg-wood-100 dark:hover:bg-wood-700'
                }`}
              >
                <input
                  type="radio"
                  name="panelMaterialSource"
                  value={src}
                  checked={(config.panelMaterialSource ?? 'carcass') === src}
                  onChange={() => setConfig({ panelMaterialSource: src })}
                  className="sr-only"
                />
                {t(`config.panelMaterial${src === 'carcass' ? 'Carcass' : 'Back'}`)}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <DimensionSliders />
      <MaterialSelector />
      <CustomMaterialEditor />
      <CatalogImportPanel />

      {/* Sprint 12 — Joinery type selector */}
      <fieldset className="space-y-2">
        <legend className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
          {t('config.joineryType')}
        </legend>
        <div className="flex flex-wrap gap-2">
          {(['screw', 'pocket-screw', 'dado', 'dowel', 'biscuit', 'mortise-tenon', 'dovetail'] as JoineryType[]).map(
            (jt) => (
              <label
                key={jt}
                className={`cursor-pointer rounded border px-3 py-1.5 text-xs font-medium transition-colors ${
                  (config.joineryType ?? 'screw') === jt
                    ? 'bg-wood-600 border-wood-500 text-white'
                    : 'bg-wood-50 dark:bg-wood-800 text-wood-600 dark:text-wood-300 border-wood-200 dark:border-wood-700 hover:bg-wood-100 dark:hover:bg-wood-700'
                }`}
              >
                <input
                  type="radio"
                  name="joineryType"
                  value={jt}
                  checked={(config.joineryType ?? 'screw') === jt}
                  onChange={() => setConfig({ joineryType: jt })}
                  className="sr-only"
                />
                {t(`config.joinery_${jt}`)}
              </label>
            ),
          )}
        </div>
      </fieldset>

      {config.furnitureType !== 'panel' && <ShelfConfig />}
      {(config.furnitureType === 'cabinet' || config.furnitureType === 'wardrobe') && <DoorConfig />}
      {(config.furnitureType === 'cabinet' || config.furnitureType === 'wardrobe') && <DrawerConfig />}

      <button
        onClick={resetConfig}
        className="bg-wood-200 dark:bg-wood-700 text-wood-700 dark:text-wood-200 hover:bg-wood-300 dark:hover:bg-wood-600 w-full rounded px-4 py-2 text-sm font-medium transition-colors"
      >
        {t('config.reset')}
      </button>
    </div>
  );
}
