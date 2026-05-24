/**
 * Voice Annotation — Phase 14 / Sprint 9
 *
 * Tests for src/utils/voice-annotation.ts
 * Uses fake-indexeddb (already in setup.ts) for IDB operations.
 * MediaRecorder and getUserMedia are stubbed via vi.stubGlobal.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateAnnotationId,
  getSupportedMimeType,
  saveVoiceAnnotation,
  loadVoiceAnnotation,
  listAnnotationsForStep,
  getAllVoiceAnnotations,
  deleteVoiceAnnotation,
  deleteAllAnnotationsForStep,
  getVoiceAnnotationStorageBytes,
  createAnnotationUrl,
  revokeAnnotationUrl,
  startRecording,
  _blobStoreKeyCount,
} from '../../src/utils/voice-annotation';

// ── MediaRecorder stub ────────────────────────────────────────────────────────

type MediaRecorderInstance = {
  state: 'inactive' | 'recording';
  ondataavailable: ((ev: { data: Blob }) => void) | null;
  onstop: (() => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

function makeMediaRecorderClass() {
  const instances: MediaRecorderInstance[] = [];

  function MockMediaRecorder(this: MediaRecorderInstance, _stream: MediaStream, _options?: MediaRecorderOptions) {
    this.state = 'inactive';
    this.ondataavailable = null;
    this.onstop = null;
    const audioBlob = new Blob(['fake-audio-data'], { type: 'audio/webm;codecs=opus' });

    this.start = vi.fn((_timeslice?: number) => {
      this.state = 'recording';
      // Fire ondataavailable asynchronously
      Promise.resolve().then(() => this.ondataavailable?.({ data: audioBlob }));
    });

    this.stop = vi.fn(() => {
      this.state = 'inactive';
      // Fire onstop asynchronously
      Promise.resolve().then(() => this.onstop?.());
    });

    instances.push(this);
  }
  MockMediaRecorder.isTypeSupported = vi.fn((mime: string) => mime === 'audio/webm;codecs=opus');
  MockMediaRecorder._lastInstance = () => instances.at(-1) ?? null;

  return MockMediaRecorder as unknown as typeof MediaRecorder & { _lastInstance: () => MediaRecorderInstance | null };
}

function makeGetUserMediaStub(): typeof navigator.mediaDevices.getUserMedia {
  const fakeTrack = { stop: vi.fn() } as unknown as MediaStreamTrack;
  const fakeStream = {
    getTracks: vi.fn(() => [fakeTrack]),
  } as unknown as MediaStream;
  return vi.fn().mockResolvedValue(fakeStream);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('generateAnnotationId', () => {
  it('has correct va- prefix', () => {
    expect(generateAnnotationId()).toMatch(/^va-[0-9a-f]{8}$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set(Array.from({ length: 200 }, generateAnnotationId));
    expect(ids.size).toBe(200);
  });
});

describe('getSupportedMimeType', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null when MediaRecorder is not available', () => {
    vi.stubGlobal('MediaRecorder', undefined);
    expect(getSupportedMimeType()).toBeNull();
  });

  it('returns preferred mime when supported', () => {
    const MockRecorder = {
      isTypeSupported: (mime: string) => mime === 'audio/webm;codecs=opus',
    };
    vi.stubGlobal('MediaRecorder', MockRecorder);
    expect(getSupportedMimeType()).toBe('audio/webm;codecs=opus');
  });

  it('falls through to ogg when webm not supported', () => {
    const MockRecorder = {
      isTypeSupported: (mime: string) => mime === 'audio/ogg;codecs=opus',
    };
    vi.stubGlobal('MediaRecorder', MockRecorder);
    expect(getSupportedMimeType()).toBe('audio/ogg;codecs=opus');
  });

  it("returns empty string when nothing preferred is supported", () => {
    const MockRecorder = { isTypeSupported: () => false };
    vi.stubGlobal('MediaRecorder', MockRecorder);
    expect(getSupportedMimeType()).toBe('');
  });
});

describe('VoiceAnnotation IDB CRUD', () => {
  const makeAnnotation = (id = 'va-test0001', stepId = 'step-1'): ReturnType<typeof Object.assign> =>
    ({
      id,
      stepId,
      createdAt: Date.now(),
      durationMs: 3000,
      mimeType: 'audio/webm;codecs=opus',
      sizeBytes: 256,
    });

  const makeBlob = (content = 'audio') => new Blob([content], { type: 'audio/webm' });

  it('saves and loads an annotation', async () => {
    const ann = makeAnnotation('va-save0001', 'step-1');
    const blob = makeBlob('data1');
    await saveVoiceAnnotation(ann, blob);
    const result = await loadVoiceAnnotation('va-save0001');
    expect(result).not.toBeNull();
    expect(result!.annotation.stepId).toBe('step-1');
    expect(result!.blob).toBeTruthy(); // fake-indexeddb serialises Blobs as opaque objects
  });

  it('returns null for unknown id', async () => {
    expect(await loadVoiceAnnotation('va-unknown')).toBeNull();
  });

  it('lists annotations for a step', async () => {
    const ann1 = makeAnnotation('va-list0001', 'step-2');
    const ann2 = makeAnnotation('va-list0002', 'step-2');
    const ann3 = makeAnnotation('va-list0003', 'step-3');
    await saveVoiceAnnotation(ann1, makeBlob('a'));
    await saveVoiceAnnotation(ann2, makeBlob('b'));
    await saveVoiceAnnotation(ann3, makeBlob('c'));
    const forStep2 = await listAnnotationsForStep('step-2');
    expect(forStep2.map((a) => a.id).sort()).toEqual(['va-list0001', 'va-list0002'].sort());
    expect(await listAnnotationsForStep('step-99')).toHaveLength(0);
  });

  it('getAllVoiceAnnotations returns all sorted by createdAt desc', async () => {
    const base = Date.now();
    const old = { ...makeAnnotation('va-order0001', 'step-1'), createdAt: base - 1000 };
    const recent = { ...makeAnnotation('va-order0002', 'step-1'), createdAt: base };
    await saveVoiceAnnotation(old, makeBlob('old'));
    await saveVoiceAnnotation(recent, makeBlob('new'));
    const all = await getAllVoiceAnnotations();
    const ids = all.map((a) => a.id);
    expect(ids.indexOf('va-order0002')).toBeLessThan(ids.indexOf('va-order0001'));
  });

  it('deleteVoiceAnnotation removes metadata and blob', async () => {
    const ann = makeAnnotation('va-del0001', 'step-4');
    await saveVoiceAnnotation(ann, makeBlob('delete-me'));
    await deleteVoiceAnnotation('va-del0001');
    expect(await loadVoiceAnnotation('va-del0001')).toBeNull();
    expect(await listAnnotationsForStep('step-4')).toHaveLength(0);
  });

  it('deleteVoiceAnnotation is idempotent for unknown ID', async () => {
    await expect(deleteVoiceAnnotation('va-ghost')).resolves.toBeUndefined();
  });

  it('deleteAllAnnotationsForStep removes all blobs for that step', async () => {
    await saveVoiceAnnotation(makeAnnotation('va-stepclr0001', 'step-5'), makeBlob('x'));
    await saveVoiceAnnotation(makeAnnotation('va-stepclr0002', 'step-5'), makeBlob('y'));
    await saveVoiceAnnotation(makeAnnotation('va-stepclr0003', 'step-6'), makeBlob('z'));
    await deleteAllAnnotationsForStep('step-5');
    expect(await listAnnotationsForStep('step-5')).toHaveLength(0);
    expect(await listAnnotationsForStep('step-6')).toHaveLength(1);
  });

  it('getVoiceAnnotationStorageBytes sums sizeBytes', async () => {
    await saveVoiceAnnotation({ ...makeAnnotation('va-sz0001', 'step-7'), sizeBytes: 512 }, makeBlob('a'));
    await saveVoiceAnnotation({ ...makeAnnotation('va-sz0002', 'step-7'), sizeBytes: 1024 }, makeBlob('b'));
    const total = await getVoiceAnnotationStorageBytes();
    expect(total).toBeGreaterThanOrEqual(1536); // at least the two we added
  });

  it('overwriting an annotation replaces metadata but keeps step list correct', async () => {
    const ann = makeAnnotation('va-overwrite01', 'step-8');
    await saveVoiceAnnotation(ann, makeBlob('v1'));
    const updated = { ...ann, durationMs: 9999 };
    await saveVoiceAnnotation(updated, makeBlob('v2'));
    const list = await listAnnotationsForStep('step-8');
    const ids = list.map((a) => a.id);
    expect(ids.filter((id) => id === 'va-overwrite01')).toHaveLength(1);
    const loaded = await loadVoiceAnnotation('va-overwrite01');
    expect(loaded!.annotation.durationMs).toBe(9999);
  });
});

describe('createAnnotationUrl / revokeAnnotationUrl', () => {
  it('createAnnotationUrl returns a blob: URL', () => {
    const blob = new Blob(['test'], { type: 'audio/webm' });
    const url = createAnnotationUrl(blob);
    expect(url).toMatch(/^blob:/);
    revokeAnnotationUrl(url);
  });

  it('revokeAnnotationUrl does not throw on valid URL', () => {
    const blob = new Blob(['x']);
    const url = createAnnotationUrl(blob);
    expect(() => revokeAnnotationUrl(url)).not.toThrow();
  });
});

describe('startRecording', () => {
  let MediaRecorderMock: ReturnType<typeof makeMediaRecorderClass>;

  beforeEach(() => {
    MediaRecorderMock = makeMediaRecorderClass();
    vi.stubGlobal('MediaRecorder', MediaRecorderMock);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: makeGetUserMediaStub() },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stop() returns a VoiceAnnotation with correct stepId', async () => {
    const session = await startRecording('step-9');
    const annotation = await session.stop();
    expect(annotation.stepId).toBe('step-9');
    expect(annotation.id).toMatch(/^va-[0-9a-f]{8}$/);
    expect(annotation.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('stop() persists the annotation to IDB', async () => {
    const session = await startRecording('step-10');
    const annotation = await session.stop();
    const loaded = await loadVoiceAnnotation(annotation.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.annotation.stepId).toBe('step-10');
  });

  it('cancel() does not persist any annotation', async () => {
    const countBefore = await _blobStoreKeyCount();
    const session = await startRecording('step-11');
    session.cancel();
    // Give the recorder a tick to settle
    await new Promise((resolve) => setTimeout(resolve, 10));
    const countAfter = await _blobStoreKeyCount();
    expect(countAfter).toBe(countBefore);
  });

  it('stop() releases microphone tracks', async () => {
    const getUserMedia = makeGetUserMediaStub();
    const stream = await getUserMedia({ audio: true, video: false });
    const tracks = stream.getTracks();
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(stream) },
      configurable: true,
    });
    const session = await startRecording('step-12');
    await session.stop();
    tracks.forEach((t) => expect(t.stop).toHaveBeenCalled());
  });
});

