import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { useToastStore } from '../../store/toast-store';
import { configToUrl } from '../../utils/url-state';
import { HelpButton } from './OnboardingOverlay';
import {
  IconSun,
  IconMoon,
  IconUndo,
  IconRedo,
  IconLink,
  IconHelp,
  IconSettings,
  IconEye,
  IconScissors,
  IconHammer,
  IconDocument,
  IconContrast,
} from './Icons';

const tabs = ['configurator', 'preview', 'optimizer', 'assembly', 'pdf'] as const;

const TAB_ICONS = {
  configurator: <IconSettings size={14} className="shrink-0" />,
  preview: <IconEye size={14} className="shrink-0" />,
  optimizer: <IconScissors size={14} className="shrink-0" />,
  assembly: <IconHammer size={14} className="shrink-0" />,
  pdf: <IconDocument size={14} className="shrink-0" />,
} as const;

export function Header() {
  const { t, i18n } = useTranslation();
  const { activeTab, setActiveTab, darkMode, toggleDarkMode, highContrastMode, toggleHighContrast, units, toggleUnits, canUndo, canRedo, undo, redo } =
    useCabinetStore();
  const lang = i18n.language;

  const toggleLang = () => {
    const next = lang === 'en' ? 'he' : 'en';
    i18n.changeLanguage(next);
    document.documentElement.dir = next === 'he' ? 'rtl' : 'ltr';
    useCabinetStore.getState().setConfig({ lang: next as 'en' | 'he' });
  };

  return (
    <header
      className="bg-wood-700 text-white px-3 sm:px-4 py-2 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
      data-print="hide"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h1 className="text-lg sm:text-xl font-bold truncate">{t('app.title')}</h1>
            <span
              className="hidden sm:inline text-xs font-mono text-wood-300 select-none"
              aria-label={`Version ${__APP_VERSION__}`}
            >
              v{__APP_VERSION__}
            </span>
          </div>
          <p className="text-wood-200 text-xs sm:text-sm hidden sm:block">{t('app.subtitle')}</p>
        </div>
        {/* Mobile-only controls row */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="text-wood-200 hover:text-white disabled:opacity-30 flex items-center"
            aria-label="Undo"
          >
            <IconUndo size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="text-wood-200 hover:text-white disabled:opacity-30 flex items-center"
            aria-label="Redo"
          >
            <IconRedo size={16} />
          </button>
          <button
            onClick={toggleDarkMode}
            className="text-wood-200 hover:text-white flex items-center"
            aria-label={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? <IconSun size={16} /> : <IconMoon size={16} />}
          </button>
          <button
            onClick={toggleLang}
            className="text-wood-200 hover:text-white text-sm font-medium"
            aria-label="Toggle language"
          >
            {lang === 'en' ? 'עב' : 'EN'}
          </button>
        </div>
      </div>

      {/* Tab nav — horizontally scrollable on mobile */}
      <div
        className="flex gap-1 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none"
        role="tablist"
        aria-label="Main navigation"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab}
            role="tab"
            onClick={() => setActiveTab(tab)}
            aria-selected={activeTab === tab ? 'true' : 'false'}
            aria-current={activeTab === tab ? 'page' : undefined}
            title={`${t(`tabs.${tab}`)} (Alt+${i + 1})`}
            className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === tab ? 'bg-wood-500 text-white' : 'text-wood-200 hover:bg-wood-600'
            }`}
          >
            {TAB_ICONS[tab]}
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Desktop controls */}
      <div className="hidden sm:flex items-center gap-3">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="text-wood-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center"
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <IconUndo size={16} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="text-wood-200 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center"
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          <IconRedo size={16} />
        </button>
        <button
          onClick={() => {
            const url = configToUrl(useCabinetStore.getState().config);
            navigator.clipboard.writeText(url);
            useToastStore.getState().addToast(t('toast.linkCopied'), 'success');
          }}
          className="text-wood-200 hover:text-white flex items-center"
          title="Copy shareable link"
          aria-label="Copy shareable link"
        >
          <IconLink size={16} />
        </button>
        <button
          onClick={toggleDarkMode}
          className="text-wood-200 hover:text-white flex items-center"
          title={t('footer.darkMode')}
          aria-label={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode ? <IconSun size={16} /> : <IconMoon size={16} />}
        </button>
        <button
          onClick={toggleHighContrast}
          className={`flex items-center ${highContrastMode ? 'text-white' : 'text-wood-200 hover:text-white'}`}
          title={t('footer.highContrast')}
          aria-label={highContrastMode ? 'Disable high contrast' : 'Enable high contrast'}
          aria-pressed={highContrastMode}
        >
          <IconContrast size={16} />
        </button>
        <button
          onClick={toggleUnits}
          className="text-wood-200 hover:text-white text-sm font-medium px-1"
          title={t('config.toggleUnits')}
          aria-label={units === 'metric' ? 'Switch to imperial' : 'Switch to metric'}
        >
          {units === 'metric' ? 'mm' : 'in'}
        </button>
        <button onClick={toggleLang} className="text-wood-200 hover:text-white text-sm font-medium">
          {lang === 'en' ? 'עב' : 'EN'}
        </button>
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }))}
          className="text-wood-200 hover:text-white flex items-center"
          title="Keyboard shortcuts (?)"
          aria-label="Keyboard shortcuts"
        >
          <IconHelp size={16} />
        </button>
        <HelpButton />
      </div>
    </header>
  );
}
