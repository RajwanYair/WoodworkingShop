import './i18n';
import './index.css';
import { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from './components/layout/Header';
import { SkeletonPane } from './components/layout/SkeletonPane';
import { Sidebar } from './components/layout/Sidebar';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { ToastContainer } from './components/layout/ToastContainer';
import { OnboardingManager } from './components/layout/OnboardingOverlay';
import { TouchGestureTutorial } from './components/layout/TouchGestureTutorial';
import { MobileTabBar } from './components/layout/MobileTabBar';
import { ActiveCabinetSwitcher } from './components/layout/ActiveCabinetSwitcher';
import type { CalculatorId } from './components/configurator/calculator-catalog';
import { CALCULATOR_COMMANDS, type CalculatorCommandId } from './components/configurator/calculator-commands';
import { listProjects } from './utils/project-storage';
import { IconPrint } from './components/layout/Icons';
import { useCabinetStore } from './store/cabinet-store';
import { useToastStore } from './store/toast-store';
import { useSystemDarkMode } from './hooks/useSystemDarkMode';
import { useSwUpdate } from './hooks/useSwUpdate';
import { usePwaFileHandlers } from './hooks/usePwaFileHandlers';
import { useHaptics } from './hooks/useHaptics';
import { useTouchGestures } from './hooks/useTouchGestures';
import { generateParts } from './engine/parts';
import { generateHardware } from './engine/hardware';
import { getCustomMaterials } from './store/custom-materials-store';
import { configToUrl, readTabFromUrl, pushTabToUrl } from './utils/url-state';
import { formatDate } from './i18n/format';
import {
  APP_COMMAND_DEFINITIONS,
  APP_TAB_COMMANDS,
  createAppCommand,
  registerCommands,
  unregisterCommand,
} from './utils/command-palette';
import type { Lang } from './engine/types';
import {
  APP_TABS,
  COMMANDS,
  COMMAND_ACTION_EVENT,
  isCommandAction,
  matchesShortcut,
  type CommandAction,
} from './components/layout/command-registry';

const PdfExportPanel = lazy(() =>
  import('./components/pdf/PdfExportPanel').then((module) => ({ default: module.PdfExportPanel })),
);
const OptimizerView = lazy(() =>
  import('./components/optimizer/OptimizerView').then((module) => ({ default: module.OptimizerView })),
);
const AssemblyGuide = lazy(() =>
  import('./components/assembly/AssemblyGuide').then((module) => ({ default: module.AssemblyGuide })),
);
const RoomLayoutViewLazy = lazy(() =>
  import('./components/layout/RoomLayoutView').then((module) => ({ default: module.RoomLayoutView })),
);
const CalculatorsPanel = lazy(() =>
  import('./components/configurator/CalculatorsPanel').then((module) => ({ default: module.CalculatorsPanel })),
);
const Preview3DPanel = lazy(() =>
  import('./components/preview/Preview3DPanel').then((module) => ({ default: module.Preview3DPanel })),
);
const ConfiguratorPanel = lazy(() =>
  import('./components/configurator/ConfiguratorPanel').then((module) => ({ default: module.ConfiguratorPanel })),
);
const CabinetPreview = lazy(() =>
  import('./components/preview/CabinetPreview').then((module) => ({ default: module.CabinetPreview })),
);
const SmartOptimizerPanel = lazy(() =>
  import('./components/optimizer/SmartOptimizerPanel').then((module) => ({ default: module.SmartOptimizerPanel })),
);
const PartsTable = lazy(() =>
  import('./components/optimizer/Tables').then((module) => ({ default: module.PartsTable })),
);
const HardwareTable = lazy(() =>
  import('./components/optimizer/Tables').then((module) => ({ default: module.HardwareTable })),
);
const ProjectSummaryPanel = lazy(() =>
  import('./components/optimizer/ProjectSummaryPanel').then((module) => ({ default: module.ProjectSummaryPanel })),
);
const CommandPalette = lazy(() =>
  import('./components/layout/CommandPalette').then((module) => ({ default: module.CommandPalette })),
);
const SwUpdateBanner = lazy(() =>
  import('./components/layout/SwUpdateBanner').then((module) => ({ default: module.SwUpdateBanner })),
);
const ShortcutsModal = lazy(() =>
  import('./components/layout/ShortcutsModal').then((module) => ({ default: module.ShortcutsModal })),
);
const DiagnosticsModal = lazy(() =>
  import('./components/layout/DiagnosticsModal').then((module) => ({ default: module.DiagnosticsModal })),
);

function App() {
  const { activeTab, darkMode, projectName } = useCabinetStore();
  const highContrastMode = useCabinetStore((state) => state.highContrastMode);
  const focusMode = useCabinetStore((state) => state.focusMode);
  const { t, i18n } = useTranslation();
  const haptics = useHaptics();
  const { updateAvailable: swUpdateAvailable, reload: reloadSwUpdate } = useSwUpdate();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [calculatorRequest, setCalculatorRequest] = useState<{ id: CalculatorId; sequence: number } | null>(null);
  const calculatorRequestSequence = useRef(0);
  const closeCommandPalette = useCallback(() => setShowCommandPalette(false), []);
  const openCalculator = useCallback((id: CalculatorId) => {
    setCalculatorRequest({ id, sequence: ++calculatorRequestSequence.current });
    useCabinetStore.getState().setActiveTab('calculators');
  }, []);
  const [, setProjectCommandsVersion] = useState(0);
  const [requestedCalculatorSection, setRequestedCalculatorSection] = useState<{
    id: CalculatorCommandId;
    request: number;
  } | null>(null);
  const mainRef = useRef<HTMLElement>(null);
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

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', darkMode);
    root.style.colorScheme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  const initialTabFromUrlRef = useRef(readTabFromUrl());
  const tabUrlInitialisedRef = useRef(false);
  const popStateTabRef = useRef<(typeof APP_TABS)[number] | null>(null);
  useEffect(() => {
    const tab = initialTabFromUrlRef.current;
    if (tab) useCabinetStore.getState().setActiveTab(tab);
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
    void import('./utils/bom-export')
      .then(({ downloadBomCsv }) => {
        downloadBomCsv(bomData, lang, `${filePrefix}-bom.csv`, i18n.language);
        useToastStore.getState().addToast(t('shortcuts.exportBom'), 'success');
      })
      .catch(() => {
        useToastStore.getState().addToast(t('commandPalette.commandFailed'), 'error');
      });
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

  // Keyboard shortcuts and palette actions share the command registry.
  useEffect(() => {
    const executeCommand = (action: CommandAction) => {
      const state = useCabinetStore.getState();
      switch (action) {
        case 'palette.open':
          setShowCommandPalette(true);
          break;
        case 'history.undo':
          state.undo();
          break;
        case 'history.redo':
          state.redo();
          break;
        case 'snapshot.save':
          state.saveSnapshot('');
          useToastStore.getState().addToast(t('shortcuts.saveSnapshot'), 'success');
          break;
        case 'print.run':
          window.print();
          break;
        case 'export.bom': {
          const { cabinets, projectName: pName, config } = state;
          const lang = (i18n.language as Lang) || (config.lang as Lang) || 'en';
          const filePrefix = (pName.trim() || 'cabinet').replace(/[^\w\u05D0-\u05EA.-]/g, '-').replace(/-+/g, '-');
          const bomData = (cabinets.length > 0 ? cabinets : [{ name: 'Cabinet', config }]).map((cabinet) => ({
            name: cabinet.name,
            parts: generateParts(cabinet.config, getCustomMaterials()),
            hardware: generateHardware(cabinet.config, getCustomMaterials()),
          }));
          void import('./utils/bom-export')
            .then(({ downloadBomCsv }) => {
              downloadBomCsv(bomData, lang, `${filePrefix}-bom.csv`, i18n.language);
              useToastStore.getState().addToast(t('shortcuts.exportBom'), 'success');
            })
            .catch(() => {
              useToastStore.getState().addToast(t('commandPalette.commandFailed'), 'error');
            });
          break;
        }
        case 'config.reset':
          state.resetConfig();
          useToastStore.getState().addToast(t('shortcuts.resetConfig'), 'info');
          break;
        case 'share.copy': {
          const url = configToUrl(state.config, state.projectName);
          navigator.clipboard.writeText(url).then(
            () => useToastStore.getState().addToast(t('shortcuts.copyLink'), 'success'),
            () => useToastStore.getState().addToast(t('toast.linkCopyFailed'), 'error'),
          );
          break;
        }
        case 'cabinet.add':
          state.addCabinet();
          useToastStore.getState().addToast(t('shortcuts.addCabinet'), 'success');
          haptics.notification('success');
          break;
        case 'focus.toggle': {
          state.toggleFocusMode();
          const entering = useCabinetStore.getState().focusMode;
          useToastStore.getState().addToast(t(entering ? 'focusMode.enter' : 'focusMode.exit'), 'info');
          break;
        }
        case 'theme.toggle':
          state.toggleDarkMode();
          break;
        case 'units.toggle':
          state.toggleUnits();
          break;
        case 'contrast.toggle':
          state.toggleHighContrast();
          break;
        case 'templates.open':
          window.dispatchEvent(new Event('templates:open'));
          break;
        case 'projects.open':
          window.dispatchEvent(new Event('projects:open'));
          break;
        case 'shortcuts.toggle':
          setShowShortcuts((visible) => !visible);
          break;
        case 'diagnostics.open':
          setShowDiagnostics(true);
          break;
        case 'marketplace.open':
          window.dispatchEvent(new Event('marketplace:open'));
          break;
        case 'help.open':
          localStorage.removeItem('onboarding-seen');
          window.dispatchEvent(new Event('show-onboarding'));
          break;
      }
    };

    const actionHandler = (event: Event) => {
      const action: unknown = (event as CustomEvent<unknown>).detail;
      if (isCommandAction(action)) executeCommand(action);
    };

    const handler = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.closest('input, textarea, select, [contenteditable="true"]'))
      ) {
        return;
      }

      const state = useCabinetStore.getState();
      const availability = { canUndo: state.canUndo, canRedo: state.canRedo };
      const command = COMMANDS.find(
        (candidate) =>
          candidate.when(availability) &&
          'shortcuts' in candidate &&
          candidate.shortcuts?.some((shortcut) => matchesShortcut(event, shortcut)),
      );
      if (command) {
        event.preventDefault();
        command.handler({
          run: executeCommand,
          setActiveTab: (tab) => {
            state.setActiveTab(tab);
            haptics.selectionChanged();
          },
        });
      }
    };
    window.addEventListener(COMMAND_ACTION_EVENT, actionHandler);
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener(COMMAND_ACTION_EVENT, actionHandler);
      window.removeEventListener('keydown', handler);
    };
  }, [haptics, i18n.language, t]);

  return (
    <div
      className={
        [darkMode ? 'dark' : '', highContrastMode ? 'high-contrast' : ''].filter(Boolean).join(' ') || undefined
      }
    >
      <div className="app-bg text-wood-800 dark:text-wood-100 min-h-screen">
        <a
          href="#main-content"
          className="bg-accent sr-only rounded-full px-3 py-1 text-sm text-white focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
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
                className="bg-wood-50/80 text-wood-700 hover:bg-wood-50 dark:bg-wood-800/80 dark:text-wood-100 dark:hover:bg-wood-800 flex h-11 w-11 items-center justify-center rounded-full shadow-[0_2px_10px_rgb(0_0_0/0.08)] backdrop-blur-xl print:hidden"
                title="Print current view"
                aria-label="Print current view"
              >
                <IconPrint size={20} />
              </button>
            </div>
            {/* Sprint 170 — print-only header: shows project name + date on paper */}
            <div className="print-only-header">
              {projectName ? `${projectName} — ` : ''}WoodworkingShop
              <span className="float-end text-[9pt] font-normal">{formatDate(new Date(), i18n.language)}</span>
            </div>
            {['preview', 'optimizer', 'assembly', 'pdf', 'calculators'].includes(activeTab) && (
              <ActiveCabinetSwitcher />
            )}

            {activeTab === 'workspace' && (
              <section
                aria-label={t('tabs.workspace')}
                className="mx-auto flex w-full max-w-6xl min-w-0 flex-col items-center gap-6 text-center"
              >
                <img
                  src={`${import.meta.env.BASE_URL}workspace-banner.webp`}
                  srcSet={`${import.meta.env.BASE_URL}workspace-banner-480.webp 480w, ${import.meta.env.BASE_URL}workspace-banner-800.webp 800w, ${import.meta.env.BASE_URL}workspace-banner.webp 1200w`}
                  sizes="(min-width: 1456px) 1152px, (min-width: 1024px) calc(100vw - 304px), (min-width: 640px) calc(100vw - 48px), calc(100vw - 24px)"
                  alt={t('tabs.workspace')}
                  className="w-full rounded-3xl shadow-[0_20px_60px_rgb(0_0_0/0.12)]"
                  width={1200}
                  height={260}
                  loading="eager"
                  fetchPriority="high"
                />
                <div className="w-full min-w-0 space-y-3">
                  <h2 className="text-wood-900 dark:text-wood-50 text-4xl font-semibold tracking-tight wrap-break-word sm:text-5xl">
                    {t('app.title')}
                  </h2>
                  <p className="text-wood-600 dark:text-wood-300 mx-auto max-w-xl text-lg wrap-break-word">
                    {t('app.subtitle')}
                  </p>
                </div>
                <button
                  onClick={() => useCabinetStore.getState().setActiveTab('configurator')}
                  className="bg-accent rounded-full px-6 py-2.5 text-base font-medium text-white hover:brightness-110"
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
                  <CalculatorsPanel request={calculatorRequest} requestedSection={requestedCalculatorSection} />
                </Suspense>
              </ErrorBoundary>
            )}
          </main>
        </div>
        <ToastContainer />
        {!focusMode && <MobileTabBar />}
        <OnboardingManager />
        <TouchGestureTutorial />
        {swUpdateAvailable && sessionStorage.getItem('swUpdate:dismissed') !== 'true' && (
          <Suspense fallback={null}>
            <SwUpdateBanner reload={reloadSwUpdate} />
          </Suspense>
        )}
        {showShortcuts && (
          <Suspense fallback={null}>
            <ShortcutsModal onClose={() => setShowShortcuts(false)} />
          </Suspense>
        )}
        {showDiagnostics && (
          <Suspense fallback={null}>
            <DiagnosticsModal onClose={() => setShowDiagnostics(false)} />
          </Suspense>
        )}
        {showCommandPalette && (
          <Suspense fallback={null}>
            <CommandPalette open={showCommandPalette} onClose={closeCommandPalette} onOpenCalculator={openCalculator} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default App;
