/**
 * BulkReplaceModal (v3.18.0)
 *
 * Lets the user swap every occurrence of one material with another across all
 * cabinets in the project. The operation is undoable via the normal undo stack.
 */

import { useState, useRef } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { useCustomMaterialsStore } from '../../store/custom-materials-store';
import { MATERIALS } from '../../engine/materials';
import type { Lang } from '../../engine/types';

interface Props {
  onClose: () => void;
}

export function BulkReplaceModal({ onClose }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Lang;
  const { cabinets, bulkReplaceMaterial } = useCabinetStore();
  const customMaterials = useCustomMaterialsStore((s) => s.materials);

  const allMaterials = [...MATERIALS, ...customMaterials];

  // Collect material keys actually in use across all cabinets
  const usedKeys = new Set<string>();
  for (const cab of cabinets) {
    usedKeys.add(cab.config.carcassMaterial);
    usedKeys.add(cab.config.backPanelMaterial);
  }

  const [fromKey, setFromKey] = useState<string>(() => {
    const first = usedKeys.values().next().value;
    return first ?? allMaterials[0]?.key ?? '';
  });
  const [toKey, setToKey] = useState<string>(allMaterials[0]?.key ?? '');
  const [applied, setApplied] = useState(false);

  const dialogContainerRef = useRef<HTMLDivElement>(null);

  // Sprint 8 — focus trap via shared hook (also handles ESC)
  useFocusTrap(dialogContainerRef, true, onClose);

  function handleApply() {
    if (!fromKey || !toKey || fromKey === toKey) return;
    bulkReplaceMaterial(fromKey, toKey);
    setApplied(true);
  }

  function materialLabel(key: string): string {
    const mat = allMaterials.find((m) => m.key === key);
    if (!mat) return key;
    return typeof mat.name === 'string' ? mat.name : (mat.name[lang] ?? mat.name['en'] ?? key);
  }

  const usedMaterials = allMaterials.filter((m) => usedKeys.has(m.key));
  const targetMaterials = allMaterials.filter((m) => m.key !== fromKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop — click outside to close */}
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default border-0 bg-black/50 p-0"
        onClick={onClose}
        aria-label="Close dialog"
        tabIndex={-1}
      />
      <div
        ref={dialogContainerRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('bulkReplace.title', 'Bulk Material Replace')}
        className="dark:bg-wood-900 relative flex w-full max-w-md flex-col gap-5 rounded-xl bg-white p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-wood-900 dark:text-wood-50 text-lg font-semibold">
            {t('bulkReplace.title', 'Bulk Material Replace')}
          </h2>
          <button
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
            className="hover:bg-wood-100 dark:hover:bg-wood-800 text-wood-600 dark:text-wood-300 rounded p-1.5 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Description */}
        <p className="text-wood-600 dark:text-wood-400 text-sm">
          {t(
            'bulkReplace.description',
            'Replace one material with another across all cabinets in this project. This action is undoable.',
          )}
        </p>

        {/* From */}
        <label className="flex flex-col gap-1.5">
          <span className="text-wood-700 dark:text-wood-300 text-sm font-medium">
            {t('bulkReplace.from', 'Replace')}
          </span>
          <select
            value={fromKey}
            onChange={(e) => {
              setFromKey(e.target.value);
              setApplied(false);
            }}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 text-wood-900 dark:text-wood-100 rounded-lg border bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            {usedMaterials.length > 0
              ? usedMaterials.map((m) => (
                  <option key={m.key} value={m.key}>
                    {materialLabel(m.key)}
                  </option>
                ))
              : allMaterials.map((m) => (
                  <option key={m.key} value={m.key}>
                    {materialLabel(m.key)}
                  </option>
                ))}
          </select>
        </label>

        {/* To */}
        <label className="flex flex-col gap-1.5">
          <span className="text-wood-700 dark:text-wood-300 text-sm font-medium">{t('bulkReplace.to', 'With')}</span>
          <select
            value={toKey}
            onChange={(e) => {
              setToKey(e.target.value);
              setApplied(false);
            }}
            className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 text-wood-900 dark:text-wood-100 rounded-lg border bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            {targetMaterials.map((m) => (
              <option key={m.key} value={m.key}>
                {materialLabel(m.key)}
              </option>
            ))}
          </select>
        </label>

        {/* Summary */}
        {fromKey && toKey && fromKey !== toKey && (
          <p className="text-wood-600 dark:text-wood-300 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs dark:border-amber-800 dark:bg-amber-950/30">
            {t('bulkReplace.summary', {
              from: materialLabel(fromKey),
              to: materialLabel(toKey),
              count: cabinets.filter(
                (c) => c.config.carcassMaterial === fromKey || c.config.backPanelMaterial === fromKey,
              ).length,
              defaultValue: 'Will update {{count}} cabinet(s): {{from}} → {{to}}',
            })}
          </p>
        )}

        {applied && (
          <p className="text-xs font-medium text-green-700 dark:text-green-400">
            {t('bulkReplace.applied', 'Done! Use Ctrl+Z to undo.')}
          </p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            onClick={onClose}
            className="border-wood-300 dark:border-wood-600 text-wood-700 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 rounded-lg border px-4 py-2 text-sm transition-colors"
          >
            {t('common.close', 'Close')}
          </button>
          <button
            onClick={handleApply}
            disabled={!fromKey || !toKey || fromKey === toKey}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('bulkReplace.apply', 'Apply to All')}
          </button>
        </div>
      </div>
    </div>
  );
}
