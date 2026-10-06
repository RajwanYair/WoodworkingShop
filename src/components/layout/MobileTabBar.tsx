import { useTranslation } from 'react-i18next';
import { useCabinetStore, type CabinetState } from '../../store/cabinet-store';
import { useHaptics } from '../../hooks/useHaptics';
import { TAB_ICONS } from './tab-icons';

type Tab = CabinetState['activeTab'];

const TABS: { id: Tab; labelKey: string }[] = [
  { id: 'workspace', labelKey: 'tabs.workspace' },
  { id: 'configurator', labelKey: 'tabs.configurator' },
  { id: 'preview', labelKey: 'tabs.preview' },
  { id: 'optimizer', labelKey: 'tabs.optimizer' },
  { id: 'assembly', labelKey: 'tabs.assembly' },
  { id: 'pdf', labelKey: 'tabs.pdf' },
  { id: 'calculators', labelKey: 'tabs.calculators' },
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
        const Icon = TAB_ICONS[tab.id];
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
            <Icon size={22} className={isActive ? '' : 'opacity-80'} />
            <span className="block max-w-full truncate leading-none">{t(tab.labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
