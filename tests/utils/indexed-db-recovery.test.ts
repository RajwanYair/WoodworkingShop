import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

beforeEach(() => {
  vi.resetModules();
  globalThis.indexedDB = new IDBFactory();
});

describe('IndexedDB recovery', () => {
  it('retries after the browser rejects an initial database open', async () => {
    const openSpy = vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => {
      throw new DOMException('Storage access is blocked', 'SecurityError');
    });
    const { idbLoadProjects } = await import('../../src/utils/indexed-db-storage');

    await expect(idbLoadProjects()).rejects.toMatchObject({ name: 'SecurityError' });
    await expect(idbLoadProjects()).resolves.toEqual([]);
    expect(openSpy).toHaveBeenCalledTimes(2);
  });

  it('recovers project access after a blocked database upgrade completes', async () => {
    const projects = [{ id: 'saved-project', name: 'Saved Project' }];
    const blockerRequest = indexedDB.open('cabinet-planner-projects', 1);
    const blocker = await new Promise<IDBDatabase>((resolve, reject) => {
      blockerRequest.onupgradeneeded = () => {
        blockerRequest.result.createObjectStore('projects');
      };
      blockerRequest.onerror = () => reject(blockerRequest.error);
      blockerRequest.onsuccess = () => resolve(blockerRequest.result);
    });
    const seedTransaction = blocker.transaction('projects', 'readwrite');
    seedTransaction.objectStore('projects').put(projects, 'all-projects');
    await new Promise<void>((resolve, reject) => {
      seedTransaction.oncomplete = () => resolve();
      seedTransaction.onabort = () => reject(seedTransaction.error);
      seedTransaction.onerror = () => reject(seedTransaction.error);
    });

    const upgradeRequest = indexedDB.open('cabinet-planner-projects', 2);
    let wasBlocked = false;
    const upgrade = new Promise<void>((resolve, reject) => {
      upgradeRequest.onblocked = () => {
        wasBlocked = true;
        blocker.close();
      };
      upgradeRequest.onupgradeneeded = () => {
        upgradeRequest.result.createObjectStore('metadata');
      };
      upgradeRequest.onerror = () => reject(upgradeRequest.error);
      upgradeRequest.onsuccess = () => {
        upgradeRequest.result.close();
        resolve();
      };
    });

    await upgrade;

    expect(wasBlocked).toBe(true);
    const { idbLoadProjects } = await import('../../src/utils/indexed-db-storage');
    await expect(idbLoadProjects()).resolves.toEqual(projects);
  });
});
