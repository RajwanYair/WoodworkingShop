import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { CONSTRAINTS, HARD_LIMITS } from '../../engine/materials';
import { computeEqualShelfPositions } from '../../engine/dimensions';
import { SliderInput } from './SliderInput';

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
            {positions.map((pos, idx) => (
              <label key={idx} className="text-xs text-wood-600 dark:text-wood-300 flex flex-col gap-1">
                <span>{t('shelves.position', { n: idx + 1 })}</span>
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
            ))}
          </div>
        </div>
      )}
    </fieldset>
  );
}
