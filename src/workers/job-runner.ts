/**
 * Small typed worker pool. Comlink remains the transport.
 * Callers keep stale-result suppression; this module owns acquisition, timeout,
 * abort, progress, and transferable text results.
 */
import * as Comlink from 'comlink';
import { isSharedArrayBufferAvailable, trySharedArrayBuffer } from './shared-buffer';
import {
  EXPORT_SHARED_BUFFER_BYTES,
  WORKER_INPUT_SCHEMA_VERSION,
  unpackText,
  type PackedText,
  type WorkerProgress,
} from './text-payload';

const WORKER_REQUEST_TIMEOUT_MS = 30_000;
export const MAX_POOL_SIZE = 5;

interface WorkerSlot {
  worker: Worker;
  proxy: Comlink.Remote<WorkerRunApi>;
}

interface WorkerRunApi {
  run(input: unknown, channel?: ExportChannel): Promise<unknown>;
}

interface ExportChannel {
  inputSchemaVersion: number;
  sharedBuffer?: SharedArrayBuffer;
  reportProgress?: (progress: WorkerProgress) => void;
}

export interface WorkerJobHooks {
  isLatest: () => boolean;
  onTimeout: () => void;
  onAbort: () => void;
  onProgress?: (progress: WorkerProgress) => void;
}

interface SlotHealth {
  lastError: string | null;
}

const slots = new Map<string, WorkerSlot>();
const health = new Map<string, SlotHealth>();

export function resetWorkerPoolForTests(): void {
  let kind = slots.keys().next().value;
  while (kind) {
    releasePooledWorker(kind);
    kind = slots.keys().next().value;
  }
  health.clear();
}

function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string') return reason;
  return 'Worker request failed';
}

export function readPooledWorker(kind: string): { alive: boolean; lastError: string | null } {
  return { alive: slots.has(kind), lastError: health.get(kind)?.lastError ?? null };
}

export function releasePooledWorker(kind: string): void {
  const slot = slots.get(kind);
  if (!slot) return;
  slot.worker.terminate();
  slots.delete(kind);
}

function rememberError(kind: string, message: string): void {
  health.set(kind, { lastError: message });
}

function acquire(kind: string, createWorker: () => Worker): WorkerSlot | null {
  if (typeof Worker === 'undefined') return null;
  const existing = slots.get(kind);
  if (existing) return existing;
  if (slots.size >= MAX_POOL_SIZE) {
    const oldest = slots.keys().next().value;
    if (oldest) releasePooledWorker(oldest);
  }
  const worker = createWorker();
  const proxy = Comlink.wrap<WorkerRunApi>(worker);
  const slot = { worker, proxy };
  slots.set(kind, slot);
  health.set(kind, { lastError: null });
  return slot;
}

function awaitWorkerCall<T>(
  request: Promise<T>,
  signal: AbortSignal | undefined,
  hooks: WorkerJobHooks,
  timeoutMs = WORKER_REQUEST_TIMEOUT_MS,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', handleAbort);
    };
    const resolveOnce = (value: T) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };
    const rejectOnce = (reason: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(reason);
    };
    const handleAbort = () => {
      if (hooks.isLatest()) hooks.onAbort();
      rejectOnce(signal?.reason ?? new Error('Worker request aborted'));
    };
    const timeoutId = setTimeout(() => {
      hooks.onTimeout();
      rejectOnce(new Error('Worker request timed out'));
    }, timeoutMs);
    signal?.addEventListener('abort', handleAbort, { once: true });
    if (signal?.aborted) {
      handleAbort();
      return;
    }
    request.then(resolveOnce, rejectOnce);
  });
}

export function runPooledJob<I, O>(
  kind: string,
  id: string,
  input: I,
  signal: AbortSignal | undefined,
  hooks: WorkerJobHooks,
  createWorker: () => Worker,
  inputSchemaVersion = WORKER_INPUT_SCHEMA_VERSION,
): Promise<O> | null {
  if (inputSchemaVersion !== WORKER_INPUT_SCHEMA_VERSION) {
    return Promise.reject(new Error(`Unsupported worker input schema ${inputSchemaVersion}`));
  }
  const slot = acquire(kind, createWorker);
  if (!slot) return null;
  hooks.onProgress?.({ jobId: id, completed: 0, total: 1 });
  return awaitWorkerCall(slot.proxy.run(input) as Promise<O>, signal, hooks).then(
    (value) => {
      hooks.onProgress?.({ jobId: id, completed: 1, total: 1 });
      health.set(kind, { lastError: null });
      return value;
    },
    (reason: unknown) => {
      rememberError(kind, errorMessage(reason));
      throw reason;
    },
  );
}

export function runPackedTextJob(
  kind: string,
  id: string,
  input: unknown,
  signal: AbortSignal | undefined,
  createWorker: () => Worker,
  onProgress?: (progress: WorkerProgress) => void,
): Promise<{ text: string; filename?: string } | null> {
  const sharedBuffer = isSharedArrayBufferAvailable()
    ? (trySharedArrayBuffer(EXPORT_SHARED_BUFFER_BYTES) ?? undefined)
    : undefined;
  const slot = acquire(kind, createWorker);
  if (!slot) return Promise.resolve(null);
  const channel: ExportChannel = {
    inputSchemaVersion: WORKER_INPUT_SCHEMA_VERSION,
    sharedBuffer,
    reportProgress: onProgress
      ? Comlink.proxy((progress: WorkerProgress) => onProgress({ ...progress, jobId: id }))
      : undefined,
  };
  const hooks: WorkerJobHooks = {
    isLatest: () => true,
    onTimeout: () => releasePooledWorker(kind),
    onAbort: () => releasePooledWorker(kind),
    onProgress,
  };
  return awaitWorkerCall(slot.proxy.run(input, channel) as Promise<PackedText>, signal, hooks).then(
    (packed) => ({ text: unpackText(packed, sharedBuffer), filename: packed.filename }),
    (reason: unknown) => {
      rememberError(kind, errorMessage(reason));
      throw reason;
    },
  );
}
