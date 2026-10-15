import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_LABOUR_RATE } from '../../engine/costing/cost-estimator';
import { useCabinetStore } from '../../store/cabinet-store';

export function CostEstimateAdjustments() {
  const { t } = useTranslation();
  const { labourRate, setLabourRate, labourHours, setLabourHours, finishCost, setFinishCost, cost } = useCabinetStore();
  const [editingLabourRate, setEditingLabourRate] = useState(false);
  const [labourRateInput, setLabourRateInput] = useState('');
  const [editingLabourHours, setEditingLabourHours] = useState(false);
  const [labourHoursInput, setLabourHoursInput] = useState('');
  const [editingFinish, setEditingFinish] = useState(false);
  const [finishInput, setFinishInput] = useState('');

  return (
    <div className="border-wood-100 dark:border-wood-800 space-y-1 border-t pt-2">
      {/* Labour hours */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-wood-600 dark:text-wood-300 flex-1">{t('cost.labour')}</span>
        {editingLabourHours ? (
          <div className="flex shrink-0 items-center gap-1">
            <input
              type="number"
              min={0}
              step={0.5}
              value={labourHoursInput}
              onChange={(e) => setLabourHoursInput(e.target.value)}
              onBlur={() => {
                const val = parseFloat(labourHoursInput);
                setLabourHours(isNaN(val) || val < 0 ? 0 : val);
                setEditingLabourHours(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setEditingLabourHours(false);
              }}
              className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-accent w-14 rounded border bg-white px-1 py-0.5 text-xs focus:ring-1 focus:outline-none"
              ref={(el) => el?.focus()}
              aria-label={t('cost.labourHoursAriaLabel', 'Labour hours')}
            />
            <span className="text-wood-400">h</span>
          </div>
        ) : (
          <button
            onClick={() => {
              setEditingLabourHours(true);
              setLabourHoursInput(String(labourHours));
            }}
            className="text-wood-700 dark:text-wood-200 inline-flex min-h-6 min-w-6 shrink-0 items-center justify-center px-1 font-medium hover:underline"
            title={t('cost.editLabourHours', 'Click to set estimated labour hours')}
          >
            {labourHours > 0 ? `${labourHours}h → ₪${cost.labourCost}` : t('cost.notSet', '—')}
          </button>
        )}
      </div>
      {/* Labour rate */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-wood-600 dark:text-wood-300 flex-1">{t('cost.labourRate')}</span>
        {editingLabourRate ? (
          <div className="flex shrink-0 items-center gap-1">
            <span className="text-wood-400">₪</span>
            <input
              type="number"
              min={0}
              step={5}
              value={labourRateInput}
              onChange={(e) => setLabourRateInput(e.target.value)}
              onBlur={() => {
                const val = Number(labourRateInput);
                setLabourRate(isNaN(val) || val <= 0 ? DEFAULT_LABOUR_RATE : val);
                setEditingLabourRate(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setEditingLabourRate(false);
              }}
              className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-accent w-14 rounded border bg-white px-1 py-0.5 text-xs focus:ring-1 focus:outline-none"
              ref={(el) => el?.focus()}
              aria-label={t('cost.labourRateAriaLabel', 'Labour rate per hour')}
            />
            <span className="text-wood-400">/h</span>
          </div>
        ) : (
          <button
            onClick={() => {
              setEditingLabourRate(true);
              setLabourRateInput(String(labourRate));
            }}
            className={`inline-flex min-h-6 min-w-6 shrink-0 items-center justify-center px-1 font-medium hover:underline ${labourRate !== DEFAULT_LABOUR_RATE ? 'text-amber-800 dark:text-amber-300' : 'text-wood-700 dark:text-wood-200'}`}
            title={t('cost.editLabourRate', 'Click to override labour rate (₪/hr)')}
          >
            ₪{labourRate}/h{labourRate !== DEFAULT_LABOUR_RATE && <span className="text-[10px]"> ✎</span>}
          </button>
        )}
      </div>
      {/* Finish / paint cost */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-wood-600 dark:text-wood-300 flex-1">{t('cost.finish')}</span>
        {editingFinish ? (
          <div className="flex shrink-0 items-center gap-1">
            <span className="text-wood-400">₪</span>
            <input
              type="number"
              min={0}
              step={10}
              value={finishInput}
              onChange={(e) => setFinishInput(e.target.value)}
              onBlur={() => {
                const val = Number(finishInput);
                setFinishCost(isNaN(val) || val < 0 ? 0 : val);
                setEditingFinish(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setEditingFinish(false);
              }}
              className="border-wood-300 dark:border-wood-600 dark:bg-wood-800 focus:ring-accent w-16 rounded border bg-white px-1 py-0.5 text-xs focus:ring-1 focus:outline-none"
              ref={(el) => el?.focus()}
              aria-label={t('cost.finishAriaLabel', 'Finish/paint cost')}
            />
          </div>
        ) : (
          <button
            onClick={() => {
              setEditingFinish(true);
              setFinishInput(String(finishCost));
            }}
            className="text-wood-700 dark:text-wood-200 inline-flex min-h-6 min-w-6 shrink-0 items-center justify-center px-1 font-medium hover:underline"
            title={t('cost.editFinish', 'Click to set finish/paint cost')}
            aria-label={t('cost.editFinish', 'Click to set finish/paint cost')}
          >
            {finishCost > 0 ? `₪${finishCost}` : t('cost.notSet', '—')}
          </button>
        )}
      </div>
    </div>
  );
}
