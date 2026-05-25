/**
 * Sprint 84 — browser download helper for glTF 2.0 files.
 */
import { generateGltfContent } from '../engine/export/gltf-export';
import type { CabinetConfig, Part } from '../engine/types';

/**
 * Generate a glTF 2.0 file for the given config + parts and trigger a
 * browser download.  File name: `<filename>.gltf`.
 */
export function downloadGltfFile(config: CabinetConfig, parts: Part[], filename = 'cabinet'): void {
  const { content } = generateGltfContent(config, parts);
  const blob = new Blob([content], { type: 'model/gltf+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.gltf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
