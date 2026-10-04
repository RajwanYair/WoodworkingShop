import './i18n';
import './index.css';
import { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import workspaceBanner from '../docs/banner.svg';
import { Header } from './components/layout/Header';
import { SkeletonPane } from './components/layout/SkeletonPane';
import { Sidebar } from './components/layout/Sidebar';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { ToastContainer } from './components/layout/ToastContainer';
import { OnboardingManager } from './components/layout/OnboardingOverlay';
import { TouchGestureTutorial } from './components/layout/TouchGestureTutorial';
import { MobileTabBar } from './components/layout/MobileTabBar';
import { ActiveCabinetSwitcher } from './components/layout/ActiveCabinetSwitcher';
import { ShortcutsModal } from './components/layout/ShortcutsModal';
import { CommandPalette } from './components/layout/CommandPalette';
import { CALCULATOR_COMMANDS, type CalculatorCommandId } from './components/configurator/calculator-commands';
import { listProjects } from './utils/project-storage';
import { SwUpdateBanner } from './components/layout/SwUpdateBanner';
import { IconPrint } from './components/layout/Icons';
import { useCabinetStore, type CabinetState } from './store/cabinet-store';
import { useToastStore } from './store/toast-store';
import { useSystemDarkMode } from './hooks/useSystemDarkMode';
import { usePwaFileHandlers } from './hooks/usePwaFileHandlers';
import { useHaptics } from './hooks/useHaptics';
import { useTouchGestures } from './hooks/useTouchGestures';
import { generateParts } from './engine/parts';
import { generateHardware } from './engine/hardware';
import { getCustomMaterials } from './store/custom-materials-store';
import { downloadBomCsv } from './utils/bom-export';
import { configToUrl, readTabFromUrl, pushTabToUrl } from './utils/url-state';
import {
  APP_COMMAND_DEFINITIONS,
  APP_SHORTCUTS,
  APP_TAB_COMMANDS,
  createAppCommand,
  registerCommands,
  unregisterCommand,
} from './utils/command-palette';
import type { Lang } from './engine/types';

// Lazy-load heavy / route-isolated panels so the initial bundle stays lean
// (Sprint 110). PDF in particular pulls in @react-pdf/renderer (~1.6 MB).
const PdfExportPanel = lazy(() =>
  import('./components/pdf/PdfExportPanel').then((m) => ({ default: m.PdfExportPanel })),
);
const OptimizerView = lazy(() =>
  import('./components/optimizer/OptimizerView').then((m) => ({ default: m.OptimizerView })),
);
const AssemblyGuide = lazy(() =>
  import('./components/assembly/AssemblyGuide').then((m) => ({ default: m.AssemblyGuide })),
);
// Phase 11 — RoomLayoutView is route-isolated; lazy-load to trim initial parse.
const RoomLayoutViewLazy = lazy(() =>
  import('./components/layout/RoomLayoutView').then((m) => ({ default: m.RoomLayoutView })),
);
const CalculatorsPanel = lazy(() =>
  import('./components/configurator/CalculatorsPanel').then((m) => ({ default: m.CalculatorsPanel })),
);
const Preview3DPanel = lazy(() =>
  import('./components/preview/Preview3DPanel').then((m) => ({ default: m.Preview3DPanel })),
);
const ConfiguratorPanel = lazy(() =>
  import('./components/configurator/ConfiguratorPanel').then((m) => ({ default: m.ConfiguratorPanel })),
);
const CabinetPreview = lazy(() =>
  import('./components/preview/CabinetPreview').then((m) => ({ default: m.CabinetPreview })),
);
const SmartOptimizerPanel = lazy(() =>
  import('./components/optimizer/SmartOptimizerPanel').then((m) => ({ default: m.SmartOptimizerPanel })),
);
const PartsTable = lazy(() => import('./components/optimizer/Tables').then((m) => ({ default: m.PartsTable })));
const HardwareTable = lazy(() => import('./components/optimizer/Tables').then((m) => ({ default: m.HardwareTable })));
const ProjectSummaryPanel = lazy(() =>
  import('./components/optimizer/ProjectSummaryPanel').then((m) => ({ default: m.ProjectSummaryPanel })),
);

function App() {
  const { activeTab, darkMode, projectName } = useCabinetStore();
  const highContrastMode = useCabinetStore((s) => s.highContrastMode);
  const focusMode = useCabinetStore((s) => s.focusMode);
  const { t, i18n } = useTranslation();
  const haptics = useHaptics();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [, setProjectCommandsVersion] = useState(0);
  const [requestedCalculatorSection, setRequestedCalculatorSection] = useState<{
    id: CalculatorCommandId;
    request: number;
  } | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  // Track whether this is the initial render so we don't steal focus on load
  const isFirstRender = useRef(true);

  // Ordered app tabs — used for swipe-based navigation
  useEffect(() => {
    const commands = APP_TAB_COMMANDS.map(({ id, labelKey, shortcut }) => ({
      id: `tab.${id}`,
      label: t(labelKey),
      category: 'tabs',
      ...(shortcut ? { shortcut } : {}),
      action: () => useCabinetStore.getState().setActiveTab(id),
    }));
    registerCommands(commands);
    return () => commands.forEach(({ id }) => unregisterCommand(id));
  }, [t]);

  useEffect(() => {
    if (!showCommandPalette) return;

    let cancelled = false;
    const projectCommandIds: string[] = [];

    void listProjects()
      .then((projects) => {
        if (cancelled) return;
        const commands = projects
          .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
          .slice(0, 10)
          .map((project) => {
            const id = `project.open.${project.id}`;
            projectCommandIds.push(id);
            return {
              id,
              label: project.name,
              category: t('commandPalette.categories.projects'),
              keywords: [project.id],
              action: () => {
                const store = useCabinetStore.getState();
                store.loadProject(project.cabinets);
                store.setProjectName(project.name);
                useToastStore.getState().addToast(t('projects.loaded'), 'success');
              },
            };
          });
        registerCommands(commands);
        setProjectCommandsVersion((version) => version + 1);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      projectCommandIds.forEach(unregisterCommand);
    };
  }, [showCommandPalette, t]);

  useEffect(() => {
    let request = 0;
    const commands = CALCULATOR_COMMANDS.map(({ id, titleKey }) => ({
      id: `calculator.${id}`,
      label: t(titleKey),
      category: t('commandPalette.categories.calculators'),
      action: () => {
        request += 1;
        setRequestedCalculatorSection({ id, request });
        useCabinetStore.getState().setActiveTab('calculators');
      },
    }));
    registerCommands(commands);
    return () => commands.forEach(({ id }) => unregisterCommand(id));
  }, [t]);

  // Sprint 82 — swipe left/right on the main content area to switch app tabs
  // (skipped on 'preview' tab which has its own swipe gesture for SVG views)
  const appSwipe = useTouchGestures({
    onSwipeLeft: () => {
      if (activeTab === 'preview') return;
      const idx = APP_TAB_COMMANDS.findIndex(({ id }) => id === activeTab);
      if (idx < APP_TAB_COMMANDS.length - 1) {
        useCabinetStore.getState().setActiveTab(APP_TAB_COMMANDS[idx + 1].id);
        haptics.selectionChanged();
      }
    },
    onSwipeRight: () => {
      if (activeTab === 'preview') return;
      const idx = APP_TAB_COMMANDS.findIndex(({ id }) => id === activeTab);
      if (idx > 0) {
        useCabinetStore.getState().setActiveTab(APP_TAB_COMMANDS[idx - 1].id);
        haptics.selectionChanged();
      }
    },
  });

  // Sync dark mode to <html> so browser-level UI (scrollbar, form controls,
  // color-scheme) follows. The Tailwind `dark:` variant is class-based via
  // @custom-variant in index.css.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', darkMode);
    root.style.colorScheme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  // Sprint 298 — URL tab deep-linking and browser history synchronization.
  const initialTabFromUrlRef = useRef(readTabFromUrl());
  const tabUrlInitialisedRef = useRef(false);
  const popStateTabRef = useRef<CabinetState['activeTab'] | null>(null);
  useEffect(() => {
    const tab = initialTabFromUrlRef.current;
    if (tab) {
      useCabinetStore.getState().setActiveTab(tab);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const tab = readTabFromUrl() ?? 'workspace';
      if (tab === useCabinetStore.getState().activeTab) return;
      popStateTabRef.current = tab;
      useCabinetStore.getState().setActiveTab(tab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!tabUrlInitialisedRef.current) {
      tabUrlInitialisedRef.current = true;
      if (initialTabFromUrlRef.current === null) pushTabToUrl(activeTab, true);
      return;
    }
    if (popStateTabRef.current === activeTab) {
      popStateTabRef.current = null;
      return;
    }
    if (activeTab !== initialTabFromUrlRef.current) pushTabToUrl(activeTab);
  }, [activeTab]);

  // Sprint 48 — follow OS (prefers-color-scheme) changes in real-time
  useSystemDarkMode();

  // Phase 13 / Sprint 7 — PWA File Handling: open .cabinetplan files from OS
  usePwaFileHandlers((project) => {
    useCabinetStore.getState().loadProject(project.cabinets);
  });

  const exportBom = useCallback(() => {
    const { cabinets, projectName: pName, config } = useCabinetStore.getState();
    const lang = (i18n.language as Lang) || (config.lang as Lang) || 'en';
    const filePrefix = (pName.trim() || 'cabinet').replace(/[^\w\u05D0-\u05EA.-]/g, '-').replace(/-+/g, '-');
    const materials = getCustomMaterials();
    const bomData = (cabinets.length > 0 ? cabinets : [{ name: 'Cabinet', config }]).map((cab) => ({
      name: cab.name,
      parts: generateParts(cab.config, materials),
      hardware: generateHardware(cab.config, materials),
    }));
    downloadBomCsv(bomData, lang, `${filePrefix}-bom.csv`, i18n.language);
    useToastStore.getState().addToast(t('shortcuts.exportBom'), 'success');
  }, [i18n.language, t]);

  const addCabinet = useCallback(() => {
    useCabinetStore.getState().addCabinet();
    useToastStore.getState().addToast(t('shortcuts.addCabinet'), 'success');
    haptics.notification('success');
  }, [haptics, t]);

  const saveSnapshot = useCallback(() => {
    useCabinetStore.getState().saveSnapshot('');
    useToastStore.getState().addToast(t('shortcuts.saveSnapshot'), 'success');
  }, [t]);

  const resetConfig = useCallback(() => {
    useCabinetStore.getState().resetConfig();
    useToastStore.getState().addToast(t('shortcuts.resetConfig'), 'info');
  }, [t]);

  const toggleFocusMode = useCallback(() => {
    useCabinetStore.getState().toggleFocusMode();
    const entering = useCabinetStore.getState().focusMode;
    useToastStore.getState().addToast(t(entering ? 'focusMode.enter' : 'focusMode.exit'), 'info');
  }, [t]);

  useEffect(() => {
    const commands = [
      createAppCommand(
        APP_COMMAND_DEFINITIONS.addCabinet,
        t(APP_COMMAND_DEFINITIONS.addCabinet.labelKey),
        t(APP_COMMAND_DEFINITIONS.addCabinet.categoryKey),
        addCabinet,
      ),
      createAppCommand(
        APP_COMMAND_DEFINITIONS.exportBom,
        t(APP_COMMAND_DEFINITIONS.exportBom.labelKey),
        t(APP_COMMAND_DEFINITIONS.exportBom.categoryKey),
        exportBom,
      ),
      createAppCommand(
        APP_COMMAND_DEFINITIONS.saveSnapshot,
        t(APP_COMMAND_DEFINITIONS.saveSnapshot.labelKey),
        t(APP_COMMAND_DEFINITIONS.saveSnapshot.categoryKey),
        saveSnapshot,
      ),
      createAppCommand(
        APP_COMMAND_DEFINITIONS.resetConfig,
        t(APP_COMMAND_DEFINITIONS.resetConfig.labelKey),
        t(APP_COMMAND_DEFINITIONS.resetConfig.categoryKey),
        resetConfig,
      ),
      createAppCommand(
        APP_COMMAND_DEFINITIONS.print,
        t(APP_COMMAND_DEFINITIONS.print.labelKey),
        t(APP_COMMAND_DEFINITIONS.print.categoryKey),
        () => window.print(),
      ),
      createAppCommand(
        APP_COMMAND_DEFINITIONS.toggleFocusMode,
        t(APP_COMMAND_DEFINITIONS.toggleFocusMode.labelKey),
        t(APP_COMMAND_DEFINITIONS.toggleFocusMode.categoryKey),
        toggleFocusMode,
      ),
    ];
    registerCommands(commands);
    return () => commands.forEach(({ id }) => unregisterCommand(id));
  }, [addCabinet, exportBom, resetConfig, saveSnapshot, t, toggleFocusMode]);

  // Focus restoration: move focus to the main landmark when the active tab changes
  // so keyboard users land at the start of new content (WCAG 2.2 success criterion 2.4.3)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [activeTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest('input, textarea, select, [contenteditable="true"]'))
      ) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      // Open command palette: Ctrl/Cmd+K
      if (ctrl && e.key.toLowerCase() === APP_SHORTCUTS.commandPalette.key && !e.shiftKey) {
        e.preventDefault();
        setShowCommandPalette(true);
        return;
      }

      // Undo: Ctrl+Z
      if (ctrl && !e.shiftKey && e.key === APP_SHORTCUTS.undo.key) {
        e.preventDefault();
        useCabinetStore.getState().undo();
        return;
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        ctrl &&
        (e.key === APP_SHORTCUTS.redo.key ||
          (e.shiftKey &&
            (e.key === APP_SHORTCUTS.redoAlternate.key || e.key === APP_SHORTCUTS.redoAlternate.key.toUpperCase())))
      ) {
        e.preventDefault();
        useCabinetStore.getState().redo();
        return;
      }
      // Save snapshot: Ctrl+Shift+S
      if (ctrl && e.shiftKey && e.key.toLowerCase() === APP_SHORTCUTS.saveSnapshot.key) {
        e.preventDefault();
        saveSnapshot();
        return;
      }
      // Print: Ctrl+P
      if (ctrl && e.key.toLowerCase() === APP_SHORTCUTS.print.key) {
        e.preventDefault();
        window.print();
        return;
      }
      // Export BOM CSV: Ctrl+E (Sprint 57)
      if (ctrl && e.key.toLowerCase() === APP_SHORTCUTS.exportBom.key) {
        e.preventDefault();
        exportBom();
        return;
      }
      // Reset config to defaults: Ctrl+R (Sprint 66)
      if (ctrl && e.key.toLowerCase() === APP_SHORTCUTS.resetConfig.key) {
        e.preventDefault();
        resetConfig();
        return;
      }
      // Copy share link: Ctrl+L (Sprint 71)
      if (ctrl && e.key.toLowerCase() === APP_SHORTCUTS.copyLink.key) {
        e.preventDefault();
        const { config, projectName: pName } = useCabinetStore.getState();
        const url = configToUrl(config, pName);
        navigator.clipboard.writeText(url).then(
          () => useToastStore.getState().addToast(t('shortcuts.copyLink'), 'success'),
          () => useToastStore.getState().addToast(t('toast.linkCopyFailed'), 'error'),
        );
        return;
      }
      // Add cabinet: Ctrl+Shift+N (Sprint 86)
      if (ctrl && e.shiftKey && e.key.toLowerCase() === APP_SHORTCUTS.addCabinet.key) {
        e.preventDefault();
        addCabinet();
        return;
      }
      // Focus/Kiosk mode: Ctrl+Shift+K (Sprint 90)
      if (ctrl && e.shiftKey && e.key.toLowerCase() === APP_SHORTCUTS.toggleFocusMode.key) {
        e.preventDefault();
        toggleFocusMode();
        return;
      }
      // Tab switching: Alt+1-6; Dark mode: Alt+D (Sprint 168)
      if (e.altKey && !ctrl) {
        const tab = APP_TAB_COMMANDS.find(({ shortcutKey }) => shortcutKey === e.key)?.id;
        if (tab) {
          e.preventDefault();
          useCabinetStore.getState().setActiveTab(tab);
          haptics.selectionChanged();
          return;
        }
        if (e.key.toLowerCase() === APP_SHORTCUTS.toggleTheme.key) {
          e.preventDefault();
          useCabinetStore.getState().toggleDarkMode();
          return;
        }
      }
      // Shortcuts help: ?
      if (e.key === APP_SHORTCUTS.shortcuts.key && !ctrl) {
        setShowShortcuts((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [addCabinet, exportBom, haptics, i18n.language, resetConfig, saveSnapshot, t, toggleFocusMode]);

  return (
    <div
      className={
        [darkMode ? 'dark' : '', highContrastMode ? 'high-contrast' : ''].filter(Boolean).join(' ') || undefined
      }
    >
      <div className="app-bg text-wood-800 dark:text-wood-100 min-h-screen">
        <a
          href="#main-content"
          className="bg-wood-600 sr-only rounded px-3 py-1 text-sm text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
        >
          {t('a11y.skipToContent')}
        </a>
        {!focusMode && <Header />}
        <div className="flex">
          {!focusMode && <Sidebar />}
          <main
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            className="min-w-0 flex-1 p-3 pb-20 focus:outline-none sm:p-6 sm:pb-6 lg:pb-6"
            role="main"
            aria-label={t('a11y.mainWorkspace')}
            onTouchStart={appSwipe.onTouchStart}
            onTouchMove={appSwipe.onTouchMove}
            onTouchEnd={appSwipe.onTouchEnd}
          >
            <div className="mb-3 flex justify-end">
              <button
                data-print="hide"
                onClick={() => window.print()}
                className="bg-wood-600 hover:bg-wood-700 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-colors print:hidden"
                title="Print current view"
                aria-label="Print current view"
              >
                <IconPrint size={20} />
              </button>
            </div>
            {/* Sprint 170 — print-only header: shows project name + date on paper */}
            <div className="print-only-header">
              {projectName ? `${projectName} — ` : ''}Cabinet Planner
              <span className="float-end text-[9pt] font-normal">{new Date().toLocaleDateString()}</span>
            </div>
            {['preview', 'optimizer', 'assembly', 'pdf', 'calculators'].includes(activeTab) && (
              <ActiveCabinetSwitcher />
            )}

            {activeTab === 'workspace' && (
              <section
                aria-label={t('tabs.workspace')}
                className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center"
              >
                <img
                  src={workspaceBanner}
                  alt={t('tabs.workspace')}
                  className="border-wood-200 dark:border-wood-700 w-full rounded-xl border shadow-xl"
                  width={1200}
                  height={260}
                  loading="eager"
                  fetchPriority="high"
                />
                <div className="space-y-2">
                  <h2 className="text-wood-800 dark:text-wood-100 text-2xl font-bold">{t('app.title')}</h2>
                  <p className="text-wood-600 dark:text-wood-300 text-sm">{t('app.subtitle')}</p>
                </div>
                <button
                  onClick={() => useCabinetStore.getState().setActiveTab('configurator')}
                  className="bg-wood-600 hover:bg-wood-700 rounded-md px-5 py-2 text-sm font-medium text-white transition-colors"
                >
                  {t('tabs.configurator')}
                </button>
              </section>
            )}
            {activeTab === 'configurator' && (
              <div className="space-y-6">
                <ErrorBoundary panelName={t('tabs.configurator')}>
                  <Suspense fallback={<SkeletonPane label={t('skeleton.loading')} />}>
                    <ConfiguratorPanel />
                  </Suspense>
                </ErrorBoundary>
                <Suspense fallback={<SkeletonPane label={t('skeleton.loading')} />}>
                  <RoomLayoutViewLazy />
                </Suspense>
              </div>
            )}
            {activeTab === 'preview' && (
              <div className="space-y-6">
                <ErrorBoundary panelName={t('tabs.preview')}>
                  <Suspense fallback={<SkeletonPane label={t('skeleton.loading')} />}>
                    <CabinetPreview />
                  </Suspense>
                </ErrorBoundary>
                <ErrorBoundary panelName={t('errors.interactivePreview')}>
                  <Suspense fallback={<SkeletonPane label={t('skeleton.loading')} />}>
                    <Preview3DPanel />
                  </Suspense>
                </ErrorBoundary>
              </div>
            )}
            {activeTab === 'optimizer' && (
              <ErrorBoundary panelName={t('tabs.optimizer')}>
                <Suspense fallback={<SkeletonPane label={t('skeleton.loadingOptimizer')} cards={4} />}>
                  <div className="space-y-8">
                    <ProjectSummaryPanel />
                    <SmartOptimizerPanel />
                    <PartsTable />
                    <HardwareTable />
                    <OptimizerView />
                  </div>
                </Suspense>
              </ErrorBoundary>
            )}
            {activeTab === 'assembly' && (
              <ErrorBoundary panelName={t('tabs.assembly')}>
                <Suspense fallback={<SkeletonPane label={t('skeleton.loadingAssembly')} cards={3} />}>
                  <AssemblyGuide />
                </Suspense>
              </ErrorBoundary>
            )}
            {activeTab === 'pdf' && (
              <ErrorBoundary panelName={t('tabs.pdf')}>
                <Suspense fallback={<SkeletonPane label={t('skeleton.loadingPdf')} cards={2} />}>
                  <PdfExportPanel />
                </Suspense>
              </ErrorBoundary>
            )}
            {activeTab === 'calculators' && (
              <ErrorBoundary panelName={t('tabs.calculators')}>
                <Suspense fallback={<SkeletonPane label={t('skeleton.loading')} cards={6} />}>
                  <CalculatorsPanel requestedSection={requestedCalculatorSection} />
                </Suspense>
              </ErrorBoundary>
            )}
          </main>
        </div>
        <ToastContainer />
        {!focusMode && <MobileTabBar />}
        <OnboardingManager />
        <TouchGestureTutorial />
        <SwUpdateBanner />
        {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
        <CommandPalette open={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
      </div>
    </div>
  );
}

export default App;
