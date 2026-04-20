import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { estimateCost } from '../../engine/cost-estimator';
import type { Lang } from '../../engine/types';

export function CostEstimatePanel() {
  const { t, i18n } = useTranslation();
  const { optimization, hardware, edgeBandingTotal } = useCabinetStore();
  const lang = i18n.language as Lang;

  const cost = estimateCost(optimization, hardware, edgeBandingTotal);

  return (
    <div className="border border-wood-200 dark:border-wood-700 rounded-lg p-3 space-y-3">
      <h3 className="text-xs font-semibold text-wood-700 dark:text-wood-200 uppercase tracking-wide">
        {t('cost.title')}
      </h3>

      {/* Sheet costs */}
      <div className="space-y-1">
        {cost.sheetCosts.map((sc, i) => (
          <div key={i} className="flex justify-between text-xs">
            <span className="text-wood-600 dark:text-wood-300">
              {sc.materialName[lang]} ×{sc.qty}
            </span>
            <span className="font-medium text-wood-700 dark:text-wood-200">
              ₪{sc.subtotal}
            </span>
          </div>
        ))}
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

      {/* Total */}
      <div className="border-t border-wood-300 dark:border-wood-600 pt-2">
        <div className="flex justify-between">
          <span className="text-sm font-bold text-wood-700 dark:text-wood-200">
            {t('cost.total')}
          </span>
          <span className="text-sm font-bold text-green-700 dark:text-green-400">
            ₪{cost.totalCost}
          </span>
        </div>
        <p className="text-[10px] text-wood-400 dark:text-wood-500 mt-1">
          {t('cost.disclaimer')}
        </p>
      </div>
    </div>
  );
}
