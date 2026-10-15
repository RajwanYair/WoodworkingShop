import { FEATURE_NAMESPACES } from '../i18n/namespace-catalog';
import { lazyFeature } from '../ui/lazy-feature';

export const MarketplacePanel = lazyFeature(
  () =>
    import('../features/workspace/MarketplacePanel').then(({ MarketplacePanel }) => ({ default: MarketplacePanel })),
  FEATURE_NAMESPACES.workspace,
);
