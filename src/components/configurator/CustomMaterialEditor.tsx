import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCustomMaterialsStore } from '../../store/custom-materials-store';
import type { Material, MaterialCategory, Lang } from '../../engine/types';

const EMPTY: Omit<Material, 'key'> = {
  name: { en: '', he: '' },
  thickness: 18,
  sheetWidth: 1220,
  sheetLength: 2440,
  pricePerSheet: 100,
  category: 'panel',
  color: '#C8B88A',
};

export function CustomMaterialEditor() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const { materials, addMaterial, removeMaterial } = useCustomMaterialsStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY);

  const handleAdd = () => {
    const nameText = draft.name[lang].trim();
    if (!nameText) return;
    const key = `custom-${Date.now()}`;
    addMaterial({ ...draft, key, name: { ...draft.name } });
    setDraft({ ...EMPTY, name: { en: '', he: '' } });
  };

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide">
        {t('config.customMaterials')}
      </legend>

      {/* Existing custom materials */}
      {materials.length > 0 && (
        <ul className="space-y-1">
          {materials.map((m) => (
            <li key={m.key} className="flex items-center gap-2 text-sm">
              <span
                className="inline-block w-4 h-4 rounded border border-wood-300 dark:border-wood-600"
                style={{ backgroundColor: m.color }}
              />
              <span className="flex-1 text-wood-700 dark:text-wood-200">
                {m.name[lang]} ({m.thickness} mm, {m.category})
              </span>
              <button
                onClick={() => removeMaterial(m.key)}
                className="text-red-500 hover:text-red-700 text-xs font-bold"
                aria-label={t('config.remove')}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Toggle form */}
      <button
        onClick={() => setOpen(!open)}
        className="text-sm text-wood-500 dark:text-wood-400 hover:underline"
        aria-expanded={open}
      >
        {open ? '▾ ' : '▸ '}{t('config.addCustomMaterial')}
      </button>

      {open && (
        <div className="grid grid-cols-2 gap-2 p-3 rounded border border-wood-200 dark:border-wood-700 bg-wood-50 dark:bg-wood-800">
          <label className="block col-span-2">
            <span className="text-xs text-wood-600 dark:text-wood-300">{t('config.materialName')}</span>
            <input
              type="text"
              value={draft.name[lang]}
              onChange={(e) =>
                setDraft({ ...draft, name: { ...draft.name, [lang]: e.target.value } })
              }
              className="mt-0.5 block w-full rounded border border-wood-200 dark:border-wood-700 bg-white dark:bg-wood-900 px-2 py-1 text-sm"
              placeholder={lang === 'he' ? 'שם החומר' : 'Material name'}
            />
          </label>

          <label className="block">
            <span className="text-xs text-wood-600 dark:text-wood-300">{t('config.thickness')} (mm)</span>
            <input
              type="number"
              min={1}
              max={50}
              value={draft.thickness}
              onChange={(e) => setDraft({ ...draft, thickness: Number(e.target.value) })}
              className="mt-0.5 block w-full rounded border border-wood-200 dark:border-wood-700 bg-white dark:bg-wood-900 px-2 py-1 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs text-wood-600 dark:text-wood-300">{t('config.category')}</span>
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as MaterialCategory })}
              className="mt-0.5 block w-full rounded border border-wood-200 dark:border-wood-700 bg-white dark:bg-wood-900 px-2 py-1 text-sm"
            >
              <option value="panel">{t('config.catPanel')}</option>
              <option value="back">{t('config.catBack')}</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-wood-600 dark:text-wood-300">{t('config.sheetW')} (mm)</span>
            <input
              type="number"
              min={100}
              value={draft.sheetWidth}
              onChange={(e) => setDraft({ ...draft, sheetWidth: Number(e.target.value) })}
              className="mt-0.5 block w-full rounded border border-wood-200 dark:border-wood-700 bg-white dark:bg-wood-900 px-2 py-1 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs text-wood-600 dark:text-wood-300">{t('config.sheetL')} (mm)</span>
            <input
              type="number"
              min={100}
              value={draft.sheetLength}
              onChange={(e) => setDraft({ ...draft, sheetLength: Number(e.target.value) })}
              className="mt-0.5 block w-full rounded border border-wood-200 dark:border-wood-700 bg-white dark:bg-wood-900 px-2 py-1 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs text-wood-600 dark:text-wood-300">{t('config.price')}</span>
            <input
              type="number"
              min={0}
              value={draft.pricePerSheet ?? 0}
              onChange={(e) => setDraft({ ...draft, pricePerSheet: Number(e.target.value) })}
              className="mt-0.5 block w-full rounded border border-wood-200 dark:border-wood-700 bg-white dark:bg-wood-900 px-2 py-1 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-xs text-wood-600 dark:text-wood-300">{t('config.color')}</span>
            <input
              type="color"
              value={draft.color}
              onChange={(e) => setDraft({ ...draft, color: e.target.value })}
              className="mt-0.5 block w-full h-8 rounded border border-wood-200 dark:border-wood-700"
            />
          </label>

          <button
            onClick={handleAdd}
            disabled={!draft.name[lang].trim()}
            className="col-span-2 rounded bg-wood-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-wood-600 disabled:opacity-40 transition-colors"
          >
            {t('config.addMaterial')}
          </button>
        </div>
      )}
    </fieldset>
  );
}
