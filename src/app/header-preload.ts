import { APP_TABS } from './command-registry';

function preloadModule(loader: () => Promise<unknown>) {
  void loader().catch(() => undefined);
}

export function preloadMarketplacePanel() {
  preloadModule(() => import('../features/workspace/MarketplacePanel'));
}

export function preloadTab(tab: (typeof APP_TABS)[number]) {
  switch (tab) {
    case 'configurator':
      preloadModule(() => import('../features/configurator/ConfiguratorPanel'));
      preloadModule(() => import('../features/workspace/RoomLayoutView'));
      break;
    case 'preview':
      preloadModule(() => import('../features/preview/CabinetPreview'));
      preloadModule(() => import('../features/preview/Preview3DPanel'));
      break;
    case 'optimizer':
      preloadModule(() => import('../features/optimizer/ProjectSummaryPanel'));
      preloadModule(() => import('../features/optimizer/SmartOptimizerPanel'));
      preloadModule(() => import('../features/optimizer/Tables'));
      preloadModule(() => import('../features/optimizer/OptimizerView'));
      break;
    case 'assembly':
      preloadModule(() => import('../features/assembly/AssemblyGuide'));
      break;
    case 'pdf':
      preloadModule(() => import('../features/pdf/PdfExportPanel'));
      break;
    case 'calculators':
      preloadModule(() => import('../features/calculators/CalculatorsPanel'));
      break;
  }
}
