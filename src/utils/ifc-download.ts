/**
 * Sprint 79 — Browser-side IFC file download helper.
 * Creates a Blob from the generated IFC content and triggers a save-dialog.
 */

import { generateIfcContent } from '../engine/export/ifc-export';
import type { CabinetConfig, Part } from '../engine/types';

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
  const blob = new Blob([content], { type: 'application/x-step' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filename}.ifc`;
  anchor.click();
  URL.revokeObjectURL(url);
}
