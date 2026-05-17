import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { estimateCost } from '../../engine/cost-estimator';
import { getMaterial } from '../../engine/materials';
import type { Lang } from '../../engine/types';

const BAR_COLORS = ['#8B6F47', '#A0845C', '#C49A6C', '#6B8E23', '#4682B4'];

export function CostEstimatePanel() {
  const { t, i18n } = useTranslation();
  const { optimization, hardware, edgeBandingTotal, cabinets, materialPriceOverrides, setMaterialPriceOverride } =
    useCabinetStore();
  const lang = i18n.language as Lang;

  // Sprint 139 — which material row is being price-edited
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState('');

  const cost = estimateCost(optimization, hardware, edgeBandingTotal, materialPriceOverrides);
  const totalNonZero = cost.totalCost > 0;

  // Build segments for bar visualization
  const segments: { label: string; value: number; color: string }[] = [];
  cost.sheetCosts.forEach((sc, i) => {
    if (sc.subtotal > 0)
      segments.push({ label: sc.materialName[lang], value: sc.subtotal, color: BAR_COLORS[i % BAR_COLORS.length] });
  });
  if (cost.edgeBandingCost > 0)
    segments.push({ label: t('cost.edgeBanding'), value: cost.edgeBandingCost, color: '#D4A574' });
  if (cost.hardwareCost > 0) segments.push({ label: t('cost.hardware'), value: cost.hardwareCost, color: '#708090' });

  return (
    <div className="border border-wood-200 dark:border-wood-700 rounded-lg p-3 space-y-3">
      <h3 className="text-xs font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide">
        {t('cost.title')}
      </h3>

      {/* Visual cost breakdown bar */}
      {totalNonZero && (
        <div className="space-y-1">
          <div className="flex h-3 rounded-full overflow-hidden bg-wood-100 dark:bg-wood-800">
            {segments.map((seg, i) => (
              <div
                key={i}
                className="h-full transition-all duration-300"
                style={{ width: `${(seg.value / cost.totalCost) * 100}%`, backgroundColor: seg.color }}
                title={`${seg.label}: ₪${seg.value}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {segments.map((seg, i) => (
              <span key={i} className="flex items-center gap-1 text-[10px] text-wood-500 dark:text-wood-400">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: seg.color }} />
                {seg.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sheet costs */}
      <div className="space-y-1">
        {cost.sheetCosts.map((sc, i) => {
          const isEditing = editingPrice === sc.material;
          const hasOverride = sc.material in materialPriceOverrides;
          const defaultPrice = getMaterial(sc.material).pricePerSheet ?? 0;
          return (
            <div key={i} className="flex justify-between items-center text-xs gap-2">
              <span className="text-wood-600 dark:text-wood-300 truncate flex-1">
                {sc.materialName[lang]} ×{sc.qty}
              </span>
              {isEditing ? (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-wood-400">₪</span>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    onBlur={() => {
                      const val = Number(priceInput);
                      setMaterialPriceOverride(sc.material, isNaN(val) || val <= 0 ? null : val);
                      setEditingPrice(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') setEditingPrice(null);
                    }}
                    className="w-16 rounded border border-wood-300 dark:border-wood-600 bg-white dark:bg-wood-800 px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-wood-400"
                    ref={(el) => el?.focus()}
                    aria-label={`Price per sheet for ${sc.materialName.en}`}
                  />
                  {hasOverride && (
                    <button
                      onClick={() => { setMaterialPriceOverride(sc.material, null); setEditingPrice(null); }}
                      className="text-wood-400 hover:text-red-500 text-[10px]"
                      title={t('cost.resetPrice')}
                    >↺</button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => { setEditingPrice(sc.material); setPriceInput(String(sc.pricePerSheet || defaultPrice)); }}
                  className={`font-medium shrink-0 hover:underline ${hasOverride ? 'text-amber-600 dark:text-amber-400' : 'text-wood-700 dark:text-wood-200'}`}
                  title={t('cost.editPrice')}
                >
                  ₪{sc.subtotal} {hasOverride && <span className="text-[10px]">✎</span>}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Other costs */}
      <div className="border-t border-wood-100 dark:border-wood-800 pt-2 space-y-1">
        {cost.edgeBandingCost > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-wood-600 dark:text-wood-300">{t('cost.edgeBanding')}</span>
            <span className="font-medium">₪{cost.edgeBandingCost}</span>
          </div>
        )}
        <div className="flex justify-between text-xs">
          <span className="text-wood-600 dark:text-wood-300">{t('cost.hardware')}</span>
          <span className="font-medium">₪{cost.hardwareCost}</span>
        </div>
      </div>

      {/* Waste info */}
      {cost.wasteCost > 0 && (
        <div className="border-t border-wood-100 dark:border-wood-800 pt-2">
          <div className="flex justify-between text-xs">
            <span className="text-wood-500 dark:text-wood-400">{t('cost.waste')}</span>
            <span className="font-medium text-amber-600 dark:text-amber-400">₪{cost.wasteCost}</span>
          </div>
        </div>
      )}

      {/* Per-cabinet cost when multiple cabinets */}
      {cabinets.length > 1 && totalNonZero && (
        <div className="border-t border-wood-100 dark:border-wood-800 pt-2">
          <div className="flex justify-between text-xs">
            <span className="text-wood-500 dark:text-wood-400">{t('cost.perUnit')}</span>
            <span className="font-medium text-wood-600 dark:text-wood-300">
              ~₪{Math.round(cost.totalCost / cabinets.length)}
            </span>
          </div>
        </div>
      )}

      {/* Total */}
      <div className="border-t border-wood-300 dark:border-wood-600 pt-2">
        <div className="flex justify-between">
          <span className="text-sm font-bold text-wood-700 dark:text-wood-200">{t('cost.total')}</span>
          <span className="text-sm font-bold text-green-700 dark:text-green-400">₪{cost.totalCost}</span>
        </div>
        <p className="text-[10px] text-wood-400 dark:text-wood-500 mt-1">{t('cost.disclaimer')}</p>
      </div>
    </div>
  );
}
