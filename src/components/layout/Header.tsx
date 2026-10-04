import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { useToastStore } from '../../store/toast-store';
import { configToUrl } from '../../utils/url-state';
import {
  APP_COMMAND_DEFINITIONS,
  APP_SHORTCUTS,
  APP_TAB_COMMANDS,
  createAppCommand,
  registerCommands,
  unregisterCommand,
} from '../../utils/command-palette';
import { HelpButton } from './OnboardingOverlay';
import { TemplatePicker } from '../configurator/TemplatePicker';
import { applyCabinetTemplate } from '../configurator/apply-template';
import { TEMPLATES } from '../../engine/templates';
import { ProjectManagerModal } from './ProjectManagerModal';
import { MarketplacePanel } from './MarketplacePanel';
import { SUPPORTED_LANGUAGES, RTL_LANGS, loadLocale, type SupportedLang } from '../../i18n';
import {
  IconSun,
  IconMoon,
  IconUndo,
  IconRedo,
  IconLink,
  IconHelp,
  IconContrast,
  IconLayers,
  IconFolder,
} from './Icons';

const tabs = APP_TAB_COMMANDS.map(({ id }) => id);

const TAB_ICONS = {
  workspace: '🏷️',
  configurator: '⚙️',
  preview: '👁️',
  optimizer: '✂️',
  assembly: '🔨',
  pdf: '📄',
  calculators: '🧮',
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
  const [showMarketplace, setShowMarketplace] = useState(false);
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

  const changeLang = useCallback(
    (next: SupportedLang) => {
      void loadLocale(next).then(() => {
        i18n.changeLanguage(next);
        document.documentElement.dir = RTL_LANGS.has(next) ? 'rtl' : 'ltr';
        // Engine-facing lang stays 'en'|'he' — AR/ES/DE/FR fall back to EN for BOM column headers.
        const engineLang: 'en' | 'he' = next === 'he' || next === 'ar' ? 'he' : 'en';
        useCabinetStore.getState().setConfig({ lang: engineLang });
      });
    },
    [i18n],
  );

  const copyShareLink = useCallback(() => {
    const { config, projectName } = useCabinetStore.getState();
    const url = configToUrl(config, projectName);
    navigator.clipboard.writeText(url).then(
      () => useToastStore.getState().addToast(t('toast.linkCopied'), 'success'),
      () => useToastStore.getState().addToast(t('toast.linkCopyFailed'), 'error'),
    );
  }, [t]);

  const openTemplates = useCallback(() => setShowTemplates(true), []);
  const openProjects = useCallback(() => setShowProjects(true), []);
  const openMarketplace = useCallback(() => setShowMarketplace(true), []);
  const openShortcuts = useCallback(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: APP_COMMAND_DEFINITIONS.openShortcuts.key }));
  }, []);

  useEffect(() => {
    const commands = [
      createAppCommand(
        APP_COMMAND_DEFINITIONS.undo,
        t(APP_COMMAND_DEFINITIONS.undo.labelKey),
        t(APP_COMMAND_DEFINITIONS.undo.categoryKey),
        undo,
        () => canUndo,
      ),
      createAppCommand(
        APP_COMMAND_DEFINITIONS.redo,
        t(APP_COMMAND_DEFINITIONS.redo.labelKey),
        t(APP_COMMAND_DEFINITIONS.redo.categoryKey),
        redo,
      ),
      createAppCommand(
        APP_COMMAND_DEFINITIONS.toggleTheme,
        t(APP_COMMAND_DEFINITIONS.toggleTheme.labelKey),
        t(APP_COMMAND_DEFINITIONS.toggleTheme.categoryKey),
        toggleDarkMode,
      ),
      createAppCommand(
        APP_COMMAND_DEFINITIONS.toggleContrast,
        t(APP_COMMAND_DEFINITIONS.toggleContrast.labelKey),
        t(APP_COMMAND_DEFINITIONS.toggleContrast.categoryKey),
        toggleHighContrast,
      ),
      createAppCommand(
        APP_COMMAND_DEFINITIONS.toggleUnits,
        t(APP_COMMAND_DEFINITIONS.toggleUnits.labelKey),
        t(APP_COMMAND_DEFINITIONS.toggleUnits.categoryKey),
        toggleUnits,
      ),
      createAppCommand(
        APP_COMMAND_DEFINITIONS.copyLink,
        t(APP_COMMAND_DEFINITIONS.copyLink.labelKey),
        t(APP_COMMAND_DEFINITIONS.copyLink.categoryKey),
        copyShareLink,
      ),
      createAppCommand(
        APP_COMMAND_DEFINITIONS.openTemplates,
        t(APP_COMMAND_DEFINITIONS.openTemplates.labelKey),
        t(APP_COMMAND_DEFINITIONS.openTemplates.categoryKey),
        openTemplates,
      ),
      ...TEMPLATES.map((template) => ({
        id: `header.template.${template.id}`,
        label: template.name[i18n.language === 'he' ? 'he' : 'en'],
        category: t('commandPalette.categories.presets'),
        keywords: [template.id],
        action: () => {
          applyCabinetTemplate(template.id);
          setShowTemplates(false);
        },
      })),
      createAppCommand(
        APP_COMMAND_DEFINITIONS.openProjects,
        t(APP_COMMAND_DEFINITIONS.openProjects.labelKey),
        t(APP_COMMAND_DEFINITIONS.openProjects.categoryKey),
        openProjects,
      ),
      createAppCommand(
        APP_COMMAND_DEFINITIONS.openMarketplace,
        t(APP_COMMAND_DEFINITIONS.openMarketplace.labelKey),
        t(APP_COMMAND_DEFINITIONS.openMarketplace.categoryKey),
        openMarketplace,
      ),
      createAppCommand(
        APP_COMMAND_DEFINITIONS.openShortcuts,
        t(APP_COMMAND_DEFINITIONS.openShortcuts.labelKey),
        t(APP_COMMAND_DEFINITIONS.openShortcuts.categoryKey),
        openShortcuts,
      ),
      ...SUPPORTED_LANGUAGES.map((language) => ({
        id: `header.language.${language.code}`,
        label: language.nativeLabel,
        category: t('commandPalette.categories.language'),
        keywords: [language.code, language.nativeLabel],
        when: () => i18n.language !== language.code,
        action: () => changeLang(language.code),
      })),
    ];
    registerCommands(commands);
    return () => commands.forEach(({ id }) => unregisterCommand(id));
  }, [
    canRedo,
    canUndo,
    changeLang,
    copyShareLink,
    i18n,
    openMarketplace,
    openProjects,
    openShortcuts,
    openTemplates,
    redo,
    t,
    toggleDarkMode,
    toggleHighContrast,
    toggleUnits,
    undo,
  ]);

  return (
    <header
      className="bg-wood-700 flex flex-col gap-2 px-3 py-2 text-white sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3"
      data-print="hide"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <img
              src={`${import.meta.env.BASE_URL}shop-badge.svg`}
              alt=""
              aria-hidden="true"
              className="h-6 w-6 rounded-full"
              loading="lazy"
            />
            <img
              src={`${import.meta.env.BASE_URL}woodgrain-spark.svg`}
              alt=""
              aria-hidden="true"
              className="h-6 w-20 opacity-80"
              loading="lazy"
            />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="truncate text-lg font-bold sm:text-xl">🪵 {t('app.title')}</h1>
            <span
              className="text-wood-300 hidden font-mono text-xs select-none sm:inline"
              aria-label={`Version ${__APP_VERSION__}`}
            >
              v{__APP_VERSION__}
            </span>
          </div>
          <p className="text-wood-200 hidden text-xs sm:block sm:text-sm">{t('app.subtitle')}</p>
          <p className="text-wood-200 mt-1 hidden text-xs tracking-wide sm:block" aria-hidden="true">
            ✨ 🛠️ 📐 🧰 🎯
          </p>
        </div>
        {/* Mobile-only controls row */}
        <div className="flex items-center gap-2 sm:hidden">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="text-wood-200 flex items-center hover:text-white disabled:opacity-30"
            aria-label={t('commandPalette.commands.undo')}
          >
            <IconUndo size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="text-wood-200 flex items-center hover:text-white disabled:opacity-30"
            aria-label={t('commandPalette.commands.redo')}
          >
            <IconRedo size={16} />
          </button>
          <button
            onClick={toggleDarkMode}
            className="text-wood-200 flex items-center hover:text-white"
            aria-label={darkMode ? 'Light mode' : 'Dark mode'}
          >
            {darkMode ? <IconSun size={16} /> : <IconMoon size={16} />}
          </button>
          <select
            value={lang}
            onChange={(e) => changeLang(e.target.value as SupportedLang)}
            className="text-wood-200 cursor-pointer border-0 bg-transparent text-xs font-medium outline-none hover:text-white"
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
        className="-mx-3 flex scrollbar-none gap-1 overflow-x-auto px-3 sm:mx-0 sm:px-0"
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
            title={
              APP_TAB_COMMANDS[i].shortcut
                ? `${t(APP_TAB_COMMANDS[i].labelKey)} (${APP_TAB_COMMANDS[i].shortcut})`
                : t(APP_TAB_COMMANDS[i].labelKey)
            }
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab ? 'bg-wood-600 text-white' : 'text-wood-200 hover:bg-wood-600'
            }`}
          >
            <span aria-hidden="true" className="shrink-0 text-sm">
              {TAB_ICONS[tab]}
            </span>
            {t(`tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Desktop controls */}
      <div className="hidden items-center gap-3 sm:flex">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="text-wood-200 flex items-center hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          title={`${t('commandPalette.commands.undo')} (${APP_SHORTCUTS.undo.shortcut})`}
          aria-label="Undo"
        >
          <IconUndo size={16} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="text-wood-200 flex items-center hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          title={`${t('commandPalette.commands.redo')} (${APP_SHORTCUTS.redo.shortcut})`}
          aria-label="Redo"
        >
          <IconRedo size={16} />
        </button>
        <button
          onClick={copyShareLink}
          className="text-wood-200 flex items-center hover:text-white"
          title="Copy shareable link"
          aria-label="Copy shareable link"
        >
          <IconLink size={16} />
        </button>
        <button
          onClick={toggleDarkMode}
          className="text-wood-200 flex items-center hover:text-white"
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
          className="text-wood-200 px-1 text-sm font-medium hover:text-white"
          title={t('config.toggleUnits')}
          aria-label={units === 'metric' ? 'Switch to imperial' : 'Switch to metric'}
        >
          {units === 'metric' ? 'mm' : 'in'}
        </button>
        <select
          value={lang}
          onChange={(e) => changeLang(e.target.value as SupportedLang)}
          className="text-wood-200 cursor-pointer border-0 bg-transparent text-xs font-medium outline-none hover:text-white"
          aria-label={t('footer.language')}
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} className="bg-wood-800 text-white">
              {l.nativeLabel}
            </option>
          ))}
        </select>
        <button
          onClick={openTemplates}
          className="text-wood-200 flex items-center hover:text-white"
          title={t('templates.title')}
          aria-label={t('templates.title')}
        >
          <IconLayers size={16} />
        </button>
        <button
          onClick={openProjects}
          className="text-wood-200 flex items-center hover:text-white"
          title={t('projects.title')}
          aria-label={t('projects.title')}
        >
          <IconFolder size={16} />
        </button>
        <button
          onClick={openShortcuts}
          className="text-wood-200 flex items-center hover:text-white"
          title={t('commandPalette.commands.keyboardShortcuts')}
          aria-label={t('commandPalette.commands.keyboardShortcuts')}
        >
          <IconHelp size={16} />
        </button>
        <button
          onClick={openMarketplace}
          className="text-wood-200 flex items-center gap-1 hover:text-white"
          title={t('marketplace.title')}
          aria-label={t('marketplace.title')}
        >
          <img
            src={`${import.meta.env.BASE_URL}shop-badge.svg`}
            alt=""
            aria-hidden="true"
            className="h-4 w-4"
            loading="lazy"
          />
          🛒
        </button>
        <HelpButton />
      </div>
      {showTemplates && <TemplatePicker onClose={() => setShowTemplates(false)} />}
      {showProjects && <ProjectManagerModal onClose={() => setShowProjects(false)} />}
      {showMarketplace && <MarketplacePanel onClose={() => setShowMarketplace(false)} />}
    </header>
  );
}
