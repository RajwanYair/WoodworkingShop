import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { CONSTRAINTS, HARD_LIMITS, getMaterial } from '../../engine/materials';
import { computeEqualShelfPositions, computeShelfDeflection } from '../../engine/dimensions';
import { SliderInput } from './SliderInput';
import { IconWarning } from '../layout/Icons';

export function ShelfConfig() {
  const { t } = useTranslation();
  const { config, dimensions, setConfig } = useCabinetStore();
  const internalH = dimensions.internalHeight;

  /**
   * Seed customShelfPositions from equal spacing the first time the user
   * switches to "custom" (or if shelfCount changed and the lengths no
   * longer match). Keeps things sane and gives the user a starting point.
   */
  const seededCustom = (): number[] => {
    const equal = computeEqualShelfPositions(internalH, config.shelfCount);
    if (config.customShelfPositions.length !== config.shelfCount) return equal;
    return [...config.customShelfPositions];
  };

  const updatePosition = (idx: number, value: number) => {
    const next = seededCustom();
    // Clamp to internal height. Don't sort while editing — lets the user
    // type intermediate values; we'll sort on commit (blur).
    next[idx] = Math.max(0, Math.min(internalH, value));
    setConfig({ shelfSpacing: 'custom', customShelfPositions: next });
  };

  const commitSort = () => {
    const sorted = [...config.customShelfPositions].sort((a, b) => a - b);
    setConfig({ customShelfPositions: sorted });
  };

  const resetEqual = () => {
    setConfig({ customShelfPositions: computeEqualShelfPositions(internalH, config.shelfCount) });
  };

  const positions = config.shelfSpacing === 'custom' ? seededCustom() : [];

  // Sprint 126 — shelf span deflection check
  const deflection =
    config.shelfCount > 0
      ? computeShelfDeflection(
          dimensions.shelfWidth,
          getMaterial(config.carcassMaterial).thickness,
          dimensions.shelfDepth,
          config.carcassMaterial,
        )
      : null;

  return (
    <fieldset className="space-y-4">
      <legend className="text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide">
        {t('config.shelves')}
      </legend>

      <SliderInput
        label={t('config.shelfCount')}
        value={config.shelfCount}
        onChange={(v) => setConfig({ shelfCount: v })}
        softMin={CONSTRAINTS.minShelves}
        softMax={CONSTRAINTS.maxShelves}
        hardMin={HARD_LIMITS.minShelves}
        hardMax={HARD_LIMITS.maxShelves}
        step={1}
      />

      {/* Sprint 126 — Shelf deflection warning */}
      {deflection && deflection.overLimit && (
        <div
          role="alert"
          className="rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-1.5"
        >
          <IconWarning size={13} className="shrink-0 mt-0.5" />
          <span>
            {t('shelves.deflectionWarning', {
              span: Math.round(dimensions.shelfWidth),
              sag: deflection.deflectionMm.toFixed(1),
              limit: deflection.limitMm.toFixed(1),
            })}
          </span>
        </div>
      )}

      {config.shelfCount > 0 && (
        <div className="flex gap-4">
          {(['equal', 'custom'] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="shelfSpacing"
                value={mode}
                checked={config.shelfSpacing === mode}
                onChange={() => {
                  if (mode === 'custom') {
                    setConfig({
                      shelfSpacing: 'custom',
                      customShelfPositions: computeEqualShelfPositions(internalH, config.shelfCount),
                    });
                  } else {
                    setConfig({ shelfSpacing: mode });
                  }
                }}
                className="accent-primary"
              />
              {t(`config.${mode}`)}
            </label>
          ))}
        </div>
      )}

      {config.shelfSpacing === 'custom' && config.shelfCount > 0 && (
        <div className="space-y-2 border-t border-wood-100 dark:border-wood-800 pt-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-medium text-wood-600 dark:text-wood-300">{t('shelves.customHeading')}</p>
            <button
              type="button"
              onClick={resetEqual}
              className="text-xs px-2 py-1 rounded bg-wood-100 dark:bg-wood-800 text-wood-600 dark:text-wood-300 hover:bg-wood-200 dark:hover:bg-wood-700 transition-colors"
            >
              {t('shelves.resetEqual')}
            </button>
          </div>
          <p className="text-[10px] text-wood-400">{t('shelves.internalHeight', { h: internalH })}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {positions.map((pos, idx) => {
              const d = dimensions.shelfDeflections[idx];
              const rating = d?.deflectionRating ?? 'safe';
              const deflectionKey =
                rating === 'danger'
                  ? 'shelves.deflectionRatingDanger'
                  : rating === 'warning'
                    ? 'shelves.deflectionRatingWarning'
                    : 'shelves.deflectionRatingSafe';
              const indicatorClass =
                rating === 'danger'
                  ? 'text-red-600 dark:text-red-400'
                  : rating === 'warning'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-green-600 dark:text-green-400';
              return (
                <label key={idx} className="text-xs text-wood-600 dark:text-wood-300 flex flex-col gap-1">
                  <span className="flex items-center gap-1">
                    {t('shelves.position', { n: idx + 1 })}
                    {d && (
                      <span
                        className={`text-[10px] font-normal ${indicatorClass}`}
                        title={t(deflectionKey, { sag: d.deflectionMm.toFixed(1) })}
                        aria-label={t(deflectionKey, { sag: d.deflectionMm.toFixed(1) })}
                      >
                        {rating !== 'safe' && <IconWarning size={10} className="inline me-0.5" aria-hidden="true" />}
                        {t(deflectionKey, { sag: d.deflectionMm.toFixed(1) })}
                      </span>
                    )}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={internalH}
                    step={10}
                    value={pos}
                    onChange={(e) => updatePosition(idx, Number(e.target.value) || 0)}
                    onBlur={commitSort}
                    className="w-full px-2 py-1 rounded border border-wood-200 dark:border-wood-700 bg-white dark:bg-wood-900 text-sm"
                    aria-label={`Shelf ${idx + 1} position in mm`}
                  />
                </label>
              );
            })}
          </div>
        </div>
      )}
    </fieldset>
  );
}
