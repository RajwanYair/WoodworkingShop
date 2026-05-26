import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { getMaterial } from '../../engine/materials';
import { calculateShelfSpacing, getShelfPresets } from '../../engine/shelf-spacing';
import type { ShelfPresetId } from '../../engine/shelf-spacing';

/** Collapsible panel — shelf spacing presets (Sprint 102). */
export function ShelfSpacingPresetsPanel() {
  const { t, i18n } = useTranslation();
  const { config } = useCabinetStore();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ShelfPresetId>('books-standard');
  const [customClearance, setCustomClearance] = useState(250);

  const lang = i18n.language === 'he' ? 'he' : 'en';
  const presets = getShelfPresets();

  const carcassMat = getMaterial(config.carcassMaterial);
  const matThickness = carcassMat?.thickness ?? 18;

  // Internal height = external height − 2× carcass panel thickness (top + bottom)
  const internalHeightMm = Math.max(0, config.height - 2 * matThickness);

  const result = useMemo(
    () =>
      calculateShelfSpacing(
        selected,
        internalHeightMm,
        matThickness,
        selected === 'custom' ? customClearance : undefined,
      ),
    [selected, internalHeightMm, matThickness, customClearance],
  );

  const selectedPreset = presets.find((p) => p.id === selected);

  return (
    <section className="border-wood-200 bg-wood-50 dark:border-wood-700 dark:bg-wood-900 mb-3 rounded-lg border">
      <button
        type="button"
        className="text-wood-700 dark:text-wood-200 flex w-full items-center justify-between px-3 py-2 text-sm font-semibold"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{t('shelfSpacingPanel.title')}</span>
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="space-y-3 px-3 pb-3">
          {/* Preset selector */}
          <div>
            <label
              htmlFor="shelf-preset-select"
              className="text-wood-600 dark:text-wood-300 mb-1 block text-xs font-medium"
            >
              {t('shelfSpacingPanel.preset')}
            </label>
            <select
              id="shelf-preset-select"
              className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 dark:text-wood-100 w-full rounded border bg-white px-2 py-1 text-sm"
              value={selected}
              onChange={(e) => setSelected(e.target.value as ShelfPresetId)}
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name[lang]}
                </option>
              ))}
              <option value="custom">{t('shelfSpacingPanel.custom')}</option>
            </select>
          </div>

          {/* Custom clearance input */}
          {selected === 'custom' && (
            <div>
              <label
                htmlFor="shelf-custom-clearance"
                className="text-wood-600 dark:text-wood-300 mb-1 block text-xs font-medium"
              >
                {t('shelfSpacingPanel.customClearance')}
              </label>
              <div className="flex items-center gap-1">
                <input
                  id="shelf-custom-clearance"
                  type="number"
                  min={50}
                  max={2000}
                  step={10}
                  value={customClearance}
                  onChange={(e) => setCustomClearance(Math.max(50, Number(e.target.value)))}
                  className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 dark:text-wood-100 w-24 rounded border bg-white px-2 py-1 text-sm"
                />
                <span className="text-wood-500 text-xs">{t('shelfSpacingPanel.mm')}</span>
              </div>
            </div>
          )}

          {/* Preset note */}
          {selectedPreset && selected !== 'custom' && (
            <p className="text-wood-500 dark:text-wood-400 text-xs italic">{selectedPreset.note[lang]}</p>
          )}

          {/* Result summary */}
          <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
            <dt className="text-wood-600 dark:text-wood-300">{t('shelfSpacingPanel.clearance')}</dt>
            <dd className="font-medium tabular-nums">
              {result.actualClearanceMm} {t('shelfSpacingPanel.mm')}
            </dd>
            <dt className="text-wood-600 dark:text-wood-300">{t('shelfSpacingPanel.shelfCount')}</dt>
            <dd className="font-medium tabular-nums">{result.shelfCount}</dd>
          </dl>

          {/* Fit warning */}
          {!result.fitsAtLeastOne && (
            <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              {t('shelfSpacingPanel.noFit')}
            </p>
          )}

          {/* Positions list */}
          {result.fitsAtLeastOne && (
            <div>
              <p className="text-wood-600 dark:text-wood-300 mb-1 text-xs font-medium">
                {t('shelfSpacingPanel.positions')}
              </p>
              <ul className="flex flex-wrap gap-1">
                {result.positions.map((pos, i) => (
                  <li
                    key={i}
                    className="bg-wood-100 text-wood-700 dark:bg-wood-700 dark:text-wood-200 rounded px-1.5 py-0.5 font-mono text-xs"
                  >
                    {pos} {t('shelfSpacingPanel.mm')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Material warnings */}
          {result.warnings.map((w, i) => (
            <p
              key={i}
              className="rounded bg-red-50 px-2 py-1 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300"
            >
              {t('shelfSpacingPanel.warning')}: {w[lang]}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
