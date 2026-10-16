import { getTemplatesByCategory } from '../../src/engine/project/index';
import type { CabinetTemplate } from '../../src/engine/project/index';
import {
  getMediaRecorderConstructor,
  isWakeLockSupported,
  isWebGL2Available,
  requestAudioStream,
  resetWebGLProbeCache,
} from '../../src/platform/device/index';
import { pushBrowserUrl } from '../../src/platform/share/index';
import type { BrowserUrlSnapshot, ShareLinkResult } from '../../src/platform/share/index';
import { assertIndexedDBAvailable } from '../../src/platform/storage/index';
import { getLocalErrorReports } from '../../src/services/error-reporter';
import type { LocalErrorReport } from '../../src/services/error-reporter';
import type { SerialConnectionProfile } from '../../src/platform/device/index';
import type { StorageAdapter } from '../../src/platform/storage/index';

describe('documented public module contracts', () => {
  it('keeps supported engine, platform, and diagnostics exports available', () => {
    const profile: SerialConnectionProfile = { baudRate: 115_200 };
    const url: BrowserUrlSnapshot = { origin: 'https://example.test', pathname: '/', search: '' };
    const shareResult: ShareLinkResult = 'copied';
    const localErrors: LocalErrorReport[] = getLocalErrorReports();
    const adapter: StorageAdapter = {
      async get<T>(_key: string): Promise<T | undefined> {
        return undefined;
      },
      async set() {},
      async delete() {},
      async keys() {
        return [];
      },
      async entries<T>(): Promise<[IDBValidKey, T][]> {
        return [];
      },
    };
    const templates: CabinetTemplate[] = getTemplatesByCategory('base');

    expect(profile.baudRate).toBe(115_200);
    expect(url.pathname).toBe('/');
    expect(shareResult).toBe('copied');
    expect(localErrors).toEqual([]);
    expect(adapter).toHaveProperty('entries');
    expect(templates.length).toBeGreaterThan(0);
    expect(pushBrowserUrl).toBeTypeOf('function');
    for (const supportedAdapter of [
      getMediaRecorderConstructor,
      isWakeLockSupported,
      isWebGL2Available,
      requestAudioStream,
      resetWebGLProbeCache,
      assertIndexedDBAvailable,
    ]) {
      expect(supportedAdapter).toBeTypeOf('function');
    }
  });
});
