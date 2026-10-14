/**
 * Voice Annotation — Phase 14 / Sprint 9
 *
 * Records short voice notes (≤ 5 minutes) per assembly step using the
 * MediaRecorder API.  Audio blobs are stored in IndexedDB alongside
 * lightweight metadata.  Playback is done via `URL.createObjectURL`.
 *
 * Supported codecs (in preference order):
 *   1. audio/webm;codecs=opus   — Chrome, Firefox, Edge
 *   2. audio/ogg;codecs=opus    — Firefox
 *   3. audio/mp4                — Safari
 *   4. ''                       — browser default (fallback)
 *
 * No telemetry.  No server.  All data stays on-device.
 */

import { createIndexedDbAdapter } from '../platform/storage/index';
import { getSupportedMediaRecorderMimeType, startAudioRecording } from '../platform/device/index';
import { createObjectUrl, revokeObjectUrl } from '../platform/files/index';

// ── IDB stores ────────────────────────────────────────────────────────────────
// Metadata and binary blobs live in separate stores so metadata queries
// (list all for a step) don't need to deserialise audio blobs.
const metaStore = createIndexedDbAdapter('cabinet-planner-voice-annotations', 'annotations');
const blobStore = createIndexedDbAdapter('cabinet-planner-voice-blobs', 'blobs');

const IDB_META_KEY = 'all-annotations';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VoiceAnnotation {
  /** Unique annotation ID, e.g. 'va-a3f8c12b'. */
  id: string;
  /** Assembly step ID this note belongs to, e.g. 'step-3'. */
  stepId: string;
  /** Unix timestamp (ms) when the recording was saved. */
  createdAt: number;
  /** Duration of the audio clip in milliseconds. */
  durationMs: number;
  /** MIME type used for recording, e.g. 'audio/webm;codecs=opus'. */
  mimeType: string;
  /** Compressed blob size in bytes. */
  sizeBytes: number;
}

/** Live recording session handle returned by {@link startRecording}. */
export interface RecordingSession {
  /**
   * Stop recording and persist the annotation.
   * Resolves with the saved {@link VoiceAnnotation} metadata.
   */
  stop(): Promise<VoiceAnnotation>;
  /** Abort recording without persisting anything. */
  cancel(): void;
}

// ── ID generation ─────────────────────────────────────────────────────────────

/** Generate a random 8-character annotation ID prefixed with 'va-'. */
export function generateAnnotationId(): string {
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  return 'va-' + Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Codec detection ───────────────────────────────────────────────────────────

const PREFERRED_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'] as const;

/**
 * Return the first MIME type supported by MediaRecorder in this browser.
 * Returns `null` when MediaRecorder is not available (e.g. jsdom / Firefox
 * private browsing without mic permission).
 */
export function getSupportedMimeType(): string | null {
  return getSupportedMediaRecorderMimeType(PREFERRED_MIME_TYPES);
}

// ── Recording ─────────────────────────────────────────────────────────────────

/**
 * Request microphone access and start a recording session.
 *
 * @param stepId  Assembly step ID to attach the annotation to.
 * @returns A {@link RecordingSession} handle; call `.stop()` to finalise.
 * @throws  When `getUserMedia` is rejected (permission denied / no mic).
 */
export async function startRecording(stepId: string): Promise<RecordingSession> {
  const recording = await startAudioRecording(PREFERRED_MIME_TYPES);

  return {
    async stop(): Promise<VoiceAnnotation> {
      const { blob, durationMs, mimeType } = await recording.stop();
      const annotation: VoiceAnnotation = {
        id: generateAnnotationId(),
        stepId,
        createdAt: Date.now(),
        durationMs,
        mimeType,
        sizeBytes: blob.size,
      };
      await saveVoiceAnnotation(annotation, blob);
      return annotation;
    },
    cancel(): void {
      recording.cancel();
    },
  };
}

// ── Storage ───────────────────────────────────────────────────────────────────

/** Persist annotation metadata and its audio blob to IndexedDB. */
export async function saveVoiceAnnotation(annotation: VoiceAnnotation, blob: Blob): Promise<void> {
  const all = await _loadAllMeta();
  const updated = all.filter((a) => a.id !== annotation.id).concat(annotation);
  await metaStore.set(IDB_META_KEY, updated);
  await blobStore.set(annotation.id, blob);
}

/** Load metadata + blob for a single annotation.  Returns `null` when not found. */
export async function loadVoiceAnnotation(id: string): Promise<{ annotation: VoiceAnnotation; blob: Blob } | null> {
  const all = await _loadAllMeta();
  const annotation = all.find((a) => a.id === id);
  if (!annotation) return null;
  const blob = await blobStore.get<Blob>(id);
  if (!blob) return null;
  return { annotation, blob };
}

/** List all annotations for a given assembly step, newest first. */
export async function listAnnotationsForStep(stepId: string): Promise<VoiceAnnotation[]> {
  const all = await _loadAllMeta();
  return all.filter((a) => a.stepId === stepId).sort((a, b) => b.createdAt - a.createdAt);
}

/** List all annotations across all steps, newest first. */
export async function getAllVoiceAnnotations(): Promise<VoiceAnnotation[]> {
  const all = await _loadAllMeta();
  return [...all].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Delete an annotation and its blob from IndexedDB.
 * Silently succeeds when the ID is not found.
 */
export async function deleteVoiceAnnotation(id: string): Promise<void> {
  const all = await _loadAllMeta();
  await metaStore.set(
    IDB_META_KEY,
    all.filter((a) => a.id !== id),
  );
  await blobStore.delete(id);
}

/** Delete all annotations for a given step. */
export async function deleteAllAnnotationsForStep(stepId: string): Promise<void> {
  const all = await _loadAllMeta();
  const toDelete = all.filter((a) => a.stepId === stepId);
  await metaStore.set(
    IDB_META_KEY,
    all.filter((a) => a.stepId !== stepId),
  );
  await Promise.all(toDelete.map((annotation) => blobStore.delete(annotation.id)));
}

/** Total storage used by voice annotations in bytes. */
export async function getVoiceAnnotationStorageBytes(): Promise<number> {
  const all = await _loadAllMeta();
  return all.reduce((sum, a) => sum + a.sizeBytes, 0);
}

/** Return the number of blob keys in the blob store (used in tests). */
export async function _blobStoreKeyCount(): Promise<number> {
  return (await blobStore.keys()).length;
}

// ── Playback ──────────────────────────────────────────────────────────────────

/**
 * Create an object URL for an audio blob so it can be set as an
 * `<audio>` element's `src`.  Caller must revoke when done.
 */
export function createAnnotationUrl(blob: Blob): string {
  return createObjectUrl(blob);
}

/** Revoke an object URL previously created by {@link createAnnotationUrl}. */
export function revokeAnnotationUrl(url: string): void {
  revokeObjectUrl(url);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function _loadAllMeta(): Promise<VoiceAnnotation[]> {
  const data = await metaStore.get<VoiceAnnotation[]>(IDB_META_KEY);
  return Array.isArray(data) ? data : [];
}
