import { afterEach, describe, expect, it, vi } from 'vitest';
import { triggerDownload } from '../../src/utils/download';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('triggerDownload', () => {
  it('creates a typed blob, clicks a named link, and revokes its object URL', () => {
    const anchor = document.createElement('a');
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => {});
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:download');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    triggerDownload('board list', 'text/plain', 'project.txt');

    const blob = createObjectUrl.mock.calls[0]?.[0];
    expect(anchor.href).toBe('blob:download');
    expect(anchor.download).toBe('project.txt');
    expect(click).toHaveBeenCalledOnce();
    expect(blob).toBeInstanceOf(Blob);
    if (!(blob instanceof Blob)) return;
    expect(blob.type).toBe('text/plain');
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:download');
  });
});
