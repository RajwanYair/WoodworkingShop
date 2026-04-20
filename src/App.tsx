import './i18n';
import './index.css';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ConfiguratorPanel } from './components/configurator/ConfiguratorPanel';
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
            {activeTab === 'preview' && (
              <div className="text-center text-wood-400 py-20">
                SVG Preview — coming in Sprint 8
              </div>
            )}
            {activeTab === 'optimizer' && (
              <div className="text-center text-wood-400 py-20">
                Cut Sheet Optimizer — coming in Sprint 9
              </div>
            )}
            {activeTab === 'pdf' && (
              <div className="text-center text-wood-400 py-20">
                PDF Export — coming in Sprint 10
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
