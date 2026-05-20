import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { useToastStore } from '../../store/toast-store';
import { configToUrl } from '../../utils/url-state';
import { HelpButton } from './OnboardingOverlay';
import { TemplatePicker } from '../configurator/TemplatePicker';
import { ProjectManagerModal } from './ProjectManagerModal';
import { SUPPORTED_LANGUAGES, RTL_LANGS, type SupportedLang } from '../../i18n';
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
  IconLayers,
  IconFolder,
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
  const {
    activeTab,
    setActiveTab,
    darkMode,
    toggleDarkMode,
    highContrastMode,
    toggleHighContrast,
    units,
    toggleUnits,
    canUndo,
    canRedo,
    undo,
    redo,
  } = useCabinetStore();
  const lang = i18n.language;
  const [showTemplates, setShowTemplates] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const tabListRef = useRef<HTMLDivElement>(null);

  /** Arrow-key / Home / End navigation inside the tab list.
   *  Follows WAI-ARIA Authoring Practices Guide § 3.22 (Tabs Pattern). */
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const isRtl = document.documentElement.dir === 'rtl';
    let next = -1;
    if ((e.key === 'ArrowRight' && !isRtl) || (e.key === 'ArrowLeft' && isRtl)) {
      next = (currentIndex + 1) % tabs.length;
    } else if ((e.key === 'ArrowLeft' && !isRtl) || (e.key === 'ArrowRight' && isRtl)) {
      next = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      next = 0;
    } else if (e.key === 'End') {
      next = tabs.length - 1;
    }
    if (next >= 0) {
      e.preventDefault();
      setActiveTab(tabs[next]);
      const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[next]?.focus();
    }
  };

  const changeLang = (next: SupportedLang) => {
    i18n.changeLanguage(next);
    document.documentElement.dir = RTL_LANGS.has(next) ? 'rtl' : 'ltr';
    // Engine-facing lang stays 'en'|'he' — AR/ES/DE/FR fall back to EN for BOM column headers.
    const engineLang: 'en' | 'he' = next === 'he' || next === 'ar' ? 'he' : 'en';
    useCabinetStore.getState().setConfig({ lang: engineLang });
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
          <select
            value={lang}
            onChange={(e) => changeLang(e.target.value as SupportedLang)}
            className="bg-transparent text-wood-200 hover:text-white text-xs font-medium border-0 outline-none cursor-pointer"
            aria-label={t('footer.language')}
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} className="bg-wood-800 text-white">
                {l.nativeLabel}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab nav — horizontally scrollable on mobile */}
      <div
        ref={tabListRef}
        className="flex gap-1 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none"
        role="tablist"
        aria-label="Main navigation"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab}
            role="tab"
            onClick={() => setActiveTab(tab)}
            onKeyDown={(e) => handleTabKeyDown(e, i)}
            tabIndex={activeTab === tab ? 0 : -1}
            aria-selected={activeTab === tab}
            aria-current={activeTab === tab ? 'page' : undefined}
            aria-controls="main-content"
            title={`${t(`tabs.${tab}`)} (Alt+${i + 1})`}
            className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === tab ? 'bg-wood-600 text-white' : 'text-wood-200 hover:bg-wood-600'
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
            const { config, projectName } = useCabinetStore.getState();
            const url = configToUrl(config, projectName);
            navigator.clipboard.writeText(url).then(
              () => useToastStore.getState().addToast(t('toast.linkCopied'), 'success'),
              () => useToastStore.getState().addToast(t('toast.linkCopyFailed'), 'error'),
            );
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
        <select
          value={lang}
          onChange={(e) => changeLang(e.target.value as SupportedLang)}
          className="bg-transparent text-wood-200 hover:text-white text-xs font-medium border-0 outline-none cursor-pointer"
          aria-label={t('footer.language')}
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} className="bg-wood-800 text-white">
              {l.nativeLabel}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowTemplates(true)}
          className="text-wood-200 hover:text-white flex items-center"
          title={t('templates.title')}
          aria-label={t('templates.title')}
        >
          <IconLayers size={16} />
        </button>
        <button
          onClick={() => setShowProjects(true)}
          className="text-wood-200 hover:text-white flex items-center"
          title={t('projects.title')}
          aria-label={t('projects.title')}
        >
          <IconFolder size={16} />
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
      {showTemplates && <TemplatePicker onClose={() => setShowTemplates(false)} />}
      {showProjects && <ProjectManagerModal onClose={() => setShowProjects(false)} />}
    </header>
  );
}
