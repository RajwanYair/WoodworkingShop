import { useTranslation } from 'react-i18next';
import { useCabinetStore, type CabinetState } from '../../store/cabinet-store';
import { useHaptics } from '../../hooks/useHaptics';

type Tab = CabinetState['activeTab'];

const TABS: { id: Tab; icon: string; labelKey: string }[] = [
  { id: 'workspace', icon: '🏷️', labelKey: 'tabs.workspace' },
  { id: 'configurator', icon: '⚙️', labelKey: 'tabs.configurator' },
  { id: 'preview', icon: '👁️', labelKey: 'tabs.preview' },
  { id: 'optimizer', icon: '✂️', labelKey: 'tabs.optimizer' },
  { id: 'assembly', icon: '🔨', labelKey: 'tabs.assembly' },
  { id: 'pdf', icon: '📄', labelKey: 'tabs.pdf' },
  { id: 'calculators', icon: '🧮', labelKey: 'tabs.calculators' },
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
      className="apple-bar fixed inset-x-0 bottom-0 z-40 flex border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
      data-print="hide"
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            aria-current={isActive ? 'page' : undefined}
            aria-label={t(tab.labelKey)}
            onClick={() => {
              setActiveTab(tab.id);
              haptics.selectionChanged();
            }}
            className={[
              'flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 pt-2 pb-1.5 text-[0.6875rem] select-none',
              isActive
                ? 'text-accent-text dark:text-accent-text-dark font-semibold'
                : 'text-wood-600 dark:text-wood-300 font-medium',
            ].join(' ')}
          >
            <span aria-hidden="true" className={`text-lg leading-none ${isActive ? '' : 'opacity-70 grayscale'}`}>
              {tab.icon}
            </span>
            <span className="block max-w-full truncate leading-none">{t(tab.labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
