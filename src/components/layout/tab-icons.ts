import type { CabinetState } from '../../store/cabinet-store';
import { IconCabinet, IconCalculator, IconDocument, IconEye, IconHammer, IconScissors, IconSettings } from './Icons';

export const TAB_ICONS: Record<CabinetState['activeTab'], typeof IconCabinet> = {
  workspace: IconCabinet,
  configurator: IconSettings,
  preview: IconEye,
  optimizer: IconScissors,
  assembly: IconHammer,
  pdf: IconDocument,
  calculators: IconCalculator,
};
