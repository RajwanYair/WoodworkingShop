import './i18n';
import './index.css';
import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import workspaceBanner from '../docs/banner.svg';
import { Header } from './components/layout/Header';
import { SkeletonPane } from './components/layout/SkeletonPane';
import { Sidebar } from './components/layout/Sidebar';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { ConfiguratorPanel } from './components/configurator/ConfiguratorPanel';
import { CabinetPreview } from './components/preview/CabinetPreview';
import { SmartOptimizerPanel } from './components/optimizer/SmartOptimizerPanel';
import { PartsTable, HardwareTable } from './components/optimizer/Tables';
import { ProjectSummaryPanel } from './components/optimizer/ProjectSummaryPanel';
import { ToastContainer } from './components/layout/ToastContainer';
import { OnboardingManager } from './components/layout/OnboardingOverlay';
import { TouchGestureTutorial } from './components/layout/TouchGestureTutorial';
import { MobileTabBar } from './components/layout/MobileTabBar';
import { ActiveCabinetSwitcher } from './components/layout/ActiveCabinetSwitcher';
import { ShortcutsModal } from './components/layout/ShortcutsModal';
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
import { downloadBomCsv } from './utils/bom-export';
import { configToUrl } from './utils/url-state';
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

function App() {
  const { activeTab, darkMode, projectName } = useCabinetStore();
  const highContrastMode = useCabinetStore((s) => s.highContrastMode);
  const focusMode = useCabinetStore((s) => s.focusMode);
  const { t, i18n } = useTranslation();
  const haptics = useHaptics();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  // Track whether this is the initial render so we don't steal focus on load
  const isFirstRender = useRef(true);

  // Ordered app tabs — used for swipe-based navigation
  const APP_TABS: CabinetState['activeTab'][] = [
    'workspace',
    'configurator',
    'preview',
    'optimizer',
    'assembly',
    'pdf',
    'calculators',
  ];

  // Sprint 82 — swipe left/right on the main content area to switch app tabs
  // (skipped on 'preview' tab which has its own swipe gesture for SVG views)
  const appSwipe = useTouchGestures({
    onSwipeLeft: () => {
      if (activeTab === 'preview') return;
      const idx = APP_TABS.indexOf(activeTab);
      if (idx < APP_TABS.length - 1) {
        useCabinetStore.getState().setActiveTab(APP_TABS[idx + 1]);
        haptics.selectionChanged();
      }
    },
    onSwipeRight: () => {
      if (activeTab === 'preview') return;
      const idx = APP_TABS.indexOf(activeTab);
      if (idx > 0) {
        useCabinetStore.getState().setActiveTab(APP_TABS[idx - 1]);
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

  // Sprint 48 — follow OS (prefers-color-scheme) changes in real-time
  useSystemDarkMode();

  // Phase 13 / Sprint 7 — PWA File Handling: open .cabinetplan files from OS
  usePwaFileHandlers((project) => {
    useCabinetStore.getState().loadProject(project.cabinets);
  });

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
      const ctrl = e.ctrlKey || e.metaKey;

      // Undo: Ctrl+Z
      if (ctrl && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        useCabinetStore.getState().undo();
        return;
      }
      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (ctrl && (e.key === 'y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) {
        e.preventDefault();
        useCabinetStore.getState().redo();
        return;
      }
      // Save snapshot: Ctrl+Shift+S
      if (ctrl && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        useCabinetStore.getState().saveSnapshot('');
        useToastStore.getState().addToast(t('shortcuts.saveSnapshot'), 'success');
        return;
      }
      // Print: Ctrl+P
      if (ctrl && e.key === 'p') {
        e.preventDefault();
        window.print();
        return;
      }
      // Export BOM CSV: Ctrl+E (Sprint 57)
      if (ctrl && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        const { cabinets, projectName: pName, config } = useCabinetStore.getState();
        const lang = (i18n.language as Lang) || (config.lang as Lang) || 'en';
        const filePrefix = (pName.trim() || 'cabinet').replace(/[^\w\u05D0-\u05EA.-]/g, '-').replace(/-+/g, '-');
        const bomData = (cabinets.length > 0 ? cabinets : [{ name: 'Cabinet', config }]).map((cab) => ({
          name: cab.name,
          parts: generateParts(cab.config),
          hardware: generateHardware(cab.config),
        }));
        downloadBomCsv(bomData, lang, `${filePrefix}-bom.csv`, i18n.language);
        useToastStore.getState().addToast(t('shortcuts.exportBom'), 'success');
        return;
      }
      // Reset config to defaults: Ctrl+R (Sprint 66)
      if (ctrl && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        useCabinetStore.getState().resetConfig();
        useToastStore.getState().addToast(t('shortcuts.resetConfig'), 'info');
        return;
      }
      // Copy share link: Ctrl+L (Sprint 71)
      if (ctrl && (e.key === 'l' || e.key === 'L')) {
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
      if (ctrl && e.shiftKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        useCabinetStore.getState().addCabinet();
        useToastStore.getState().addToast(t('shortcuts.addCabinet'), 'success');
        haptics.notification('success');
        return;
      }
      // Focus/Kiosk mode: Ctrl+Shift+K (Sprint 90)
      if (ctrl && e.shiftKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        useCabinetStore.getState().toggleFocusMode();
        const entering = useCabinetStore.getState().focusMode;
        useToastStore.getState().addToast(t(entering ? 'focusMode.enter' : 'focusMode.exit'), 'info');
        return;
      }
      // Tab switching: Alt+1-6; Dark mode: Alt+D (Sprint 168)
      if (e.altKey && !ctrl) {
        const tabMap: Record<string, CabinetState['activeTab']> = {
          '1': 'configurator',
          '2': 'preview',
          '3': 'optimizer',
          '4': 'assembly',
          '5': 'pdf',
          '6': 'calculators',
        };
        const tab = tabMap[e.key];
        if (tab) {
          e.preventDefault();
          useCabinetStore.getState().setActiveTab(tab);
          haptics.selectionChanged();
          return;
        }
        if (e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          useCabinetStore.getState().toggleDarkMode();
          return;
        }
      }
      // Shortcuts help: ?
      if (e.key === '?' && !ctrl) {
        setShowShortcuts((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [t, i18n.language, haptics]);

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
            className="flex-1 p-3 pb-20 focus:outline-none sm:p-6 sm:pb-6 lg:pb-6"
            role="main"
            aria-label={t('a11y.mainWorkspace')}
            onTouchStart={appSwipe.onTouchStart}
            onTouchMove={appSwipe.onTouchMove}
            onTouchEnd={appSwipe.onTouchEnd}
          >
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
                  loading="eager"
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
                <ErrorBoundary panelName="Configurator">
                  <ConfiguratorPanel />
                </ErrorBoundary>
                <Suspense fallback={<SkeletonPane label={t('skeleton.loading')} />}>
                  <RoomLayoutViewLazy />
                </Suspense>
              </div>
            )}
            {activeTab === 'preview' && (
              <ErrorBoundary panelName="Preview">
                <CabinetPreview />
              </ErrorBoundary>
            )}
            {activeTab === 'optimizer' && (
              <ErrorBoundary panelName="Optimizer">
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
              <ErrorBoundary panelName="Assembly Guide">
                <Suspense fallback={<SkeletonPane label={t('skeleton.loadingAssembly')} cards={3} />}>
                  <AssemblyGuide />
                </Suspense>
              </ErrorBoundary>
            )}
            {activeTab === 'pdf' && (
              <ErrorBoundary panelName="PDF Export">
                <Suspense fallback={<SkeletonPane label={t('skeleton.loadingPdf')} cards={2} />}>
                  <PdfExportPanel />
                </Suspense>
              </ErrorBoundary>
            )}
            {activeTab === 'calculators' && (
              <ErrorBoundary panelName="Calculators">
                <Suspense fallback={<SkeletonPane label={t('skeleton.loading')} cards={6} />}>
                  <CalculatorsPanel />
                </Suspense>
              </ErrorBoundary>
            )}

            {/* Print button — hidden when printing */}
            <button
              data-print="hide"
              onClick={() => window.print()}
              className="bg-wood-600 hover:bg-wood-700 fixed right-5 bottom-5 z-40 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-colors print:hidden"
              title="Print current view"
              aria-label="Print current view"
            >
              <IconPrint size={20} />
            </button>
          </main>
        </div>
        <ToastContainer />
        {!focusMode && <MobileTabBar />}
        <OnboardingManager />
        <TouchGestureTutorial />
        <SwUpdateBanner />
        {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      </div>
    </div>
  );
}

export default App;
