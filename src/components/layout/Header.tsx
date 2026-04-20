import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { useToastStore } from '../../store/toast-store';
import { configToUrl } from '../../utils/url-state';
import { HelpButton } from './OnboardingOverlay';

const tabs = ['configurator', 'preview', 'optimizer', 'assembly', 'pdf'] as const;

export function Header() {
  const { t, i18n } = useTranslation();
  const { activeTab, setActiveTab, darkMode, toggleDarkMode, canUndo, canRedo, undo, redo } = useCabinetStore();
  const lang = i18n.language;

  const toggleLang = () => {
    const next = lang === 'en' ? 'he' : 'en';
    i18n.changeLanguage(next);
    document.documentElement.dir = next === 'he' ? 'rtl' : 'ltr';
    useCabinetStore.getState().setConfig({ lang: next as 'en' | 'he' });
  };

  return (
    <header className="bg-wood-700 text-white px-3 sm:px-4 py-2 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2" data-print="hide">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold truncate">{t('app.title')}</h1>
          <p className="text-wood-200 text-xs sm:text-sm hidden sm:block">{t('app.subtitle')}</p>
        </div>
        {/* Mobile-only controls row */}
        <div className="flex items-center gap-2 sm:hidden">
          <button onClick={undo} disabled={!canUndo} className="text-wood-200 hover:text-white text-sm disabled:opacity-30" aria-label="Undo">↩</button>
          <button onClick={redo} disabled={!canRedo} className="text-wood-200 hover:text-white text-sm disabled:opacity-30" aria-label="Redo">↪</button>
          <button onClick={toggleDarkMode} className="text-wood-200 hover:text-white text-sm">{darkMode ? '☀️' : '🌙'}</button>
          <button onClick={toggleLang} className="text-wood-200 hover:text-white text-sm font-medium">{lang === 'en' ? 'עב' : 'EN'}</button>
        </div>
      </div>

      {/* Tab nav — horizontally scrollable on mobile */}
      <nav className="flex gap-1 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none" aria-label="Main navigation">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            aria-current={activeTab === tab ? 'page' : undefined}
            title={`${t(`tabs.${tab}`)} (Alt+${i + 1})`}
            className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-wood-500 text-white'
                : 'text-wood-200 hover:bg-wood-600'
            }`}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </nav>

      {/* Desktop controls */}
      <div className="hidden sm:flex items-center gap-3">
        <button onClick={undo} disabled={!canUndo} className="text-wood-200 hover:text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed" title="Undo (Ctrl+Z)" aria-label="Undo">↩</button>
        <button onClick={redo} disabled={!canRedo} className="text-wood-200 hover:text-white text-sm disabled:opacity-30 disabled:cursor-not-allowed" title="Redo (Ctrl+Y)" aria-label="Redo">↪</button>
        <button
          onClick={() => {
            const url = configToUrl(useCabinetStore.getState().config);
            navigator.clipboard.writeText(url);
            useToastStore.getState().addToast(t('toast.linkCopied'), 'success');
          }}
          className="text-wood-200 hover:text-white text-sm"
          title="Copy shareable link"
        >
          🔗
        </button>
        <button onClick={toggleDarkMode} className="text-wood-200 hover:text-white text-sm" title={t('footer.darkMode')}>{darkMode ? '☀️' : '🌙'}</button>
        <button onClick={toggleLang} className="text-wood-200 hover:text-white text-sm font-medium">{lang === 'en' ? 'עב' : 'EN'}</button>
        <HelpButton />
      </div>
    </header>
  );
}
