import './i18n';
import './index.css';
import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
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
import { ShortcutsModal } from './components/layout/ShortcutsModal';
import { SwUpdateBanner } from './components/layout/SwUpdateBanner';
import { IconPrint } from './components/layout/Icons';
import { useCabinetStore, type CabinetState } from './store/cabinet-store';
import { useToastStore } from './store/toast-store';
import { useSystemDarkMode } from './hooks/useSystemDarkMode';
import { usePwaFileHandlers } from './hooks/usePwaFileHandlers';
import { useHaptics } from './hooks/useHaptics';
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

function App() {
  const { activeTab, darkMode, projectName } = useCabinetStore();
  const highContrastMode = useCabinetStore((s) => s.highContrastMode);
  const { t, i18n } = useTranslation();
  const haptics = useHaptics();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  // Track whether this is the initial render so we don't steal focus on load
  const isFirstRender = useRef(true);

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
      // Tab switching: Alt+1-5; Dark mode: Alt+D (Sprint 168)
      if (e.altKey && !ctrl) {
        const tabMap: Record<string, CabinetState['activeTab']> = {
          '1': 'configurator',
          '2': 'preview',
          '3': 'optimizer',
          '4': 'assembly',
          '5': 'pdf',
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
        <Header />
        <div className="flex">
          <Sidebar />
          <main
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            className="flex-1 p-3 focus:outline-none sm:p-6"
            role="main"
            aria-label={t('a11y.mainWorkspace')}
          >
            {/* Sprint 170 — print-only header: shows project name + date on paper */}
            <div className="print-only-header">
              {projectName ? `${projectName} — ` : ''}Cabinet Planner
              <span className="float-end text-[9pt] font-normal">{new Date().toLocaleDateString()}</span>
            </div>
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
        <OnboardingManager />
        <TouchGestureTutorial />
        <SwUpdateBanner />
        {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      </div>
    </div>
  );
}

export default App;
