export function isCameraSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && (navigator as Navigator & { serial?: unknown }).serial != null;
}

export function isWebVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function isWakeLockSupported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

export async function requestEnvironmentCamera(): Promise<MediaStream> {
  if (!isCameraSupported()) throw new Error('Camera not supported');
  return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
}

export function stopMediaStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function vibrate(pattern: VibratePattern): boolean {
  return isWebVibrationSupported() ? navigator.vibrate(pattern) : false;
}
