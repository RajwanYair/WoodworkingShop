import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Reusable paired slider + number input with soft (slider range) and hard
 * (numeric input) bounds. The slider stays clamped within soft range, while
 * the numeric input accepts any value within hard range. Out-of-soft values
 * show an amber warning; out-of-hard or non-numeric input shows a red error
 * and reverts on blur.
 *
 * Used for integer counts (shelves, drawers) and small floats (door reveal,
 * gaps, kick-base height). For dimensional (mm/inch) sliders, see
 * DimensionSliders.tsx which adds unit conversion.
 */
export interface SliderInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  softMin: number;
  softMax: number;
  hardMin?: number;
  hardMax?: number;
  step?: number;
  unit?: string;
  decimals?: number;
  ariaLabel?: string;
}

export function SliderInput({
  label,
  value,
  onChange,
  softMin,
  softMax,
  hardMin,
  hardMax,
  step = 1,
  unit,
  decimals = 0,
  ariaLabel,
}: SliderInputProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const errorId = useId();
  const hMin = hardMin ?? softMin;
  const hMax = hardMax ?? softMax;

  const formatValue = (v: number) => (decimals > 0 ? v.toFixed(decimals) : String(v));

  const [text, setText] = useState<string>(() => formatValue(value));

  useEffect(() => {
    setText(decimals > 0 ? value.toFixed(decimals) : String(value));
  }, [value, decimals]);

  const parsed = (() => {
    const trimmed = text.trim();
    if (trimmed === '') return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  })();

  const validNumeric = parsed !== null;
  const outOfHard = validNumeric && (parsed < hMin || parsed > hMax);
  const outOfSoft = validNumeric && !outOfHard && (parsed < softMin || parsed > softMax);

  const message =
    !validNumeric || outOfHard
      ? t('config.outOfRange', { min: hMin, max: hMax, unit: unit ?? '' })
      : outOfSoft
        ? t('config.outsideRecommended', { rmin: softMin, rmax: softMax, unit: unit ?? '' })
        : '';

  const isInvalid = !validNumeric || outOfHard;
  const ariaInvalidProp = isInvalid ? { 'aria-invalid': 'true' as const } : {};
  const ariaLiveProp = isInvalid ? { 'aria-live': 'assertive' as const } : { 'aria-live': 'polite' as const };

  const sliderValue = Math.min(softMax, Math.max(softMin, value));

  const commit = () => {
    if (validNumeric && !outOfHard) {
      // Snap to step grain if integer.
      const snapped = decimals === 0 ? Math.round(parsed!) : parsed!;
      onChange(snapped);
    } else {
      setText(formatValue(value));
    }
  };

  return (
    <div className="block">
      <label htmlFor={inputId} className="text-wood-600 dark:text-wood-300 text-sm">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-3">
        <input
          type="range"
          min={softMin}
          max={softMax}
          step={step}
          value={sliderValue}
          aria-label={ariaLabel ?? label}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(v);
            setText(formatValue(v));
          }}
          className="accent-primary flex-1"
        />
        <div className="flex items-center">
          <input
            id={inputId}
            type="number"
            inputMode={decimals > 0 ? 'decimal' : 'numeric'}
            value={text}
            min={hMin}
            max={hMax}
            step={step}
            aria-describedby={message ? errorId : undefined}
            {...ariaInvalidProp}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commit();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className={
              'dark:bg-wood-900 w-16 rounded border bg-white px-2 py-0.5 text-right font-mono text-sm ' +
              (isInvalid
                ? 'border-red-500 text-red-600'
                : outOfSoft
                  ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                  : 'border-wood-300 dark:border-wood-600 text-wood-700 dark:text-wood-200')
            }
          />
          {unit && <span className="text-wood-600 dark:text-wood-300 ml-1 text-[10px]">{unit}</span>}
        </div>
      </div>
      {message && (
        <p
          id={errorId}
          {...ariaLiveProp}
          className={'mt-1 text-[11px] ' + (isInvalid ? 'text-red-600' : 'text-amber-800 dark:text-amber-300')}
        >
          {message}
        </p>
      )}
    </div>
  );
}
