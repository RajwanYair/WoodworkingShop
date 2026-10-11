import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CabinetConfig, Part } from '../../src/engine/types';
import { cfg } from '../helpers';
import { downloadGltfFile } from '../../src/utils/gltf-download';
import { downloadIfcFile } from '../../src/utils/ifc-download';
import { downloadStepFile } from '../../src/utils/step-download';

type FormatDownload = (config: CabinetConfig, parts: Part[], filename?: string) => void;

const formatDownloads: {
  format: string;
  download: FormatDownload;
  extension: string;
  mimeType: string;
}[] = [
  { format: 'glTF', download: downloadGltfFile, extension: 'gltf', mimeType: 'model/gltf+json' },
  { format: 'IFC', download: downloadIfcFile, extension: 'ifc', mimeType: 'application/x-step' },
  { format: 'STEP', download: downloadStepFile, extension: 'stp', mimeType: 'application/x-step' },
];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('format download helpers', () => {
  it.each(formatDownloads)(
    'downloads $format with its MIME type and revokes the object URL',
    ({ download, extension, mimeType }) => {
      const anchor = document.createElement('a');
      const click = vi.spyOn(anchor, 'click').mockImplementation(() => {});
      vi.spyOn(document, 'createElement').mockReturnValue(anchor);
      const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:format-export');
      const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      download(cfg(), [], 'project-export');

      const blob = createObjectUrl.mock.calls[0]?.[0];
      expect(anchor.download).toBe(`project-export.${extension}`);
      expect(anchor.href).toBe('blob:format-export');
      expect(click).toHaveBeenCalledOnce();
      expect(blob).toBeInstanceOf(Blob);
      if (!(blob instanceof Blob)) return;
      expect(blob.type).toBe(mimeType);
      expect(revokeObjectUrl).toHaveBeenCalledWith('blob:format-export');
    },
  );
});
