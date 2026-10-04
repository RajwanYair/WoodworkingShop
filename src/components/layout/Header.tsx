import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { HelpButton } from './OnboardingOverlay';
import { TemplatePicker } from '../configurator/TemplatePicker';
import { ProjectManagerModal } from './ProjectManagerModal';
import { MarketplacePanel } from './MarketplacePanel';
import { SUPPORTED_LANGUAGES, RTL_LANGS, loadLocale, type SupportedLang } from '../../i18n';
import { APP_TABS, dispatchCommandAction, formatShortcut, getCommand, type CommandId } from './command-registry';
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
  IconSearch,
} from './Icons';

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
  const { activeTab, setActiveTab, darkMode, highContrastMode, units, canUndo, canRedo } = useCabinetStore();
  const lang = i18n.language;
  const [showTemplates, setShowTemplates] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showMarketplace, setShowMarketplace] = useState(false);
  const tabListRef = useRef<HTMLDivElement>(null);
  const commandLabel = (id: CommandId) => {
    const command = getCommand(id);
    return command ? t(command.labelKey) : '';
  };
  const runCommand = (id: CommandId) => {
    const command = getCommand(id);
    command?.handler({ run: dispatchCommandAction, setActiveTab });
  };
  const commandTitle = (id: CommandId) => {
    const command = getCommand(id);
    if (!command) return '';
    const shortcut = 'shortcuts' in command ? command.shortcuts?.[0] : undefined;
    return shortcut ? `${commandLabel(id)} (${formatShortcut(shortcut)})` : commandLabel(id);
  };

  useEffect(() => {
    const openTemplates = () => setShowTemplates(true);
    const openProjects = () => setShowProjects(true);
    const openMarketplace = () => setShowMarketplace(true);
    window.addEventListener('templates:open', openTemplates);
    window.addEventListener('projects:open', openProjects);
    window.addEventListener('marketplace:open', openMarketplace);
    return () => {
      window.removeEventListener('templates:open', openTemplates);
      window.removeEventListener('projects:open', openProjects);
      window.removeEventListener('marketplace:open', openMarketplace);
    };
  }, []);

  /** Arrow-key / Home / End navigation inside the tab list.
   *  Follows WAI-ARIA Authoring Practices Guide § 3.22 (Tabs Pattern). */
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const isRtl = document.documentElement.dir === 'rtl';
    let next = -1;
    if ((e.key === 'ArrowRight' && !isRtl) || (e.key === 'ArrowLeft' && isRtl)) {
      next = (currentIndex + 1) % APP_TABS.length;
    } else if ((e.key === 'ArrowLeft' && !isRtl) || (e.key === 'ArrowRight' && isRtl)) {
      next = (currentIndex - 1 + APP_TABS.length) % APP_TABS.length;
    } else if (e.key === 'Home') {
      next = 0;
    } else if (e.key === 'End') {
      next = APP_TABS.length - 1;
    }
    if (next >= 0) {
      e.preventDefault();
      runCommand(`tab.${APP_TABS[next]}`);
      const buttons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[next]?.focus();
    }
  };

  const changeLang = (next: SupportedLang) => {
    void loadLocale(next).then(() => {
      i18n.changeLanguage(next);
      document.documentElement.dir = RTL_LANGS.has(next) ? 'rtl' : 'ltr';
      // Engine-facing lang stays 'en'|'he' — AR/ES/DE/FR fall back to EN for BOM column headers.
      const engineLang: 'en' | 'he' = next === 'he' || next === 'ar' ? 'he' : 'en';
      useCabinetStore.getState().setConfig({ lang: engineLang });
    });
  };

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
            onClick={() => runCommand('palette.open')}
            className="text-wood-200 flex items-center hover:text-white"
            aria-label={commandLabel('palette.open')}
            title={commandTitle('palette.open')}
          >
            <IconSearch size={16} />
          </button>
          <button
            onClick={() => runCommand('history.undo')}
            disabled={!canUndo}
            className="text-wood-200 flex items-center hover:text-white disabled:opacity-30"
            aria-label={commandLabel('history.undo')}
            title={commandTitle('history.undo')}
          >
            <IconUndo size={16} />
          </button>
          <button
            onClick={() => runCommand('history.redo')}
            disabled={!canRedo}
            className="text-wood-200 flex items-center hover:text-white disabled:opacity-30"
            aria-label={commandLabel('history.redo')}
            title={commandTitle('history.redo')}
          >
            <IconRedo size={16} />
          </button>
          <button
            onClick={() => runCommand('theme.toggle')}
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
        {APP_TABS.map((tab, i) => {
          return (
            <button
              key={tab}
              role="tab"
              onClick={() => runCommand(`tab.${tab}`)}
              onKeyDown={(e) => handleTabKeyDown(e, i)}
              tabIndex={activeTab === tab ? 0 : -1}
              aria-selected={activeTab === tab}
              aria-current={activeTab === tab ? 'page' : undefined}
              aria-controls="main-content"
              title={commandTitle(`tab.${tab}`)}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab ? 'bg-wood-600 text-white' : 'text-wood-200 hover:bg-wood-600'
              }`}
            >
              <span aria-hidden="true" className="shrink-0 text-sm">
                {TAB_ICONS[tab]}
              </span>
              {t(`tabs.${tab}`)}
            </button>
          );
        })}
      </div>

      {/* Desktop controls */}
      <div className="hidden items-center gap-3 sm:flex">
        <button
          onClick={() => runCommand('palette.open')}
          className="text-wood-200 flex items-center hover:text-white"
          aria-label={commandLabel('palette.open')}
          title={commandTitle('palette.open')}
        >
          <IconSearch size={16} />
        </button>
        <button
          onClick={() => runCommand('history.undo')}
          disabled={!canUndo}
          className="text-wood-200 flex items-center hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          title={commandTitle('history.undo')}
          aria-label="Undo"
        >
          <IconUndo size={16} />
        </button>
        <button
          onClick={() => runCommand('history.redo')}
          disabled={!canRedo}
          className="text-wood-200 flex items-center hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          title={commandTitle('history.redo')}
          aria-label="Redo"
        >
          <IconRedo size={16} />
        </button>
        <button
          onClick={() => runCommand('share.copy')}
          className="text-wood-200 flex items-center hover:text-white"
          title={commandTitle('share.copy')}
          aria-label={commandLabel('share.copy')}
        >
          <IconLink size={16} />
        </button>
        <button
          onClick={() => runCommand('theme.toggle')}
          className="text-wood-200 flex items-center hover:text-white"
          title={commandTitle('theme.toggle')}
          aria-label={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode ? <IconSun size={16} /> : <IconMoon size={16} />}
        </button>
        <button
          onClick={() => runCommand('contrast.toggle')}
          className={`flex items-center ${highContrastMode ? 'text-white' : 'text-wood-200 hover:text-white'}`}
          title={commandTitle('contrast.toggle')}
          aria-label={highContrastMode ? 'Disable high contrast' : 'Enable high contrast'}
          aria-pressed={highContrastMode}
        >
          <IconContrast size={16} />
        </button>
        <button
          onClick={() => runCommand('units.toggle')}
          className="text-wood-200 px-1 text-sm font-medium hover:text-white"
          title={commandTitle('units.toggle')}
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
          onClick={() => runCommand('templates.open')}
          className="text-wood-200 flex items-center hover:text-white"
          title={commandTitle('templates.open')}
          aria-label={commandLabel('templates.open')}
        >
          <IconLayers size={16} />
        </button>
        <button
          onClick={() => runCommand('projects.open')}
          className="text-wood-200 flex items-center hover:text-white"
          title={commandTitle('projects.open')}
          aria-label={commandLabel('projects.open')}
        >
          <IconFolder size={16} />
        </button>
        <button
          onClick={() => runCommand('shortcuts.toggle')}
          className="text-wood-200 flex items-center hover:text-white"
          title={commandTitle('shortcuts.toggle')}
          aria-label={commandLabel('shortcuts.toggle')}
        >
          <IconHelp size={16} />
        </button>
        <button
          onClick={() => runCommand('marketplace.open')}
          className="text-wood-200 flex items-center gap-1 hover:text-white"
          title={commandTitle('marketplace.open')}
          aria-label={commandLabel('marketplace.open')}
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
