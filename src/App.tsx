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
import { RoomLayoutView } from './components/layout/RoomLayoutView';
import { ToastContainer } from './components/layout/ToastContainer';
import { OnboardingManager } from './components/layout/OnboardingOverlay';
import { TouchGestureTutorial } from './components/layout/TouchGestureTutorial';
import { ShortcutsModal } from './components/layout/ShortcutsModal';
import { SwUpdateBanner } from './components/layout/SwUpdateBanner';
import { IconPrint } from './components/layout/Icons';
import { useCabinetStore, type CabinetState } from './store/cabinet-store';
import { useToastStore } from './store/toast-store';
import { useSystemDarkMode } from './hooks/useSystemDarkMode';

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

function App() {
  const { activeTab, darkMode, projectName } = useCabinetStore();
  const highContrastMode = useCabinetStore((s) => s.highContrastMode);
  const { t } = useTranslation();
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
  }, [t]);

  return (
    <div
      className={
        [darkMode ? 'dark' : '', highContrastMode ? 'high-contrast' : ''].filter(Boolean).join(' ') || undefined
      }
    >
      <div className="min-h-screen bg-white dark:bg-wood-900 text-wood-800 dark:text-wood-100">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-wood-600 text-white px-3 py-1 rounded text-sm"
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
            className="flex-1 p-3 sm:p-6 focus:outline-none"
            role="main"
            aria-label={t('a11y.mainWorkspace')}
          >
            {/* Sprint 170 — print-only header: shows project name + date on paper */}
            <div className="print-only-header">
              {projectName ? `${projectName} — ` : ''}Cabinet Planner
              <span className="float-end font-normal text-[9pt]">{new Date().toLocaleDateString()}</span>
            </div>
            {activeTab === 'configurator' && (
              <div className="space-y-6">
                <ErrorBoundary panelName="Configurator">
                  <ConfiguratorPanel />
                </ErrorBoundary>
                <RoomLayoutView />
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
              className="fixed bottom-5 right-5 bg-wood-600 hover:bg-wood-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg z-40 transition-colors print:hidden"
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
