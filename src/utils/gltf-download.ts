/**
 * Sprint 84 — browser download helper for glTF 2.0 files.
 */
import { generateGltfContent } from '../engine/export/gltf-document';
import type { CabinetConfig, Part } from '../engine/core/types';
import { downloadContent } from '../platform/files/index';

/**
 * Generate a glTF 2.0 file for the given config + parts and trigger a
 * browser download.  File name: `<filename>.gltf`.
 */
export function downloadGltfFile(config: CabinetConfig, parts: Part[], filename = 'cabinet'): void {
  const { content } = generateGltfContent(config, parts);
  downloadContent(content, 'model/gltf+json', `${filename}.gltf`);
}
