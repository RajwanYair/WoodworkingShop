import { useTranslation } from 'react-i18next';
import { useCabinetStore, type CabinetState } from '../../store/cabinet-store';
import { useHaptics } from '../../hooks/useHaptics';

type Tab = CabinetState['activeTab'];

const TABS: { id: Tab; icon: string; labelKey: string }[] = [
  { id: 'workspace', icon: '🏷️🪵', labelKey: 'tabs.workspace' },
  { id: 'configurator', icon: '⚙️🪚', labelKey: 'tabs.configurator' },
  { id: 'preview', icon: '👁️✨', labelKey: 'tabs.preview' },
  { id: 'optimizer', icon: '✂️📐', labelKey: 'tabs.optimizer' },
  { id: 'assembly', icon: '🔨🧰', labelKey: 'tabs.assembly' },
  { id: 'pdf', icon: '📄🗂️', labelKey: 'tabs.pdf' },
  { id: 'calculators', icon: '🧮📏', labelKey: 'tabs.calculators' },
];

/**
 * Sprint 82 — sticky bottom tab bar for mobile.
 * Visible only on small screens (< lg breakpoint).
 * Uses safe-area-inset-bottom so it clears iOS home-indicator.
 */
export function MobileTabBar() {
  const { t } = useTranslation();
  const { activeTab, setActiveTab } = useCabinetStore();
  const haptics = useHaptics();

  return (
    <nav
      aria-label={t('a11y.mobileTabNav')}
      className="border-wood-200 bg-wood-50 dark:border-wood-700 dark:bg-wood-900 fixed inset-x-0 bottom-0 z-40 flex border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
      data-print="hide"
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-label={t(tab.labelKey)}
            onClick={() => {
              setActiveTab(tab.id);
              haptics.selectionChanged();
            }}
            className={[
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-colors',
              isActive ? 'text-wood-700 dark:text-wood-100 font-semibold' : 'text-wood-400 dark:text-wood-500',
            ].join(' ')}
          >
            {isActive ? (
              <img src="/tab-sparkle.svg" alt="" aria-hidden="true" className="h-3 w-8 opacity-90" loading="lazy" />
            ) : null}
            <span aria-hidden="true" className="text-lg leading-none">
              {tab.icon}
            </span>
            <span className="leading-none">{t(tab.labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
