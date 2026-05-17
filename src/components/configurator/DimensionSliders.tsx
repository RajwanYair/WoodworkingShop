import { useTranslation } from 'react-i18next';
import { useState, useEffect, useId } from 'react';
import { useCabinetStore } from '../../store/cabinet-store';
import { CONSTRAINTS, HARD_LIMITS } from '../../engine/materials';
import { formatDim, sliderStep } from '../../utils/units';
import { SliderInput } from './SliderInput';

type DimKey = 'width' | 'height' | 'depth';

interface DimSpec {
  key: DimKey;
  softMin: number;
  softMax: number;
  hardMin: number;
  hardMax: number;
}

const SPECS: DimSpec[] = [
  {
    key: 'width',
    softMin: CONSTRAINTS.minWidth,
    softMax: CONSTRAINTS.maxWidth,
    hardMin: HARD_LIMITS.minWidth,
    hardMax: HARD_LIMITS.maxWidth,
  },
  {
    key: 'height',
    softMin: CONSTRAINTS.minHeight,
    softMax: CONSTRAINTS.maxHeight,
    hardMin: HARD_LIMITS.minHeight,
    hardMax: HARD_LIMITS.maxHeight,
  },
  {
    key: 'depth',
    softMin: CONSTRAINTS.minDepth,
    softMax: CONSTRAINTS.maxDepth,
    hardMin: HARD_LIMITS.minDepth,
    hardMax: HARD_LIMITS.maxDepth,
  },
];

export function DimensionSliders() {
  const { t } = useTranslation();
  const { config, setConfig, units, toggleUnits } = useCabinetStore();
  const step = sliderStep(units);

  return (
    <fieldset className="space-y-4">
      <div className="flex items-center justify-between">
        <legend className="text-sm font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide">
          {t('config.dimensions')}
        </legend>
        <button
          onClick={toggleUnits}
          className="text-[10px] px-2 py-0.5 rounded border border-wood-300 dark:border-wood-600 text-wood-500 dark:text-wood-400 hover:bg-wood-100 dark:hover:bg-wood-800 transition-colors"
          title={t('config.toggleUnits')}
        >
          {units === 'metric' ? 'mm → in' : 'in → mm'}
        </button>
      </div>

      {SPECS.filter((spec) => config.furnitureType !== 'panel' || spec.key !== 'depth').map((spec) => (
        <DimensionRow
          key={spec.key}
          spec={spec}
          value={config[spec.key]}
          step={step}
          unitLabel={units === 'metric' ? 'mm' : 'in'}
          metric={units === 'metric'}
          label={t(`config.${spec.key}`)}
          onChange={(v) => setConfig({ [spec.key]: v })}
          displayValue={formatDim(config[spec.key], units)}
          tMessages={{
            outOfRange: t('config.outOfRange', {
              min: spec.hardMin,
              max: spec.hardMax,
              unit: 'mm',
            }),
            outsideRecommended: t('config.outsideRecommended', {
              rmin: spec.softMin,
              rmax: spec.softMax,
              unit: 'mm',
            }),
          }}
        />
      ))}

      {/* Toe kick height — only relevant for floor-standing cabinets/wardrobes */}
      {(config.furnitureType === 'cabinet' || config.furnitureType === 'wardrobe') && (
        <>
          <SliderInput
            label={t('config.kickHeight')}
            value={config.kickHeight ?? 0}
            onChange={(v) => setConfig({ kickHeight: v })}
            softMin={0}
            softMax={200}
            hardMin={0}
            hardMax={500}
            step={5}
            unit="mm"
          />
          {/* Quick-select presets for common kick heights */}
          <div className="flex gap-1.5 flex-wrap -mt-1">
            {[0, 75, 100, 150].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setConfig({ kickHeight: preset })}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                  (config.kickHeight ?? 0) === preset
                    ? 'border-wood-500 bg-wood-500 text-white'
                    : 'border-wood-300 dark:border-wood-600 text-wood-500 dark:text-wood-400 hover:bg-wood-100 dark:hover:bg-wood-800'
                }`}
                aria-label={`Set kick height to ${preset} mm`}
              >
                {preset} mm
              </button>
            ))}
          </div>
        </>
      )}
    </fieldset>
  );
}

interface RowProps {
  spec: DimSpec;
  value: number;
  step: number;
  unitLabel: string;
  metric: boolean;
  label: string;
  displayValue: string;
  onChange: (mm: number) => void;
  tMessages: { outOfRange: string; outsideRecommended: string };
}

const MM_PER_INCH = 25.4;

function DimensionRow({ spec, value, step, unitLabel, metric, label, displayValue, onChange, tMessages }: RowProps) {
  const inputId = useId();
  const errorId = useId();
  // The text input always edits in current display units; mm is the store value.
  const [text, setText] = useState<string>(() => valueToText(value, metric));

  // Keep the input in sync when the value changes externally (slider, presets, undo).
  useEffect(() => {
    setText(valueToText(value, metric));
  }, [value, metric]);

  const numericMm = parseToMm(text, metric);
  const validNumeric = numericMm !== null && Number.isFinite(numericMm);
  const outOfHard =
    validNumeric && (numericMm < spec.hardMin || numericMm > spec.hardMax);
  const outOfSoft =
    validNumeric && !outOfHard && (numericMm < spec.softMin || numericMm > spec.softMax);

  const message = !validNumeric || outOfHard
    ? tMessages.outOfRange
    : outOfSoft
      ? tMessages.outsideRecommended
      : '';

  const isInvalid = !validNumeric || outOfHard;
  const ariaInvalidProp = isInvalid ? ({ 'aria-invalid': 'true' as const }) : {};
  const ariaLiveProp = isInvalid ? ({ 'aria-live': 'assertive' as const }) : ({ 'aria-live': 'polite' as const });

  const sliderValue = Math.min(spec.softMax, Math.max(spec.softMin, value));

  const commitText = () => {
    if (validNumeric && !outOfHard) {
      onChange(numericMm);
    } else {
      // Revert to last good value.
      setText(valueToText(value, metric));
    }
  };

  return (
    <div className="block">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={inputId} className="text-sm text-wood-600 dark:text-wood-300">
          {label}
        </label>
        <span className="text-xs text-wood-400 font-mono">{displayValue}</span>
      </div>

      <div className="flex items-center gap-3 mt-1">
        <input
          type="range"
          min={spec.softMin}
          max={spec.softMax}
          step={step}
          value={sliderValue}
          aria-label={`${label} (${unitLabel})`}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(v);
            setText(valueToText(v, metric));
          }}
          className="flex-1 accent-primary"
        />

        <div className="flex items-center">
          <input
            id={inputId}
            type="number"
            inputMode="decimal"
            value={text}
            min={metric ? spec.hardMin : Number((spec.hardMin / MM_PER_INCH).toFixed(2))}
            max={metric ? spec.hardMax : Number((spec.hardMax / MM_PER_INCH).toFixed(2))}
            step={metric ? 1 : 0.25}
            aria-describedby={message ? errorId : undefined}
            {...ariaInvalidProp}
            onChange={(e) => setText(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitText();
                (e.target as HTMLInputElement).blur();
              }
            }}
            className={
              'w-20 text-right text-sm font-mono px-2 py-0.5 rounded border bg-white dark:bg-wood-900 ' +
              (outOfHard || !validNumeric
                ? 'border-red-500 text-red-600'
                : outOfSoft
                  ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                  : 'border-wood-300 dark:border-wood-600 text-wood-700 dark:text-wood-200')
            }
          />
          <span className="ml-1 text-[10px] text-wood-400">{unitLabel}</span>
        </div>
      </div>

      {message && (
        <p
          id={errorId}
          {...ariaLiveProp}
          className={
            'mt-1 text-[11px] ' +
            (isInvalid ? 'text-red-600' : 'text-amber-600 dark:text-amber-400')
          }
        >
          {message}
        </p>
      )}
    </div>
  );
}

function valueToText(mm: number, metric: boolean): string {
  if (metric) return String(mm);
  return (mm / MM_PER_INCH).toFixed(2);
}

function parseToMm(text: string, metric: boolean): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return metric ? Math.round(n) : Math.round(n * MM_PER_INCH);
}
