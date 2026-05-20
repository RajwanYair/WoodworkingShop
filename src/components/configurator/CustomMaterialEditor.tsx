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
  hasGrain: false,
  densityKgM3: 680,
};

export function CustomMaterialEditor() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const { materials, addMaterial, removeMaterial, updateMaterial } = useCustomMaterialsStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY);
  /** key of the material currently being edited inline, or null */
  const [editingKey, setEditingKey] = useState<string | null>(null);
  /** draft copy used while editing an existing material */
  const [editDraft, setEditDraft] = useState<Material | null>(null);

  const startEdit = (m: Material) => {
    setEditingKey(m.key);
    setEditDraft({ ...m, name: { ...m.name } });
  };
  const cancelEdit = () => {
    setEditingKey(null);
    setEditDraft(null);
  };
  const commitEdit = () => {
    if (!editDraft) return;
    const nameText = editDraft.name[lang].trim();
    if (!nameText) return;
    updateMaterial(editDraft.key, editDraft);
    cancelEdit();
  };

  const handleAdd = () => {
    const nameText = draft.name[lang].trim();
    if (!nameText) return;
    const key = `custom-${Date.now()}`;
    addMaterial({ ...draft, key, name: { ...draft.name } });
    setDraft({ ...EMPTY, name: { en: '', he: '' } });
  };

  return (
    <fieldset className="space-y-3">
      <legend className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        {t('config.customMaterials')}
      </legend>

      {/* Existing custom materials */}
      {materials.length > 0 && (
        <ul className="space-y-1">
          {materials.map((m) =>
            editingKey === m.key && editDraft ? (
              /* ── Inline edit form ── */
              <li
                key={m.key}
                className="border-wood-300 dark:border-wood-600 bg-wood-50 dark:bg-wood-800 space-y-2 rounded border p-2"
              >
                <div className="grid grid-cols-2 gap-2">
                  <label className="col-span-2 block">
                    <span className="text-wood-600 dark:text-wood-300 text-xs">{t('config.materialName')}</span>
                    <input
                      type="text"
                      value={editDraft.name[lang]}
                      onChange={(e) =>
                        setEditDraft({ ...editDraft, name: { ...editDraft.name, [lang]: e.target.value } })
                      }
                      className="border-wood-200 dark:border-wood-700 dark:bg-wood-900 mt-0.5 block w-full rounded border bg-white px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-wood-600 dark:text-wood-300 text-xs">{t('config.thickness')} (mm)</span>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={editDraft.thickness}
                      onChange={(e) => setEditDraft({ ...editDraft, thickness: Number(e.target.value) })}
                      className="border-wood-200 dark:border-wood-700 dark:bg-wood-900 mt-0.5 block w-full rounded border bg-white px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-wood-600 dark:text-wood-300 text-xs">{t('config.price')}</span>
                    <input
                      type="number"
                      min={0}
                      value={editDraft.pricePerSheet ?? 0}
                      onChange={(e) => setEditDraft({ ...editDraft, pricePerSheet: Number(e.target.value) })}
                      className="border-wood-200 dark:border-wood-700 dark:bg-wood-900 mt-0.5 block w-full rounded border bg-white px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-wood-600 dark:text-wood-300 text-xs">{t('config.sheetW')} (mm)</span>
                    <input
                      type="number"
                      min={100}
                      value={editDraft.sheetWidth}
                      onChange={(e) => setEditDraft({ ...editDraft, sheetWidth: Number(e.target.value) })}
                      className="border-wood-200 dark:border-wood-700 dark:bg-wood-900 mt-0.5 block w-full rounded border bg-white px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-wood-600 dark:text-wood-300 text-xs">{t('config.sheetL')} (mm)</span>
                    <input
                      type="number"
                      min={100}
                      value={editDraft.sheetLength}
                      onChange={(e) => setEditDraft({ ...editDraft, sheetLength: Number(e.target.value) })}
                      className="border-wood-200 dark:border-wood-700 dark:bg-wood-900 mt-0.5 block w-full rounded border bg-white px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-wood-600 dark:text-wood-300 text-xs">{t('config.color')}</span>
                    <input
                      type="color"
                      value={editDraft.color}
                      onChange={(e) => setEditDraft({ ...editDraft, color: e.target.value })}
                      className="border-wood-200 dark:border-wood-700 mt-0.5 block h-8 w-full rounded border"
                    />
                  </label>
                  <label className="col-span-2 flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editDraft.hasGrain}
                      onChange={(e) => setEditDraft({ ...editDraft, hasGrain: e.target.checked })}
                      className="border-wood-300 rounded"
                    />
                    <span className="text-wood-600 dark:text-wood-300 text-xs">{t('config.hasGrain')}</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={commitEdit}
                    disabled={!editDraft.name[lang].trim()}
                    className="bg-wood-600 hover:bg-wood-700 flex-1 rounded px-2 py-1 text-xs font-medium text-white transition-colors disabled:opacity-40"
                  >
                    {t('config.saveEdit')}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-700 flex-1 rounded border px-2 py-1 text-xs transition-colors"
                  >
                    {t('config.cancel')}
                  </button>
                </div>
              </li>
            ) : (
              /* ── Read-only row ── */
              <li key={m.key} className="flex items-center gap-2 text-sm">
                <span
                  className="border-wood-300 dark:border-wood-600 inline-block h-4 w-4 shrink-0 rounded border"
                  style={{ backgroundColor: m.color }}
                  aria-hidden="true"
                />
                <span className="text-wood-700 dark:text-wood-200 flex-1 text-xs">
                  {m.name[lang]} ({m.thickness} mm{m.pricePerSheet ? `, ₪${m.pricePerSheet}` : ''})
                </span>
                <button
                  onClick={() => startEdit(m)}
                  className="text-wood-400 hover:text-wood-600 dark:hover:text-wood-200 text-xs"
                  aria-label={`${t('config.edit')} ${m.name[lang]}`}
                >
                  ✎
                </button>
                <button
                  onClick={() => removeMaterial(m.key)}
                  className="text-xs font-bold text-red-500 hover:text-red-700"
                  aria-label={t('config.remove')}
                >
                  ✕
                </button>
              </li>
            ),
          )}
        </ul>
      )}

      {/* Toggle form */}
      <button
        onClick={() => setOpen(!open)}
        className="text-wood-600 dark:text-wood-300 text-sm hover:underline"
        aria-expanded={open}
      >
        {open ? '▾ ' : '▸ '}
        {t('config.addCustomMaterial')}
      </button>

      {open && (
        <div className="border-wood-200 dark:border-wood-700 bg-wood-50 dark:bg-wood-800 grid grid-cols-2 gap-2 rounded border p-3">
          <label className="col-span-2 block">
            <span className="text-wood-600 dark:text-wood-300 text-xs">{t('config.materialName')}</span>
            <input
              type="text"
              value={draft.name[lang]}
              onChange={(e) => setDraft({ ...draft, name: { ...draft.name, [lang]: e.target.value } })}
              className="border-wood-200 dark:border-wood-700 dark:bg-wood-900 mt-0.5 block w-full rounded border bg-white px-2 py-1 text-sm"
              placeholder={lang === 'he' ? 'שם החומר' : 'Material name'}
            />
          </label>

          <label className="block">
            <span className="text-wood-600 dark:text-wood-300 text-xs">{t('config.thickness')} (mm)</span>
            <input
              type="number"
              min={1}
              max={50}
              value={draft.thickness}
              onChange={(e) => setDraft({ ...draft, thickness: Number(e.target.value) })}
              className="border-wood-200 dark:border-wood-700 dark:bg-wood-900 mt-0.5 block w-full rounded border bg-white px-2 py-1 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-wood-600 dark:text-wood-300 text-xs">{t('config.category')}</span>
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as MaterialCategory })}
              className="border-wood-200 dark:border-wood-700 dark:bg-wood-900 mt-0.5 block w-full rounded border bg-white px-2 py-1 text-sm"
            >
              <option value="panel">{t('config.catPanel')}</option>
              <option value="back">{t('config.catBack')}</option>
            </select>
          </label>

          <label className="block">
            <span className="text-wood-600 dark:text-wood-300 text-xs">{t('config.sheetW')} (mm)</span>
            <input
              type="number"
              min={100}
              value={draft.sheetWidth}
              onChange={(e) => setDraft({ ...draft, sheetWidth: Number(e.target.value) })}
              className="border-wood-200 dark:border-wood-700 dark:bg-wood-900 mt-0.5 block w-full rounded border bg-white px-2 py-1 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-wood-600 dark:text-wood-300 text-xs">{t('config.sheetL')} (mm)</span>
            <input
              type="number"
              min={100}
              value={draft.sheetLength}
              onChange={(e) => setDraft({ ...draft, sheetLength: Number(e.target.value) })}
              className="border-wood-200 dark:border-wood-700 dark:bg-wood-900 mt-0.5 block w-full rounded border bg-white px-2 py-1 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-wood-600 dark:text-wood-300 text-xs">{t('config.price')}</span>
            <input
              type="number"
              min={0}
              value={draft.pricePerSheet ?? 0}
              onChange={(e) => setDraft({ ...draft, pricePerSheet: Number(e.target.value) })}
              className="border-wood-200 dark:border-wood-700 dark:bg-wood-900 mt-0.5 block w-full rounded border bg-white px-2 py-1 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-wood-600 dark:text-wood-300 text-xs">{t('config.color')}</span>
            <input
              type="color"
              value={draft.color}
              onChange={(e) => setDraft({ ...draft, color: e.target.value })}
              className="border-wood-200 dark:border-wood-700 mt-0.5 block h-8 w-full rounded border"
            />
          </label>

          <label className="col-span-2 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={draft.hasGrain}
              onChange={(e) => setDraft({ ...draft, hasGrain: e.target.checked })}
              className="border-wood-300 rounded"
            />
            <span className="text-wood-600 dark:text-wood-300 text-xs">{t('config.hasGrain')}</span>
          </label>

          <button
            onClick={handleAdd}
            disabled={!draft.name[lang].trim()}
            className="bg-wood-600 hover:bg-wood-700 col-span-2 rounded px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-40"
          >
            {t('config.addMaterial')}
          </button>
        </div>
      )}
    </fieldset>
  );
}
