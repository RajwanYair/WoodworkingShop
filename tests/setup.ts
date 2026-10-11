import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import '../src/i18n';
// Polyfill IndexedDB for jsdom — required by idb-keyval (used in indexed-db-storage.ts).
import 'fake-indexeddb/auto';

const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
const originalSessionStorage = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
const originalHistoryReplaceState = window.history.replaceState;
const originalDocumentDirection = document.documentElement.dir;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();

  if (originalLocation) Object.defineProperty(globalThis, 'location', originalLocation);
  if (originalLocalStorage) Object.defineProperty(window, 'localStorage', originalLocalStorage);
  if (originalSessionStorage) Object.defineProperty(window, 'sessionStorage', originalSessionStorage);

  window.history.replaceState = originalHistoryReplaceState;
  window.history.replaceState(null, '', '/');
  window.localStorage.clear();
  window.sessionStorage.clear();
  document.documentElement.dir = originalDocumentDirection;
});

// Suppress React 19 "window is not defined" unhandled rejections that occur
// when dispatchSetState fires after jsdom teardown (Node 24 CI only).
process.on('unhandledRejection', (reason) => {
  if (reason instanceof ReferenceError && reason.message === 'window is not defined') {
    return; // swallow — React internal scheduler post-teardown noise
  }
  throw reason;
});
