import '@testing-library/jest-dom/vitest';
import '../src/i18n';
// Polyfill IndexedDB for jsdom — required by idb-keyval (used in indexed-db-storage.ts).
import 'fake-indexeddb/auto';

// Suppress React 19 "window is not defined" unhandled rejections that occur
// when dispatchSetState fires after jsdom teardown (Node 24 CI only).
process.on('unhandledRejection', (reason) => {
  if (reason instanceof ReferenceError && reason.message === 'window is not defined') {
    return; // swallow — React internal scheduler post-teardown noise
  }
  throw reason;
});
