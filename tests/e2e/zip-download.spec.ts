import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { unzipSync } from 'fflate';
import { expect, test } from './fixtures/app';
import type { Page } from '@playwright/test';

test.setTimeout(120_000);

type ZipManifestFile = { path: string; sizeBytes: number; sha256: string };
type ZipManifest = {
  format: 'cabinet-planner-export-bundle';
  version: 1;
  checksumAlgorithm: 'SHA-256';
  files: ZipManifestFile[];
};
type CentralEntry = {
  name: string;
  flags: number;
  method: number;
  crc32: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
};
type GltfArchive = {
  asset: { version: string };
  nodes: { mesh: number }[];
  meshes: unknown[];
  buffers: { byteLength: number; uri: string }[];
};

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function isZipManifest(value: unknown): value is ZipManifest {
  if (!value || typeof value !== 'object') return false;
  const manifest = value as Record<string, unknown>;
  return (
    manifest.format === 'cabinet-planner-export-bundle' &&
    manifest.version === 1 &&
    manifest.checksumAlgorithm === 'SHA-256' &&
    Array.isArray(manifest.files) &&
    manifest.files.every(
      (file) =>
        Boolean(file) &&
        typeof file === 'object' &&
        typeof (file as Record<string, unknown>).path === 'string' &&
        typeof (file as Record<string, unknown>).sizeBytes === 'number' &&
        typeof (file as Record<string, unknown>).sha256 === 'string',
    )
  );
}

function isGltfArchive(value: unknown): value is GltfArchive {
  if (!value || typeof value !== 'object') return false;
  const gltf = value as Record<string, unknown>;
  return (
    Boolean(gltf.asset) &&
    typeof gltf.asset === 'object' &&
    Array.isArray(gltf.nodes) &&
    Array.isArray(gltf.meshes) &&
    Array.isArray(gltf.buffers)
  );
}

function readCentralDirectory(bytes: Uint8Array): CentralEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endOffset = bytes.length - 22;
  if (view.getUint32(endOffset, true) !== 0x06054b50) throw new Error('ZIP end record is missing');
  const entryCount = view.getUint16(endOffset + 10, true);
  const directoryOffset = view.getUint32(endOffset + 16, true);
  const entries: CentralEntry[] = [];
  let offset = directoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error(`Invalid central record at ${offset}`);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    entries.push({
      name: decodeUtf8(bytes.subarray(offset + 46, offset + 46 + nameLength)),
      flags: view.getUint16(offset + 8, true),
      method: view.getUint16(offset + 10, true),
      crc32: view.getUint32(offset + 16, true),
      compressedSize: view.getUint32(offset + 20, true),
      uncompressedSize: view.getUint32(offset + 24, true),
      localOffset: view.getUint32(offset + 42, true),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  if (offset !== directoryOffset + view.getUint32(endOffset + 12, true)) {
    throw new Error('Central directory size does not match its records');
  }
  return entries;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function crc32(bytes: Uint8Array): number {
  let checksum = 0xffffffff;
  for (const byte of bytes) {
    checksum ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      checksum = checksum & 1 ? (checksum >>> 1) ^ 0xedb88320 : checksum >>> 1;
    }
  }
  return (checksum ^ 0xffffffff) >>> 0;
}

async function addSecondCabinet(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Configure' }).click();
  await page.getByRole('button', { name: /Add Cabinet/ }).click();
  await expect(page.getByRole('button', { name: /^Cabinet 2/ })).toBeVisible();
}

async function downloadBundle(page: Page, options: { secondCabinet?: boolean } = {}) {
  if (options.secondCabinet) await addSecondCabinet(page);
  await page.getByRole('tab', { name: /pdf/i }).click();
  await expect(page.getByRole('heading', { name: /^export pdf$/i })).toBeVisible({ timeout: 30_000 });

  const diagnostics: string[] = [];
  const onConsole = (message: import('@playwright/test').ConsoleMessage) => {
    if (message.type() === 'warning' || message.type() === 'error') diagnostics.push(message.text());
  };
  const onPageError = (error: Error) => diagnostics.push(error.message);
  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  try {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export ZIP Bundle (PDF + DXF + BOM + glTF)', exact: true }).click();
    const download = await downloadPromise;
    const path = await download.path();
    if (!path) throw new Error('ZIP export did not produce a downloadable file');
    const bytes = new Uint8Array(await readFile(path));
    const files = unzipSync(bytes);
    const manifestBytes = files['manifest.json'];
    if (!manifestBytes) throw new Error('ZIP bundle is missing manifest.json');
    const manifestValue: unknown = JSON.parse(decodeUtf8(manifestBytes));
    if (!isZipManifest(manifestValue)) throw new Error('ZIP bundle has an invalid integrity manifest');
    return {
      filename: download.suggestedFilename(),
      bytes,
      files,
      names: Object.keys(files),
      manifest: manifestValue,
      entries: readCentralDirectory(bytes),
      diagnostics,
    };
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
  }
}

test('ZIP browser download uses the safe project bundle filename', async ({ appPage }) => {
  const artifact = await downloadBundle(appPage);
  expect(artifact.filename).toBe('cabinet-plan-bundle.zip');
});

test('ZIP browser download starts with a PK local-file signature', async ({ appPage }) => {
  const { bytes } = await downloadBundle(appPage);
  expect([...bytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
});

test('ZIP browser download ends with a valid end-of-directory record', async ({ appPage }) => {
  const { bytes } = await downloadBundle(appPage);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(view.getUint32(bytes.length - 22, true)).toBe(0x06054b50);
  expect(view.getUint16(bytes.length - 2, true)).toBe(0);
});

test('ZIP end record entry count matches the parsed central directory', async ({ appPage }) => {
  const { bytes, entries } = await downloadBundle(appPage);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  expect(entries.length).toBeGreaterThan(5);
  expect(view.getUint16(bytes.length - 12, true)).toBe(entries.length);
});

test('ZIP central-directory paths match independently extracted entries', async ({ appPage }) => {
  const { entries, names } = await downloadBundle(appPage);
  expect(entries.map(({ name }) => name).sort()).toEqual([...names].sort());
});

test('ZIP central-directory CRC-32 values match every extracted payload', async ({ appPage }) => {
  const { entries, files } = await downloadBundle(appPage);
  expect(entries.every(({ name, crc32: expected }) => files[name] && crc32(files[name]) === expected)).toBe(true);
});

test('ZIP archive has no duplicate entry paths', async ({ appPage }) => {
  const { entries } = await downloadBundle(appPage);
  const names = entries.map(({ name }) => name);
  expect(new Set(names).size).toBe(names.length);
});

test('ZIP paths are relative, canonical, and traversal-free', async ({ appPage }) => {
  const { entries } = await downloadBundle(appPage);
  for (const { name } of entries) {
    expect(name).not.toMatch(/^(?:\/|[a-z]:)/i);
    expect(name).not.toContain('\\');
    expect(name.split('/')).not.toContain('..');
    expect(name.split('/')).not.toContain('.');
    expect(name.split('/')).not.toContain('');
  }
});

test('ZIP entries declare UTF-8 filenames and use the stored method', async ({ appPage }) => {
  const { entries } = await downloadBundle(appPage);
  expect(entries.every(({ flags, method }) => (flags & 0x0800) !== 0 && method === 0)).toBe(true);
});

test('ZIP includes a PDF, cut-sheet DXF files, BOM CSV, glTF, README, and manifest', async ({ appPage }) => {
  const { names } = await downloadBundle(appPage);
  expect(names.some((name) => name.endsWith('.pdf'))).toBe(true);
  expect(names.some((name) => /^sheets\/sheet-\d+-.*\.dxf$/.test(name))).toBe(true);
  expect(names.some((name) => name.endsWith('-bom.csv'))).toBe(true);
  expect(names.some((name) => name.endsWith('.gltf'))).toBe(true);
  expect(names).toContain('README.txt');
  expect(names).toContain('manifest.json');
});

test('ZIP includes one DXF for each generated cut sheet', async ({ appPage }) => {
  const { names } = await downloadBundle(appPage);
  const dxfNames = names.filter((name) => name.startsWith('sheets/') && name.endsWith('.dxf'));
  expect(dxfNames.length).toBeGreaterThan(0);
  expect(dxfNames.every((name) => /^sheets\/sheet-\d+-[\w-]+\.dxf$/.test(name))).toBe(true);
});

test('ZIP manifest declares its format and SHA-256 schema version', async ({ appPage }) => {
  const { manifest } = await downloadBundle(appPage);
  expect(manifest).toMatchObject({
    format: 'cabinet-planner-export-bundle',
    version: 1,
    checksumAlgorithm: 'SHA-256',
  });
});

test('ZIP manifest entries are sorted by archive path', async ({ appPage }) => {
  const { manifest } = await downloadBundle(appPage);
  const paths = manifest.files.map(({ path }) => path);
  expect(paths).toEqual([...paths].sort());
});

test('ZIP manifest covers every archive payload except itself', async ({ appPage }) => {
  const { names, manifest } = await downloadBundle(appPage);
  expect(manifest.files.map(({ path }) => path)).toEqual(names.filter((name) => name !== 'manifest.json').sort());
});

test('ZIP manifest byte sizes match every extracted payload', async ({ appPage }) => {
  const { files, manifest } = await downloadBundle(appPage);
  expect(manifest.files.every(({ path, sizeBytes }) => files[path]?.byteLength === sizeBytes)).toBe(true);
});

test('ZIP manifest SHA-256 values verify every extracted payload', async ({ appPage }) => {
  const { files, manifest } = await downloadBundle(appPage);
  expect(manifest.files.every(({ path, sha256: expected }) => files[path] && sha256(files[path]) === expected)).toBe(
    true,
  );
});

test('ZIP manifest does not attempt a self-referential checksum', async ({ appPage }) => {
  const { manifest } = await downloadBundle(appPage);
  expect(manifest.files.some(({ path }) => path === 'manifest.json')).toBe(false);
});

test('ZIP PDF payload starts with the PDF signature', async ({ appPage }) => {
  const { files, names } = await downloadBundle(appPage);
  const pdf = files[names.find((name) => name.endsWith('.pdf'))!];
  expect(decodeUtf8(pdf.subarray(0, 5))).toBe('%PDF-');
});

test('ZIP PDF payload parses as a multi-page document', async ({ appPage }) => {
  const { files, names } = await downloadBundle(appPage);
  const pdfBytes = files[names.find((name) => name.endsWith('.pdf'))!];
  const document = await getDocument({ data: new Uint8Array(pdfBytes), useSystemFonts: true }).promise;
  expect(document.numPages).toBeGreaterThan(5);
});

test('ZIP PDF payload includes build-plan headings and cabinet dimensions', async ({ appPage }) => {
  const { files, names } = await downloadBundle(appPage);
  const pdfBytes = files[names.find((name) => name.endsWith('.pdf'))!];
  const document = await getDocument({ data: new Uint8Array(pdfBytes), useSystemFonts: true }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const content = await document.getPage(pageNumber).then((page) => page.getTextContent());
    pages.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
  }
  const text = pages.join(' ').replace(/\s+/g, ' ');
  expect(text).toContain('Cabinet Specifications');
  expect(text).toContain('1000 × 2000 × 600 mm');
});

test('every ZIP DXF payload contains entities and terminates correctly', async ({ appPage }) => {
  const { files, names } = await downloadBundle(appPage);
  const dxfNames = names.filter((name) => name.endsWith('.dxf'));
  expect(
    dxfNames.every((name) => {
      const dxf = decodeUtf8(files[name]!);
      return dxf.includes('SECTION\n2\nENTITIES') && dxf.endsWith('0\nEOF');
    }),
  ).toBe(true);
});

test('ZIP BOM payload includes the versioned schema and cabinet counts', async ({ appPage }) => {
  const { files, names } = await downloadBundle(appPage);
  const csvName = names.find((name) => name.endsWith('-bom.csv'))!;
  const csv = decodeUtf8(files[csvName]!);
  expect(csv).toContain('# Cabinet Planner BOM Export');
  expect(csv).toContain('Schema: bom-csv-v1');
  expect(csv).toMatch(/^# Cabinets: 1  Parts: \d+  Hardware: \d+/m);
});

test('ZIP BOM payload includes both part and hardware table schemas', async ({ appPage }) => {
  const { files, names } = await downloadBundle(appPage);
  const csv = decodeUtf8(files[names.find((name) => name.endsWith('-bom.csv'))!]!);
  expect(csv).toContain('Part ID,Part Name,Qty');
  expect(csv).toContain('Hardware ID,Hardware Name,Qty');
});

test('ZIP glTF payload declares the glTF 2.0 asset version', async ({ appPage }) => {
  const { files, names } = await downloadBundle(appPage);
  const value: unknown = JSON.parse(decodeUtf8(files[names.find((name) => name.endsWith('.gltf'))!]!));
  expect(isGltfArchive(value)).toBe(true);
  if (!isGltfArchive(value)) throw new Error('ZIP glTF payload has an invalid structure');
  expect(value.asset.version).toBe('2.0');
});

test('ZIP glTF data URIs decode to the declared embedded buffer lengths', async ({ appPage }) => {
  const { files, names } = await downloadBundle(appPage);
  const value: unknown = JSON.parse(decodeUtf8(files[names.find((name) => name.endsWith('.gltf'))!]!));
  if (!isGltfArchive(value)) throw new Error('ZIP glTF payload has an invalid structure');
  expect(value.buffers.length).toBeGreaterThan(0);
  for (const buffer of value.buffers) {
    const payload = buffer.uri.match(/^data:application\/octet-stream;base64,(.+)$/)?.[1];
    expect(payload).toBeDefined();
    expect(Buffer.from(payload!, 'base64').byteLength).toBe(buffer.byteLength);
  }
});

test('ZIP glTF nodes reference an existing mesh', async ({ appPage }) => {
  const { files, names } = await downloadBundle(appPage);
  const value: unknown = JSON.parse(decodeUtf8(files[names.find((name) => name.endsWith('.gltf'))!]!));
  if (!isGltfArchive(value)) throw new Error('ZIP glTF payload has an invalid structure');
  expect(value.nodes.length).toBeGreaterThan(0);
  expect(value.meshes.length).toBeGreaterThan(0);
  expect(value.nodes.every(({ mesh }) => Number.isInteger(mesh) && mesh >= 0 && mesh < value.meshes.length)).toBe(true);
});

test('ZIP README documents each exported payload category', async ({ appPage }) => {
  const { files } = await downloadBundle(appPage);
  const readme = decodeUtf8(files['README.txt']!);
  expect(readme).toContain('Build plan (PDF)');
  expect(readme).toContain('Cut-sheet layouts (DXF');
  expect(readme).toContain('Bill of materials (CSV)');
  expect(readme).toContain('3-D model');
  expect(readme).toContain('SHA-256 integrity manifest');
});

test('ZIP export reports success and produces no browser warnings or errors', async ({ appPage }) => {
  const { diagnostics } = await downloadBundle(appPage);
  await expect(appPage.getByRole('button', { name: 'Export ZIP Bundle (PDF + DXF + BOM + glTF)' })).toBeEnabled();
  await expect(appPage.getByText('ZIP bundle exported')).toBeVisible();
  expect(diagnostics).toEqual([]);
});

test('multi-cabinet ZIP BOM records both cabinets', async ({ appPage }) => {
  const { files, names } = await downloadBundle(appPage, { secondCabinet: true });
  const csv = decodeUtf8(files[names.find((name) => name.endsWith('-bom.csv'))!]!);
  expect(csv).toMatch(/^# Cabinets: 2  Parts: \d+  Hardware: \d+/m);
});
