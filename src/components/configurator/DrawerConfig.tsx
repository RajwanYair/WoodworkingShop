import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { HARD_LIMITS } from '../../engine/materials';
import { SliderInput } from './SliderInput';
import type { DrawerSlideType } from '../../engine/types';

export function DrawerConfig() {
  const { t, i18n } = useTranslation();
  const { config, setConfig } = useCabinetStore();
  const isHe = i18n.language === 'he';

  const setDrawerHeight = (idx: number, val: number) => {
    const heights = Array.from({ length: config.drawerCount }, (_, i) => config.drawerHeights?.[i] ?? 150);
    heights[idx] = val;
    setConfig({ drawerHeights: heights });
  };

  return (
    <fieldset className="space-y-4">
      <legend className="text-wood-700 dark:text-wood-200 text-sm font-semibold tracking-wide uppercase">
        {t('config.drawers')}
      </legend>

      <SliderInput
        label={t('config.drawerCount')}
        value={config.drawerCount}
        onChange={(v) => {
          // Reset drawerHeights when count changes
          setConfig({ drawerCount: v, drawerHeights: undefined });
        }}
        softMin={0}
        softMax={4}
        hardMin={0}
        hardMax={HARD_LIMITS.maxDrawers}
        step={1}
      />

      {config.drawerCount > 0 && (
        <>
          {/* Drawer slide type */}
          <div className="space-y-1">
            <p className="text-wood-600 dark:text-wood-300 text-sm">{t('config.drawerSlideType')}</p>
            <div className="flex flex-wrap gap-3">
              {(['standard', 'soft-close', 'full-extension'] as DrawerSlideType[]).map((type) => (
                <label key={type} className="flex cursor-pointer items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="drawerSlideType"
                    value={type}
                    checked={(config.drawerSlideType ?? 'standard') === type}
                    onChange={() => setConfig({ drawerSlideType: type })}
                    className="accent-primary"
                  />
                  {t(`config.drawerSlide_${type.replace('-', '_')}`)}
                </label>
              ))}
            </div>
          </div>

          {/* Per-drawer heights */}
          <div className="border-wood-200 dark:border-wood-700 space-y-2 border-s-2 ps-2">
            <p className="text-wood-600 dark:text-wood-300 text-xs">
              {isHe ? 'גובה קופסת מגירה (מ"מ)' : 'Drawer box height (mm)'}
            </p>
            {Array.from({ length: config.drawerCount }, (_, i) => (
              <SliderInput
                key={i}
                label={isHe ? `מגירה ${i + 1}` : `Drawer ${i + 1}`}
                value={config.drawerHeights?.[i] ?? 150}
                onChange={(v) => setDrawerHeight(i, v)}
                softMin={80}
                softMax={250}
                hardMin={50}
                hardMax={500}
                step={5}
                unit="mm"
              />
            ))}
          </div>
        </>
      )}
    </fieldset>
  );
}
