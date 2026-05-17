import './i18n';
import './index.css';
import { useEffect, useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ConfiguratorPanel } from './components/configurator/ConfiguratorPanel';
import { CabinetPreview } from './components/preview/CabinetPreview';
import { SmartOptimizerPanel } from './components/optimizer/SmartOptimizerPanel';
import { PartsTable, HardwareTable } from './components/optimizer/Tables';
import { ToastContainer } from './components/layout/ToastContainer';
import { OnboardingManager } from './components/layout/OnboardingOverlay';
import { ShortcutsModal } from './components/layout/ShortcutsModal';
import { IconPrint } from './components/layout/Icons';
import { useCabinetStore, type CabinetState } from './store/cabinet-store';

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
  const { activeTab, darkMode } = useCabinetStore();
  const { t } = useTranslation();
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Sync dark mode to <html> so browser-level UI (scrollbar, form controls,
  // color-scheme) follows. The Tailwind `dark:` variant is class-based via
  // @custom-variant in index.css.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', darkMode);
    root.style.colorScheme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

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
      // Print: Ctrl+P
      if (ctrl && e.key === 'p') {
        e.preventDefault();
        window.print();
        return;
      }
      // Tab switching: Alt+1-5
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
        }
      }
      // Shortcuts help: ?
      if (e.key === '?' && !ctrl) {
        setShowShortcuts((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-wood-900 text-wood-800 dark:text-wood-100">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-wood-500 text-white px-3 py-1 rounded text-sm"
        >
          {t('a11y.skipToContent')}
        </a>
        <Header />
        <div className="flex">
          <Sidebar />
          <main id="main-content" className="flex-1 p-3 sm:p-6" role="main" aria-label={t('a11y.mainWorkspace')}>
            {activeTab === 'configurator' && <ConfiguratorPanel />}
            {activeTab === 'preview' && <CabinetPreview />}
            {activeTab === 'optimizer' && (
              <Suspense fallback={<div className="text-center py-12 text-wood-400">Loading optimizer…</div>}>
                <div className="space-y-8">
                  <SmartOptimizerPanel />
                  <PartsTable />
                  <HardwareTable />
                  <OptimizerView />
                </div>
              </Suspense>
            )}
            {activeTab === 'assembly' && (
              <Suspense fallback={<div className="text-center py-12 text-wood-400">Loading assembly guide…</div>}>
                <AssemblyGuide />
              </Suspense>
            )}
            {activeTab === 'pdf' && (
              <Suspense fallback={<div className="text-center py-12 text-wood-400">Loading PDF tools…</div>}>
                <PdfExportPanel />
              </Suspense>
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
        {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
      </div>
    </div>
  );
}

export default App;
