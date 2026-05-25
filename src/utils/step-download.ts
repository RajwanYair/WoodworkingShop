/**
 * Sprint 80 — Browser-side STEP file download helper.
 */

import { generateStepContent } from '../engine/export/step-export';
import type { CabinetConfig, Part } from '../engine/types';

/**
 * Generate a STEP Part 21 file for the given config + parts and trigger a
 * browser download of the resulting *.stp file.
 *
 * @param config   - Cabinet configuration
 * @param parts    - Expanded parts list
 * @param filename - Desired filename without extension (default: "cabinet")
 */
export function downloadStepFile(config: CabinetConfig, parts: Part[], filename = 'cabinet'): void {
  const { content } = generateStepContent(config, parts);
  const blob = new Blob([content], { type: 'application/x-step' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filename}.stp`;
  anchor.click();
  URL.revokeObjectURL(url);
}
