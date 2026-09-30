import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildZip, createZipManifest, downloadZip } from '../../src/utils/zip-writer';

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

  it.each([
    ['', 'empty'],
    ['/root.txt', 'absolute'],
    ['C:/root.txt', 'drive-qualified'],
    ['../outside.txt', 'parent-relative'],
    ['sheets/../outside.txt', 'nested traversal'],
    ['./local.txt', 'dot segment'],
    ['sheets//empty-segment.txt', 'empty path segment'],
    ['sheets\\outside.dxf', 'backslash separator'],
    ['folder/', 'directory path'],
    ['bad\nname.txt', 'control character'],
  ])('rejects %s as an unsafe %s ZIP entry path', (name) => {
    expect(() => buildZip([{ name, data: new Uint8Array() }])).toThrow(RangeError);
  });

  it('rejects duplicate entry paths', () => {
    const entry = { name: 'parts/list.csv', data: new Uint8Array() };
    expect(() => buildZip([entry, entry])).toThrow(/Duplicate ZIP entry path/);
  });

  it('rejects paths whose UTF-8 name exceeds the ZIP filename field', () => {
    expect(() => buildZip([{ name: 'a'.repeat(65_536), data: new Uint8Array() }])).toThrow(RangeError);
  });

  it('creates a sorted manifest with byte sizes and SHA-256 checksums', async () => {
    const entries = [
      { name: 'z-last.txt', data: new TextEncoder().encode('world') },
      { name: 'a-first.txt', data: new TextEncoder().encode('hello') },
    ];
    const originalNames = entries.map(({ name }) => name);
    const manifestEntry = await createZipManifest(entries);
    const manifest = JSON.parse(new TextDecoder().decode(manifestEntry.data)) as {
      format: string;
      version: number;
      checksumAlgorithm: string;
      files: { path: string; sizeBytes: number; sha256: string }[];
    };

    expect(manifestEntry.name).toBe('manifest.json');
    expect(manifest).toEqual({
      format: 'cabinet-planner-export-bundle',
      version: 1,
      checksumAlgorithm: 'SHA-256',
      files: [
        {
          path: 'a-first.txt',
          sizeBytes: 5,
          sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
        },
        {
          path: 'z-last.txt',
          sizeBytes: 5,
          sha256: '486ea46224d1bb4fb680f34f7c9ad96a8f24ec88be73ea8e5a6c65260e9cb8a7',
        },
      ],
    });
    expect(entries.map(({ name }) => name)).toEqual(originalNames);
  });

  it('rejects an input entry that conflicts with the manifest path', async () => {
    await expect(createZipManifest([{ name: 'manifest.json', data: new Uint8Array() }])).rejects.toThrow(
      /reserved for the integrity manifest/,
    );
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
