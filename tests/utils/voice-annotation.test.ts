/**
 * Tests for src/utils/voice-annotation.ts — Phase 14 / Sprint 9.
 * IDB: fake-indexeddb (setup.ts). MediaRecorder + getUserMedia: vi.stubGlobal.
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
  it('generates unique va-prefixed IDs', () => {
    expect(generateAnnotationId()).toMatch(/^va-[0-9a-f]{8}$/);
    expect(new Set(Array.from({ length: 200 }, generateAnnotationId)).size).toBe(200);
  });
});

describe('getSupportedMimeType', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns null when MediaRecorder is not available', () => {
    vi.stubGlobal('MediaRecorder', undefined);
    expect(getSupportedMimeType()).toBeNull();
  });

  it.each<[string, (mime: string) => boolean]>([
    ['audio/webm;codecs=opus', (m) => m === 'audio/webm;codecs=opus'],
    ['audio/ogg;codecs=opus', (m) => m === 'audio/ogg;codecs=opus'],
    ['', () => false],
  ])('returns %s based on isTypeSupported', (expected, isTypeSupported) => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported });
    expect(getSupportedMimeType()).toBe(expected);
  });
});

describe('VoiceAnnotation IDB CRUD', () => {
  const makeAnnotation = (id = 'va-test0001', stepId = 'step-1'): ReturnType<typeof Object.assign> => ({
    id,
    stepId,
    createdAt: Date.now(),
    durationMs: 3000,
    mimeType: 'audio/webm;codecs=opus',
    sizeBytes: 256,
  });

  const makeBlob = (content = 'audio') => new Blob([content], { type: 'audio/webm' });

  it('saves, loads and returns null for unknown id', async () => {
    await saveVoiceAnnotation(makeAnnotation('va-save0001', 'step-1'), makeBlob('data1'));
    const result = await loadVoiceAnnotation('va-save0001');
    expect(result!.annotation.stepId).toBe('step-1');
    expect(result!.blob).toBeTruthy();
    expect(await loadVoiceAnnotation('va-unknown')).toBeNull();
  });

  it('lists annotations for a step', async () => {
    await saveVoiceAnnotation(makeAnnotation('va-list0001', 'step-2'), makeBlob('a'));
    await saveVoiceAnnotation(makeAnnotation('va-list0002', 'step-2'), makeBlob('b'));
    await saveVoiceAnnotation(makeAnnotation('va-list0003', 'step-3'), makeBlob('c'));
    expect((await listAnnotationsForStep('step-2')).map((a) => a.id).sort()).toEqual(
      ['va-list0001', 'va-list0002'].sort(),
    );
    expect(await listAnnotationsForStep('step-99')).toHaveLength(0);
  });

  it('getAllVoiceAnnotations returns all sorted by createdAt desc', async () => {
    const base = Date.now();
    await saveVoiceAnnotation({ ...makeAnnotation('va-order0001', 'step-1'), createdAt: base - 1000 }, makeBlob('old'));
    await saveVoiceAnnotation({ ...makeAnnotation('va-order0002', 'step-1'), createdAt: base }, makeBlob('new'));
    const ids = (await getAllVoiceAnnotations()).map((a) => a.id);
    expect(ids.indexOf('va-order0002')).toBeLessThan(ids.indexOf('va-order0001'));
  });

  it('deleteVoiceAnnotation removes and is idempotent', async () => {
    await saveVoiceAnnotation(makeAnnotation('va-del0001', 'step-4'), makeBlob('delete-me'));
    await deleteVoiceAnnotation('va-del0001');
    expect(await loadVoiceAnnotation('va-del0001')).toBeNull();
    expect(await listAnnotationsForStep('step-4')).toHaveLength(0);
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
    await saveVoiceAnnotation({ ...ann, durationMs: 9999 }, makeBlob('v2'));
    const ids = (await listAnnotationsForStep('step-8')).map((a) => a.id);
    expect(ids.filter((id) => id === 'va-overwrite01')).toHaveLength(1);
    expect((await loadVoiceAnnotation('va-overwrite01'))!.annotation.durationMs).toBe(9999);
  });
});

describe('createAnnotationUrl / revokeAnnotationUrl', () => {
  it('createAnnotationUrl returns a blob: URL and revokeAnnotationUrl does not throw', () => {
    const url = createAnnotationUrl(new Blob(['test'], { type: 'audio/webm' }));
    expect(url).toMatch(/^blob:/);
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

  it('stop() returns and persists a VoiceAnnotation', async () => {
    const ann = await (await startRecording('step-9')).stop();
    expect(ann.stepId).toBe('step-9');
    expect(ann.id).toMatch(/^va-[0-9a-f]{8}$/);
    expect(ann.durationMs).toBeGreaterThanOrEqual(0);
    const loaded = await loadVoiceAnnotation(ann.id);
    expect(loaded!.annotation.stepId).toBe('step-9');
  });

  it('cancel() does not persist any annotation', async () => {
    const countBefore = await _blobStoreKeyCount();
    const session = await startRecording('step-11');
    session.cancel();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(await _blobStoreKeyCount()).toBe(countBefore);
  });

  it('stop() releases microphone tracks', async () => {
    const fakeTrack = { stop: vi.fn() } as unknown as MediaStreamTrack;
    const fakeStream = { getTracks: () => [fakeTrack] } as unknown as MediaStream;
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: vi.fn().mockResolvedValue(fakeStream) },
      configurable: true,
    });
    await (await startRecording('step-12')).stop();
    expect(fakeTrack.stop).toHaveBeenCalled();
  });
});
