import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { panelMaterials, backMaterials } from '../../engine/materials';
import { useCustomMaterialsStore } from '../../store/custom-materials-store';
import type { Lang, Material } from '../../engine/types';

/** Sprint 172 — colored swatch square for the currently selected material */
function MaterialSwatch({ color }: { color?: string }) {
  if (!color) return null;
  return (
    <span
      aria-hidden="true"
      className="inline-block w-4 h-4 rounded border border-wood-300 dark:border-wood-600 shrink-0"
      style={{ backgroundColor: color }}
      title={color}
    />
  );
}

export function MaterialSelector() {
  const { t, i18n } = useTranslation();
  const { config, setConfig } = useCabinetStore();
  const customMaterials = useCustomMaterialsStore((s) => s.materials);
  const lang = i18n.language as Lang;

  const panels = [...panelMaterials(), ...customMaterials.filter((m) => m.category === 'panel')] as Material[];
  const backs = [...backMaterials(), ...customMaterials.filter((m) => m.category === 'back')] as Material[];

  const carcassColor = panels.find((m) => m.key === config.carcassMaterial)?.color;
  const backColor = backs.find((m) => m.key === config.backPanelMaterial)?.color;

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide">
        {t('config.material')}
      </legend>

      <label className="block">
        <span className="flex items-center gap-2 text-sm text-wood-600 dark:text-wood-300">
          {t('config.carcass')}
          <MaterialSwatch color={carcassColor} />
        </span>
        <select
          value={config.carcassMaterial}
          onChange={(e) => setConfig({ carcassMaterial: e.target.value })}
          className="mt-1 block w-full rounded border border-wood-200 dark:border-wood-700 bg-white dark:bg-wood-800 px-3 py-2 text-sm"
        >
          {panels.map((m) => (
            <option key={m.key} value={m.key}>
              {m.name[lang]} ({m.thickness} mm)
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="flex items-center gap-2 text-sm text-wood-600 dark:text-wood-300">
          {t('config.backPanel')}
          <MaterialSwatch color={backColor} />
        </span>
        <select
          value={config.backPanelMaterial}
          onChange={(e) => setConfig({ backPanelMaterial: e.target.value })}
          disabled={config.hasBack === false}
          className="mt-1 block w-full rounded border border-wood-200 dark:border-wood-700 bg-white dark:bg-wood-800 px-3 py-2 text-sm disabled:opacity-50"
        >
          {backs.map((m) => (
            <option key={m.key} value={m.key}>
              {m.name[lang]} ({m.thickness} mm)
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={config.hasBack !== false}
          onChange={(e) => setConfig({ hasBack: e.target.checked })}
          className="mt-0.5 accent-primary"
          aria-label={t('config.hasBack')}
        />
        <span className="text-sm">
          <span className="block text-wood-700 dark:text-wood-200">{t('config.hasBack')}</span>
          <span className="block text-[11px] text-wood-600 dark:text-wood-300">{t('config.hasBackDesc')}</span>
        </span>
      </label>
    </fieldset>
  );
}
