import { useState } from 'react';
import type { DefectZone } from '../../engine/types';
import { IconWarning } from '../layout/Icons';

/** Phase 12 / Sprint 13 — per-material defect zone manager panel. */
export function DefectZonePanel({
  materials,
  defectZones,
  onAdd,
  onRemove,
  t,
}: {
  materials: string[];
  defectZones: Record<string, DefectZone[]>;
  onAdd: (materialKey: string, zone: DefectZone) => void;
  onRemove: (materialKey: string, zoneIndex: number) => void;
  t: (k: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const [editMat, setEditMat] = useState('');
  const [form, setForm] = useState({ x: 0, y: 0, width: 100, length: 100 });

  const allZones = materials.flatMap((m) => (defectZones[m] ?? []).map((z, i) => ({ ...z, material: m, idx: i })));

  if (materials.length === 0) return null;

  const handleAdd = () => {
    if (!editMat || form.width <= 0 || form.length <= 0) return;
    onAdd(editMat, { x: form.x, y: form.y, width: form.width, length: form.length });
    setForm({ x: 0, y: 0, width: 100, length: 100 });
  };

  return (
    <div className="border-wood-200 dark:border-wood-700 mt-4 rounded-lg border bg-white dark:bg-neutral-900">
      <button
        type="button"
        className="text-wood-700 dark:text-wood-200 flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <IconWarning size={14} />
        {t('optimizer.defectZones')}
        <span className="bg-wood-100 dark:bg-wood-800 text-wood-500 ms-1 rounded px-1.5 text-[10px]">
          {allZones.length}
        </span>
        <span className="ms-auto">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-wood-100 dark:border-wood-800 border-t px-4 pt-3 pb-4">
          {/* Add zone form */}
          <div className="mb-3 flex flex-wrap items-end gap-2 text-xs">
            <label className="flex flex-col gap-0.5">
              <span className="text-wood-500">{t('optimizer.defectMaterial')}</span>
              <select
                value={editMat}
                onChange={(e) => setEditMat(e.target.value)}
                className="border-wood-300 dark:border-wood-600 rounded border bg-white px-1.5 py-1 text-xs dark:bg-neutral-800"
              >
                <option value="">—</option>
                {materials.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            {(['x', 'y', 'width', 'length'] as const).map((field) => (
              <label key={field} className="flex flex-col gap-0.5">
                <span className="text-wood-500">{field} (mm)</span>
                <input
                  type="number"
                  min={field === 'width' || field === 'length' ? 1 : 0}
                  value={form[field]}
                  onChange={(e) => setForm((f) => ({ ...f, [field]: Number(e.target.value) }))}
                  className="border-wood-300 dark:border-wood-600 w-16 rounded border bg-white px-1.5 py-1 text-xs dark:bg-neutral-800"
                />
              </label>
            ))}
            <button
              type="button"
              onClick={handleAdd}
              disabled={!editMat || form.width <= 0 || form.length <= 0}
              className="rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-40"
            >
              {t('optimizer.defectAdd')}
            </button>
          </div>
          {/* Existing zones */}
          {allZones.length === 0 ? (
            <p className="text-wood-400 text-xs italic">{t('optimizer.defectNone')}</p>
          ) : (
            <ul className="space-y-1">
              {allZones.map((z, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-wood-500 font-medium">{z.material}</span>
                  <span className="text-wood-600 dark:text-wood-300">
                    x={z.x} y={z.y} {z.width}×{z.length} mm
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(z.material, z.idx)}
                    className="ms-auto text-[10px] text-red-400 hover:text-red-600"
                    title={t('optimizer.defectRemove')}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
