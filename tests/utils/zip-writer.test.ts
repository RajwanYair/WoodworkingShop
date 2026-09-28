import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildZip, downloadZip } from '../../src/utils/zip-writer';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('buildZip', () => {
  it('writes a UTF-8 stored entry with matching local and central directory metadata', () => {
    const name = new TextEncoder().encode('café.txt');
    const data = new TextEncoder().encode('hello');
    const archive = buildZip([{ name: 'café.txt', data }]);
    const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
    const centralOffset = 30 + name.length + data.length;
    const endOffset = archive.length - 22;

    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint16(6, true)).toBe(0x0800);
    expect(view.getUint16(8, true)).toBe(0);
    expect(view.getUint32(14, true)).toBe(0x3610a686);
    expect(view.getUint32(18, true)).toBe(data.length);
    expect(new TextDecoder().decode(archive.subarray(30, 30 + name.length))).toBe('café.txt');
    expect(Array.from(archive.subarray(30 + name.length, centralOffset))).toEqual(Array.from(data));
    expect(view.getUint32(centralOffset, true)).toBe(0x02014b50);
    expect(view.getUint32(centralOffset + 16, true)).toBe(0x3610a686);
    expect(view.getUint32(centralOffset + 42, true)).toBe(0);
    expect(view.getUint32(endOffset, true)).toBe(0x06054b50);
    expect(view.getUint16(endOffset + 8, true)).toBe(1);
    expect(view.getUint16(endOffset + 10, true)).toBe(1);
  });

  it('writes a valid empty archive directory record', () => {
    const archive = buildZip([]);
    const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);

    expect(archive).toHaveLength(22);
    expect(view.getUint32(0, true)).toBe(0x06054b50);
    expect(view.getUint16(8, true)).toBe(0);
    expect(view.getUint16(10, true)).toBe(0);
  });
});

describe('downloadZip', () => {
  it('downloads the archive with the requested filename and releases its object URL', () => {
    const anchor = document.createElement('a');
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => {});
    const remove = vi.spyOn(anchor, 'remove');
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:zip-export');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    downloadZip(new Uint8Array([80, 75, 3, 4]), 'project.zip');

    const blob = createObjectUrl.mock.calls[0]?.[0];
    expect(anchor.download).toBe('project.zip');
    expect(anchor.href).toBe('blob:zip-export');
    expect(click).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    expect(blob).toBeInstanceOf(Blob);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:zip-export');
  });
});
