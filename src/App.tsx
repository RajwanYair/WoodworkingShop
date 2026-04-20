import './i18n';
import './index.css';
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
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
