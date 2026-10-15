import { CostEstimatePanel } from '../configurator/CostEstimatePanel';
import { CostSummaryPanel } from '../configurator/CostSummaryPanel';
import { CostVariancePanel } from '../configurator/CostVariancePanel';
import { ShelfSpacingPresetsPanel } from '../configurator/ShelfSpacingPresetsPanel';
import { SnapshotPanel } from './SnapshotPanel';

export function SidebarDetailPanels() {
  return (
    <>
      <CostEstimatePanel />
      <CostSummaryPanel />
      <CostVariancePanel />
      <ShelfSpacingPresetsPanel />
      <SnapshotPanel />
    </>
  );
}
