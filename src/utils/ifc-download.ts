/**
 * Sprint 79 — Browser-side IFC file download helper.
 * Creates a Blob from the generated IFC content and triggers a save-dialog.
 */

import { generateIfcContent } from '../engine/export/ifc-export';
import type { CabinetConfig, Part } from '../engine/core/types';
import { downloadContent } from '../platform/files/index';

/**
 * Generate IFC content for the given config + parts and trigger a browser
 * download of the resulting *.ifc file.
 *
 * @param config   - Cabinet configuration
 * @param parts    - Expanded parts list
 * @param filename - Desired filename without extension (default: "cabinet")
 */
export function downloadIfcFile(config: CabinetConfig, parts: Part[], filename = 'cabinet'): void {
  const { content } = generateIfcContent(config, parts);
  downloadContent(content, 'application/x-step', `${filename}.ifc`);
}
