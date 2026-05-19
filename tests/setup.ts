import '@testing-library/jest-dom/vitest';
import '../src/i18n';
// Polyfill IndexedDB for jsdom — required by idb-keyval (used in indexed-db-storage.ts).
import 'fake-indexeddb/auto';
