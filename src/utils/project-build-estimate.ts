import { estimateProjectTime } from '../engine/time-estimator';
import type { ProjectTask } from '../engine/time-estimator';
import type { HardwareItem, Part } from '../engine/types';

export function estimateBuildTimeForProject(
  parts: readonly Part[],
  cabinetCount: number,
  hardware: readonly HardwareItem[],
) {
  const partCount = parts.reduce((total, part) => total + part.qty, 0);
  const edgeBandedPartCount = parts.reduce(
    (total, part) => total + (part.edgeBanding.en && part.edgeBanding.en !== 'None' ? part.qty : 0),
    0,
  );
  const hardwareCount = hardware.reduce((total, item) => total + item.qty, 0);

  const tasks: ProjectTask[] = [
    { id: 'cutting', operation: 'cutting', quantity: partCount, dependsOn: [] },
    { id: 'sanding', operation: 'sanding', quantity: partCount, dependsOn: ['cutting'] },
    { id: 'edge-banding', operation: 'edgeBanding', quantity: edgeBandedPartCount, dependsOn: ['sanding'] },
    { id: 'assembly', operation: 'assembly', quantity: cabinetCount, dependsOn: ['edge-banding'] },
    { id: 'finishing', operation: 'finishing', quantity: cabinetCount, dependsOn: ['assembly'] },
    { id: 'hardware', operation: 'hardware', quantity: hardwareCount, dependsOn: ['finishing'] },
  ];

  return estimateProjectTime(tasks);
}
