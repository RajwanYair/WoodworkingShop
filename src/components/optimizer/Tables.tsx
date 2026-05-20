import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { getMaterial } from '../../engine/materials';
import type { Lang, Part } from '../../engine/types';

type SortKey = 'id' | 'name' | 'qty' | 'material' | 'length' | 'width' | 'thickness';
type SortDir = 'asc' | 'desc';

function sortParts(parts: Part[], key: SortKey, dir: SortDir, lang: Lang): Part[] {
  return [...parts].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case 'id':
        cmp = a.id.localeCompare(b.id);
        break;
      case 'name':
        cmp = a.name[lang].localeCompare(b.name[lang]);
        break;
      case 'qty':
        cmp = a.qty - b.qty;
        break;
      case 'material':
        cmp = getMaterial(a.material).name[lang].localeCompare(getMaterial(b.material).name[lang]);
        break;
      case 'length':
        cmp = a.length - b.length;
        break;
      case 'width':
        cmp = a.width - b.width;
        break;
      case 'thickness':
        cmp = a.thickness - b.thickness;
        break;
    }
    return dir === 'asc' ? cmp : -cmp;
  });
}

export function PartsTable() {
  const { t, i18n } = useTranslation();
  const { parts } = useCabinetStore();
  const lang = i18n.language as Lang;
  /** Sprint 171 — sortable column headers */
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  /** Sprint 65 — material filter */
  const [materialFilter, setMaterialFilter] = useState<string>('');

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };
  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  // Sprint 65 — collect unique material keys for the filter dropdown
  const uniqueMaterials = [...new Set(parts.map((p) => p.material))].sort();

  const filtered = materialFilter ? parts.filter((p) => p.material === materialFilter) : parts;
  const sorted = sortParts(filtered, sortKey, sortDir, lang);

  const thBtn = (key: SortKey, label: string, align = 'text-start') => (
    <th
      className={`px-2 py-1 ${align}`}
      aria-sort={sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => handleSort(key)}
        className="font-semibold hover:text-wood-600 dark:hover:text-wood-100 transition-colors"
      >
        {label}
        {arrow(key)}
      </button>
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <h3 className="text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide">
          {t('parts.title')}
        </h3>
        {/* Sprint 65 — material filter dropdown */}
        {uniqueMaterials.length > 1 && (
          <label className="flex items-center gap-2 text-xs text-wood-600 dark:text-wood-300">
            {t('optimizer.filterByMaterial')}
            <select
              value={materialFilter}
              onChange={(e) => setMaterialFilter(e.target.value)}
              className="border border-wood-300 dark:border-wood-600 rounded px-2 py-0.5 text-xs bg-white dark:bg-wood-800 text-wood-700 dark:text-wood-200"
              aria-label={t('optimizer.filterByMaterial')}
            >
              <option value="">{t('optimizer.allMaterials')}</option>
              {uniqueMaterials.map((mat) => {
                let label = mat;
                try {
                  label = getMaterial(mat).name[lang];
                } catch {
                  /* keep key */
                }
                return (
                  <option key={mat} value={mat}>
                    {label}
                  </option>
                );
              })}
            </select>
          </label>
        )}
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-wood-100 dark:bg-wood-800 text-wood-700 dark:text-wood-300">
            {thBtn('id', t('parts.id'))}
            {thBtn('name', t('parts.name'))}
            {thBtn('qty', t('parts.qty'), 'text-end')}
            {thBtn('material', t('parts.material'))}
            {thBtn('length', t('parts.length'), 'text-end')}
            {thBtn('width', t('parts.width'), 'text-end')}
            {thBtn('thickness', t('parts.thickness'), 'text-end')}
            <th className="px-2 py-1 text-start">{t('parts.edge')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const mat = getMaterial(p.material);
            return (
              <tr key={p.id} className="border-b border-wood-100 dark:border-wood-800">
                <td className="px-2 py-1 font-mono">{p.id}</td>
                <td className="px-2 py-1">{p.name[lang]}</td>
                <td className="px-2 py-1 text-end">{p.qty}</td>
                <td className="px-2 py-1">{mat.name[lang]}</td>
                <td className="px-2 py-1 text-end">{p.length}</td>
                <td className="px-2 py-1 text-end">{p.width}</td>
                <td className="px-2 py-1 text-end">{p.thickness}</td>
                <td className="px-2 py-1">{p.edgeBanding[lang]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function HardwareTable() {
  const { t, i18n } = useTranslation();
  const { hardware, hardwareQtyOverrides, setHardwareQtyOverride } = useCabinetStore();
  const lang = i18n.language as Lang;

  return (
    <div className="overflow-x-auto">
      <h3 className="text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide mb-2">
        {t('hardware.title')}
      </h3>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-wood-100 dark:bg-wood-800 text-wood-700 dark:text-wood-300">
            <th className="px-2 py-1 text-start">{t('hardware.name')}</th>
            <th className="px-2 py-1 text-end w-24">{t('hardware.qty')}</th>
            <th className="px-2 py-1 text-start">{t('hardware.unit')}</th>
            <th className="px-2 py-1 text-start w-20">{t('hardware.supplier')}</th>
          </tr>
        </thead>
        <tbody>
          {hardware.map((h) => {
            const overridden = hardwareQtyOverrides[h.id];
            const displayQty = overridden ?? h.qty;
            return (
              <tr
                key={h.id}
                className={`border-b border-wood-100 dark:border-wood-800 ${overridden !== undefined ? 'bg-amber-50 dark:bg-amber-900/20' : ''}`}
              >
                <td className="px-2 py-1">{h.name[lang]}</td>
                <td className="px-2 py-1 text-end">
                  <input
                    type="number"
                    min={0}
                    value={displayQty}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (isNaN(v)) return;
                      if (v === h.qty) setHardwareQtyOverride(h.id, null);
                      else setHardwareQtyOverride(h.id, v);
                    }}
                    className="w-16 text-end bg-transparent border-b border-dotted border-wood-400 dark:border-wood-500 focus:outline-none focus:border-wood-600 dark:focus:border-wood-300"
                    aria-label={`Quantity for ${h.name['en']}`}
                  />
                </td>
                <td className="px-2 py-1">{h.unit[lang]}</td>
                <td className="px-2 py-1">
                  {h.supplierUrl && (
                    <a
                      href={h.supplierUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-wood-500 hover:text-wood-700 dark:text-wood-400 dark:hover:text-wood-200 underline"
                      aria-label={`${h.supplierName ?? 'Supplier'} — opens in new tab`}
                    >
                      {h.supplierName ?? '↗'}
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-xs text-wood-400 dark:text-wood-500 mt-1">{t('hardware.qtyHint')}</p>
    </div>
  );
}
