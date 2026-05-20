import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { panelMaterials, backMaterials, getMaterial } from '../../engine/materials';
import { findSubstitutions } from '../../engine/substitution';
import { useCustomMaterialsStore } from '../../store/custom-materials-store';
import { useToastStore } from '../../store/toast-store';
import type { Lang, Material, MaterialSubstitution } from '../../engine/types';

/** Sprint 172 — colored swatch square for the currently selected material */
function MaterialSwatch({ color }: { color?: string }) {
  if (!color) return null;
  return (
    <span
      aria-hidden="true"
      className="border-wood-300 dark:border-wood-600 inline-block h-4 w-4 shrink-0 rounded border"
      style={{ backgroundColor: color }}
      title={color}
    />
  );
}

export function MaterialSelector() {
  const { t, i18n } = useTranslation();
  const { config, setConfig, cabinets } = useCabinetStore();
  const bulkReplaceMaterial = useCabinetStore((s) => s.bulkReplaceMaterial);
  const addToast = useToastStore((s) => s.addToast);
  const customMaterials = useCustomMaterialsStore((s) => s.materials);
  const lang = i18n.language as Lang;
  const multiCabinet = cabinets.length > 1;

  const panels = [...panelMaterials(), ...customMaterials.filter((m) => m.category === 'panel')] as Material[];
  const backs = [...backMaterials(), ...customMaterials.filter((m) => m.category === 'back')] as Material[];

  const carcassColor = panels.find((m) => m.key === config.carcassMaterial)?.color;
  const backColor = backs.find((m) => m.key === config.backPanelMaterial)?.color;

  const substitutions = useMemo(() => findSubstitutions(config, customMaterials), [config, customMaterials]);

  return (
    <fieldset className="space-y-4">
      <legend className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        {t('config.material')}
      </legend>

      <label className="block">
        <span className="text-wood-600 dark:text-wood-300 flex items-center gap-2 text-sm">
          {t('config.carcass')}
          <MaterialSwatch color={carcassColor} />
        </span>
        <select
          value={config.carcassMaterial}
          onChange={(e) => setConfig({ carcassMaterial: e.target.value })}
          className="border-wood-200 dark:border-wood-700 dark:bg-wood-800 mt-1 block w-full rounded border bg-white px-3 py-2 text-sm"
        >
          {panels.map((m) => (
            <option key={m.key} value={m.key}>
              {m.name[lang]} ({m.thickness} mm)
            </option>
          ))}
        </select>
        {multiCabinet && (
          <button
            type="button"
            onClick={() => {
              const toKey = config.carcassMaterial;
              const uniqueFromKeys = [
                ...new Set(cabinets.map((c) => c.config.carcassMaterial).filter((k) => k !== toKey)),
              ];
              if (uniqueFromKeys.length === 0) {
                addToast(t('material.alreadyUniform'), 'info');
                return;
              }
              uniqueFromKeys.forEach((fromKey) => bulkReplaceMaterial(fromKey, toKey));
              addToast(t('material.reassignedAll'), 'success');
            }}
            className="text-wood-500 hover:text-wood-700 dark:text-wood-400 dark:hover:text-wood-200 mt-1 text-xs underline"
            title={t('material.reassignAllTip')}
          >
            {t('material.reassignAll')}
          </button>
        )}
        {substitutions.length > 0 && (
          <SubstitutionHints
            substitutions={substitutions}
            lang={lang}
            panels={panels}
            onSwitch={(key) => setConfig({ carcassMaterial: key })}
          />
        )}
      </label>

      <label className="block">
        <span className="text-wood-600 dark:text-wood-300 flex items-center gap-2 text-sm">
          {t('config.backPanel')}
          <MaterialSwatch color={backColor} />
        </span>
        <select
          value={config.backPanelMaterial}
          onChange={(e) => setConfig({ backPanelMaterial: e.target.value })}
          disabled={config.hasBack === false}
          className="border-wood-200 dark:border-wood-700 dark:bg-wood-800 mt-1 block w-full rounded border bg-white px-3 py-2 text-sm disabled:opacity-50"
        >
          {backs.map((m) => (
            <option key={m.key} value={m.key}>
              {m.name[lang]} ({m.thickness} mm)
            </option>
          ))}
        </select>
        {multiCabinet && config.hasBack !== false && (
          <button
            type="button"
            onClick={() => {
              const toKey = config.backPanelMaterial;
              const uniqueFromKeys = [
                ...new Set(cabinets.map((c) => c.config.backPanelMaterial).filter((k) => k !== toKey)),
              ];
              if (uniqueFromKeys.length === 0) {
                addToast(t('material.alreadyUniform'), 'info');
                return;
              }
              uniqueFromKeys.forEach((fromKey) => bulkReplaceMaterial(fromKey, toKey));
              addToast(t('material.reassignedAll'), 'success');
            }}
            className="text-wood-500 hover:text-wood-700 dark:text-wood-400 dark:hover:text-wood-200 mt-1 text-xs underline"
            title={t('material.reassignAllTip')}
          >
            {t('material.reassignAll')}
          </button>
        )}
      </label>

      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={config.hasBack !== false}
          onChange={(e) => setConfig({ hasBack: e.target.checked })}
          className="accent-primary mt-0.5"
          aria-label={t('config.hasBack')}
        />
        <span className="text-sm">
          <span className="text-wood-700 dark:text-wood-200 block">{t('config.hasBack')}</span>
          <span className="text-wood-600 dark:text-wood-300 block text-[11px]">{t('config.hasBackDesc')}</span>
        </span>
      </label>
    </fieldset>
  );
}

// ── SubstitutionHints ────────────────────────────────────────────────────────

const BENEFIT_COLORS: Record<MaterialSubstitution['benefit'], string> = {
  deflection:
    'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200',
  weight: 'border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-900/20 text-sky-800 dark:text-sky-200',
  cost: 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200',
};

interface SubstitutionHintsProps {
  substitutions: MaterialSubstitution[];
  lang: Lang;
  panels: Material[];
  onSwitch: (key: string) => void;
}

function SubstitutionHints({ substitutions, lang, panels, onSwitch }: SubstitutionHintsProps) {
  const { t } = useTranslation();
  return (
    <div className="mt-2 space-y-1.5" aria-label={t('substitution.title')}>
      {substitutions.map((sub) => {
        const suggestedMat = panels.find((m) => m.key === sub.suggestedKey);
        let suggestedName = sub.suggestedKey;
        try {
          suggestedName = getMaterial(sub.suggestedKey).name[lang];
        } catch {
          /* fall back to key */
        }
        return (
          <div
            key={`${sub.currentKey}-${sub.suggestedKey}-${sub.benefit}`}
            className={`flex items-start justify-between gap-2 rounded border px-2.5 py-1.5 text-[11px] ${BENEFIT_COLORS[sub.benefit]}`}
            role="note"
          >
            <span className="flex items-start gap-1.5">
              <span className="shrink-0 font-semibold">{t(`substitution.benefit.${sub.benefit}`)}</span>
              <span>{sub.reason[lang]}</span>
            </span>
            <div className="flex shrink-0 items-center gap-1">
              {suggestedMat?.color && (
                <span
                  aria-hidden="true"
                  className="inline-block h-3 w-3 rounded-sm border border-current/30"
                  style={{ backgroundColor: suggestedMat.color }}
                />
              )}
              <button
                type="button"
                onClick={() => onSwitch(sub.suggestedKey)}
                className="font-medium underline hover:no-underline"
                aria-label={t('substitution.switch', { name: suggestedName })}
              >
                {t('substitution.switchShort')}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
