import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob } from '../../../src/platform/files/download';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('downloadBlob', () => {
  it('clicks a named download link and revokes its object URL', () => {
    const anchor = document.createElement('a');
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:download');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const blob = new Blob(['content'], { type: 'text/plain' });

    downloadBlob(blob, 'project.txt');

    expect(anchor.href).toBe('blob:download');
    expect(anchor.download).toBe('project.txt');
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:download');
  });
});
