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
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
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
