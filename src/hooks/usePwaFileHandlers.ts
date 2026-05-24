/**
 * Phase 13 / Sprint 7 — PWA File Handling API integration.
 *
 * Registers a consumer on `window.launchQueue` (File Handling API) so that
 * double-clicking a `.cabinetplan` file in the OS file manager launches the
 * app and immediately imports the project.
 *
 * Browser support: Chrome/Edge ≥ 102 (desktop PWA only).  The hook is
 * silently no-op in unsupported environments — it checks for `launchQueue`
 * before registering.
 *
 * Usage: call once from the app's root component after the store is ready.
 *
 * @example
 *   // In App.tsx:
 *   usePwaFileHandlers(importProject);
 */

import { useEffect } from 'react';
import { migrateProject } from '../utils/project-storage';
import type { SavedProject } from '../utils/project-storage';

/** Callback invoked with a successfully parsed project from the opened file. */
export type PwaFileImportCallback = (project: SavedProject) => void;

/**
 * Attempt to parse and migrate a `.cabinetplan` file's text content.
 * Returns the migrated `SavedProject` or `null` on parse / validation failure.
 *
 * Exposed for unit-testing without touching the DOM or launchQueue.
 */
export function parseCabinetPlanFile(text: string): SavedProject | null {
  try {
    const raw: unknown = JSON.parse(text);
    return migrateProject(raw);
  } catch {
    return null;
  }
}

/**
 * React hook that registers a File Handling API consumer once on mount.
 * When the user opens a `.cabinetplan` file via the OS, `onImport` is called
 * with the parsed `SavedProject`.
 *
 * The hook cleans up automatically on unmount (no persistent global state).
 */
export function usePwaFileHandlers(onImport: PwaFileImportCallback): void {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.launchQueue) return;

    window.launchQueue.setConsumer(async (params: LaunchParams) => {
      if (params.files.length === 0) return;
      const fileHandle = params.files[0];
      try {
        const file = await fileHandle.getFile();
        // Validate MIME type / extension before reading
        if (file.type !== 'application/cabinet-plan' && !file.name.endsWith('.cabinetplan')) {
          return;
        }
        const text = await file.text();
        const project = parseCabinetPlanFile(text);
        if (project !== null) {
          onImport(project);
        }
      } catch {
        // Silently ignore I/O or parse errors — the app stays on its current state.
      }
    });
    // launchQueue.setConsumer replaces any previous consumer; no explicit cleanup needed.
  }, [onImport]);
}
