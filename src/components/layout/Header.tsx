import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { configToUrl } from '../../utils/url-state';

const tabs = ['configurator', 'preview', 'optimizer', 'pdf'] as const;

export function Header() {
  const { t, i18n } = useTranslation();
  const { activeTab, setActiveTab, darkMode, toggleDarkMode } = useCabinetStore();
  const lang = i18n.language;

  const toggleLang = () => {
    const next = lang === 'en' ? 'he' : 'en';
    i18n.changeLanguage(next);
    document.documentElement.dir = next === 'he' ? 'rtl' : 'ltr';
    useCabinetStore.getState().setConfig({ lang: next as 'en' | 'he' });
  };

  return (
    <header className="bg-wood-700 text-white px-4 py-3 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold">{t('app.title')}</h1>
        <p className="text-wood-200 text-sm hidden sm:block">{t('app.subtitle')}</p>
      </div>

      {/* Tab nav */}
      <nav className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-wood-500 text-white'
                : 'text-wood-200 hover:bg-wood-600'
            }`}
          >
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </nav>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            const url = configToUrl(useCabinetStore.getState().config);
            navigator.clipboard.writeText(url);
          }}
          className="text-wood-200 hover:text-white text-sm"
          title="Copy shareable link"
        >
          🔗
        </button>
        <button
          onClick={toggleDarkMode}
          className="text-wood-200 hover:text-white text-sm"
          title={t('footer.darkMode')}
        >
          {darkMode ? '☀️' : '🌙'}
        </button>
        <button
          onClick={toggleLang}
          className="text-wood-200 hover:text-white text-sm font-medium"
        >
          {lang === 'en' ? 'עב' : 'EN'}
        </button>
      </div>
    </header>
  );
}
