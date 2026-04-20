import './i18n';
import './index.css';
import { useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ConfiguratorPanel } from './components/configurator/ConfiguratorPanel';
import { CabinetPreview } from './components/preview/CabinetPreview';
import { OptimizerView } from './components/optimizer/OptimizerView';
import { SmartOptimizerPanel } from './components/optimizer/SmartOptimizerPanel';
import { PartsTable, HardwareTable } from './components/optimizer/Tables';
import { PdfExportPanel } from './components/pdf/PdfExportPanel';
import { useCabinetStore } from './store/cabinet-store';

function App() {
  const { activeTab, darkMode } = useCabinetStore();

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        useCabinetStore.getState().undo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || (e.shiftKey && e.key === 'z') || (e.shiftKey && e.key === 'Z'))
      ) {
        e.preventDefault();
        useCabinetStore.getState().redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-wood-900 text-wood-800 dark:text-wood-100">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 bg-wood-500 text-white px-3 py-1 rounded text-sm">
          Skip to content
        </a>
        <Header />
        <div className="flex">
          <Sidebar />
          <main id="main-content" className="flex-1 p-6" role="main" aria-label="Cabinet planner workspace">
            {activeTab === 'configurator' && <ConfiguratorPanel />}
            {activeTab === 'preview' && <CabinetPreview />}
            {activeTab === 'optimizer' && (
              <div className="space-y-8">
                <SmartOptimizerPanel />
                <PartsTable />
                <HardwareTable />
                <OptimizerView />
              </div>
            )}
            {activeTab === 'pdf' && <PdfExportPanel />}

            {/* Print button — hidden when printing */}
            <button
              data-print="hide"
              onClick={() => window.print()}
              className="fixed bottom-5 right-5 bg-wood-600 hover:bg-wood-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg text-lg z-40 transition-colors print:hidden"
              title="Print current view"
              aria-label="Print current view"
            >
              🖨
            </button>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
