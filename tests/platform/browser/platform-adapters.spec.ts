import { expect, test } from '@playwright/test';

const sourceUrl = (path: string) => `/WoodworkingShop/src/platform/${path}.ts`;

test('native localStorage and IndexedDB adapters round-trip records', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async (url) => {
    const importModule = async <Exports extends object>(path: string): Promise<Exports> => {
      const moduleUrl = new URL(path, location.origin).href;
      return import(/* @vite-ignore */ moduleUrl) as Promise<Exports>;
    };
    const { createIndexedDbAdapter } = await importModule<{
      createIndexedDbAdapter: (
        databaseName: string,
        storeName: string,
      ) => {
        get<T>(key: string): Promise<T | undefined>;
        set<T>(key: string, value: T): Promise<void>;
        entries<T>(): Promise<[IDBValidKey, T][]>;
        keys(): Promise<IDBValidKey[]>;
        delete(key: string): Promise<void>;
      };
    }>(url);
    const { browserLocalStorage } = await importModule<{
      browserLocalStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
    }>('/WoodworkingShop/src/platform/storage/local-storage.ts');
    const id = crypto.randomUUID();
    const storageKey = `platform-contract-${id}`;
    const databaseName = `platform-contract-${id}`;
    const adapter = createIndexedDbAdapter(databaseName, 'records');
    browserLocalStorage.setItem(storageKey, 'persisted');
    await adapter.set('record', { value: 42 });
    const value = await adapter.get<{ value: number }>('record');
    const entries = await adapter.entries<{ value: number }>();
    const keys = await adapter.keys();
    await adapter.delete('record');
    browserLocalStorage.removeItem(storageKey);
    return {
      localStorageValue: browserLocalStorage.getItem(storageKey),
      value,
      entries: entries.map(([key, entry]) => [String(key), entry]),
      keys: keys.map(String),
      deletedValue: await adapter.get('record'),
    };
  }, sourceUrl('storage/indexed-db'));

  expect(result).toEqual({
    localStorageValue: null,
    value: { value: 42 },
    entries: [['record', { value: 42 }]],
    keys: ['record'],
    deletedValue: undefined,
  });
});

test('native File reads, Blob downloads, and browser URL history work', async ({ page }) => {
  await page.goto('/');
  const fileText = await page.evaluate(async (url) => {
    const moduleUrl = new URL(url, location.origin).href;
    const { readTextFile } = (await import(/* @vite-ignore */ moduleUrl)) as {
      readTextFile(file: Blob): Promise<string>;
    };
    return readTextFile(new File(['platform file'], 'contract.txt', { type: 'text/plain' }));
  }, sourceUrl('files/read-file'));
  expect(fileText).toBe('platform file');

  const downloadPromise = page.waitForEvent('download');
  await page.evaluate(async (url) => {
    const moduleUrl = new URL(url, location.origin).href;
    const { downloadContent } = (await import(/* @vite-ignore */ moduleUrl)) as {
      downloadContent(content: string, mimeType: string, filename: string): void;
    };
    downloadContent('browser payload', 'text/plain', 'platform-contract.txt');
  }, sourceUrl('files/download'));
  expect((await downloadPromise).suggestedFilename()).toBe('platform-contract.txt');

  const urlState = await page.evaluate(async (url) => {
    const moduleUrl = new URL(url, location.origin).href;
    const { getBrowserUrl, replaceBrowserUrl } = (await import(/* @vite-ignore */ moduleUrl)) as {
      getBrowserUrl(): { origin: string; pathname: string; search: string };
      replaceBrowserUrl(next: string): void;
    };
    const original = getBrowserUrl();
    replaceBrowserUrl(`${original.pathname}?platform-contract=active`);
    const updated = getBrowserUrl().search;
    replaceBrowserUrl(`${original.pathname}${original.search}`);
    return updated;
  }, sourceUrl('share/browser-url'));
  expect(urlState).toBe('?platform-contract=active');
});

test('device and diagnostics adapters operate against browser APIs', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const importModule = async <Exports extends object>(path: string): Promise<Exports> => {
      const moduleUrl = new URL(path, location.origin).href;
      return import(/* @vite-ignore */ moduleUrl) as Promise<Exports>;
    };
    const device = await importModule<{
      isCameraSupported(): boolean;
      isWebSerialSupported(): boolean;
      isWebVibrationSupported(): boolean;
      isWakeLockSupported(): boolean;
      getMediaRecorderConstructor(): unknown;
    }>('/WoodworkingShop/src/platform/device/index.ts');
    const storage = await importModule<{
      getStorageEstimate(): Promise<{ usedBytes: number; quotaBytes: number; nearLimit: boolean }>;
    }>('/WoodworkingShop/src/platform/storage/index.ts');
    const diagnostics = await importModule<{
      observeWebVitals(
        onUpdate: (vitals: { lcpMs: number | null; cls: number | null; inpMs: number | null }) => void,
      ): () => void;
      sendErrorReport(error: Error): void;
      getLocalErrorReports(): Array<{ message: string }>;
    }>('/WoodworkingShop/src/platform/diagnostics/index.ts');
    const stopObserving = diagnostics.observeWebVitals(() => {});
    stopObserving();
    diagnostics.sendErrorReport(new Error('platform browser contract'));
    const reports = diagnostics.getLocalErrorReports();
    return {
      camera: device.isCameraSupported(),
      serial: device.isWebSerialSupported(),
      vibration: device.isWebVibrationSupported(),
      wakeLock: device.isWakeLockSupported(),
      mediaRecorderAvailable: device.getMediaRecorderConstructor() !== null,
      storageEstimate: await storage.getStorageEstimate(),
      diagnosticCaptured: reports.some((report) => report.message === 'platform browser contract'),
    };
  });

  expect(result.camera).toEqual(expect.any(Boolean));
  expect(result.serial).toEqual(expect.any(Boolean));
  expect(result.vibration).toEqual(expect.any(Boolean));
  expect(result.wakeLock).toEqual(expect.any(Boolean));
  expect(result.mediaRecorderAvailable).toBe(true);
  expect(result.storageEstimate).toMatchObject({
    usedBytes: expect.any(Number),
    quotaBytes: expect.any(Number),
    nearLimit: expect.any(Boolean),
  });
  expect(result.diagnosticCaptured).toBe(true);
});
