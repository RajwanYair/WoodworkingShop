import { stopMediaStream } from './capabilities';

interface MediaRecorderConstructorLike {
  isTypeSupported(mimeType: string): boolean;
  new (stream: MediaStream, options?: MediaRecorderOptions): MediaRecorder;
}

function getMediaRecorderConstructor(): MediaRecorderConstructorLike | null {
  const candidate = (globalThis as Record<string, unknown>)['MediaRecorder'];
  return typeof candidate === 'function' ? (candidate as MediaRecorderConstructorLike) : null;
}

export function getSupportedMediaRecorderMimeType(mimeTypes: readonly string[]): string | null {
  const candidate = (globalThis as Record<string, unknown>)['MediaRecorder'] as
    { isTypeSupported?: (mimeType: string) => boolean } | undefined;
  if (typeof candidate?.isTypeSupported !== 'function') return null;
  return mimeTypes.find((mimeType) => candidate.isTypeSupported!(mimeType)) ?? '';
}

interface AudioRecordingResult {
  blob: Blob;
  durationMs: number;
  mimeType: string;
}

interface AudioRecordingSession {
  stop(): Promise<AudioRecordingResult>;
  cancel(): void;
}

export async function startAudioRecording(preferredMimeTypes: readonly string[]): Promise<AudioRecordingSession> {
  const stream = await requestAudioStream();
  const mimeType = getSupportedMediaRecorderMimeType(preferredMimeTypes) ?? '';
  const recorder = getMediaRecorderConstructor();
  if (!recorder) {
    stopMediaStream(stream);
    throw new Error('MediaRecorder API is not available in this browser.');
  }

  const mediaRecorder = new recorder(stream, mimeType ? { mimeType } : {});
  const chunks: Blob[] = [];
  const startedAt = Date.now();
  mediaRecorder.ondataavailable = (event: BlobEvent) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  mediaRecorder.start(100);

  return {
    async stop(): Promise<AudioRecordingResult> {
      await new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => resolve();
        mediaRecorder.stop();
      });
      stopMediaStream(stream);
      const effectiveMime = mimeType || (chunks[0]?.type ?? 'audio/webm');
      return {
        blob: new Blob(chunks, { type: effectiveMime }),
        durationMs: Date.now() - startedAt,
        mimeType: effectiveMime,
      };
    },
    cancel(): void {
      if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      stopMediaStream(stream);
    },
  };
}

function requestAudioStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}
