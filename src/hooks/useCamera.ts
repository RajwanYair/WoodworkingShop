import { useState, useRef, useCallback } from 'react';

// Minimal Capacitor types — avoids adding @capacitor/core as a prod dep.
interface CapacitorCameraPlugin {
  getPhoto(options: {
    quality: number;
    allowEditing: boolean;
    resultType: 'dataUrl' | 'base64' | 'uri';
    source: 'CAMERA' | 'PHOTOS';
  }): Promise<{ dataUrl?: string; webPath?: string }>;
}

interface CapWindow {
  Capacitor?: {
    isNativePlatform(): boolean;
    Plugins?: { Camera?: CapacitorCameraPlugin };
  };
}

type CameraStatus = 'idle' | 'active' | 'captured' | 'error';

export interface UseCameraResult {
  status: CameraStatus;
  photoDataUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  startCamera(): Promise<void>;
  stopCamera(): void;
  capturePhoto(): string | null;
  error: string | null;
  isNative: boolean;
  isSupported: boolean;
}

/**
 * Camera access hook.
 * On native Capacitor builds: delegates to the Capacitor Camera plugin.
 * On web: uses getUserMedia (environment-facing camera).
 */
export function useCamera(): UseCameraResult {
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cap = (window as CapWindow).Capacitor;
  const isNative = cap?.isNativePlatform?.() ?? false;
  const capCamera = cap?.Plugins?.Camera;
  const isSupported = isNative ? !!capCamera : Boolean(navigator.mediaDevices?.getUserMedia);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus((prev) => (prev === 'active' ? 'idle' : prev));
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);

    // --- Native Capacitor path ---
    if (isNative && capCamera) {
      try {
        const photo = await capCamera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: 'dataUrl',
          source: 'CAMERA',
        });
        setPhotoDataUrl(photo.dataUrl ?? null);
        setStatus('captured');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Camera error');
        setStatus('error');
      }
      return;
    }

    // --- Web getUserMedia path ---
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera not supported');
      setStatus('error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStatus('active');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Camera error');
      setStatus('error');
    }
  }, [isNative, capCamera]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || status !== 'active') return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPhotoDataUrl(dataUrl);
    stopCamera();
    setStatus('captured');
    return dataUrl;
  }, [status, stopCamera]);

  return {
    status,
    photoDataUrl,
    videoRef,
    startCamera,
    stopCamera,
    capturePhoto,
    error,
    isNative,
    isSupported,
  };
}
