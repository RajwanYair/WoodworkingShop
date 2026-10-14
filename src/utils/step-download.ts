/**
 * Sprint 80 — Browser-side STEP file download helper.
 */

import { generateStepContent } from '../engine/export/step-export';
import type { CabinetConfig, Part } from '../engine/core/types';
import { downloadContent } from '../platform/files/index';

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
  downloadContent(content, 'application/x-step', `${filename}.stp`);
}
