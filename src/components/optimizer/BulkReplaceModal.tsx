/**
 * BulkReplaceModal (v3.18.0)
 *
 * Lets the user swap every occurrence of one material with another across all
 * cabinets in the project. The operation is undoable via the normal undo stack.
 */

import { useState, useEffect, useRef } from 'react';
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

  const firstSelectRef = useRef<HTMLSelectElement>(null);

  // Focus trap
  useEffect(() => {
    firstSelectRef.current?.focus();
  }, []);

  // ESC closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

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
        className="absolute inset-0 bg-black/50 w-full h-full border-0 p-0 cursor-default"
        onClick={onClose}
        aria-label="Close dialog"
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('bulkReplace.title', 'Bulk Material Replace')}
        className="relative bg-white dark:bg-wood-900 rounded-xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-wood-900 dark:text-wood-50">
            {t('bulkReplace.title', 'Bulk Material Replace')}
          </h2>
          <button
            onClick={onClose}
            aria-label={t('common.close', 'Close')}
            className="p-1.5 rounded hover:bg-wood-100 dark:hover:bg-wood-800 text-wood-600 dark:text-wood-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Description */}
        <p className="text-sm text-wood-600 dark:text-wood-400">
          {t(
            'bulkReplace.description',
            'Replace one material with another across all cabinets in this project. This action is undoable.',
          )}
        </p>

        {/* From */}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-wood-700 dark:text-wood-300">
            {t('bulkReplace.from', 'Replace')}
          </span>
          <select
            ref={firstSelectRef}
            value={fromKey}
            onChange={(e) => {
              setFromKey(e.target.value);
              setApplied(false);
            }}
            className="rounded-lg border border-wood-300 dark:border-wood-600 bg-white dark:bg-wood-800 text-wood-900 dark:text-wood-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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
          <span className="text-sm font-medium text-wood-700 dark:text-wood-300">{t('bulkReplace.to', 'With')}</span>
          <select
            value={toKey}
            onChange={(e) => {
              setToKey(e.target.value);
              setApplied(false);
            }}
            className="rounded-lg border border-wood-300 dark:border-wood-600 bg-white dark:bg-wood-800 text-wood-900 dark:text-wood-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
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
          <p className="text-xs text-wood-600 dark:text-wood-300 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
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
            className="px-4 py-2 text-sm rounded-lg border border-wood-300 dark:border-wood-600 text-wood-700 dark:text-wood-300 hover:bg-wood-100 dark:hover:bg-wood-800 transition-colors"
          >
            {t('common.close', 'Close')}
          </button>
          <button
            onClick={handleApply}
            disabled={!fromKey || !toKey || fromKey === toKey}
            className="px-4 py-2 text-sm rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors"
          >
            {t('bulkReplace.apply', 'Apply to All')}
          </button>
        </div>
      </div>
    </div>
  );
}
