import { useTranslation } from 'react-i18next';
import { useCamera } from '../../hooks/useCamera';

/**
 * Room photo capture widget for the Assembly tab.
 * Lets the user take (or retake) a reference photo of the installation space.
 */
export function CameraCapture() {
  const { t } = useTranslation();
  const { status, photoDataUrl, videoRef, startCamera, stopCamera, capturePhoto, error, isSupported } = useCamera();

  if (!isSupported) {
    return <p className="text-wood-500 dark:text-wood-400 text-sm italic">{t('camera.notSupported')}</p>;
  }

  return (
    <section aria-label={t('camera.title')} className="space-y-3">
      <h3 className="text-wood-700 dark:text-wood-200 text-sm font-semibold">{t('camera.title')}</h3>

      {/* Live video feed */}
      {status === 'active' && (
        <div className="border-wood-300 dark:border-wood-600 relative overflow-hidden rounded-lg border">
          {/* Live camera — no captions available for getUserMedia streams */}
          <video ref={videoRef} autoPlay playsInline muted className="w-full" aria-label={t('camera.videoFeed')}>
            <track kind="captions" srcLang="en" label="" />
          </video>
          <div className="absolute bottom-2 flex w-full justify-center gap-3 px-2">
            <button
              onClick={() => capturePhoto()}
              className="bg-wood-600 hover:bg-wood-700 rounded-full px-5 py-2 text-sm font-semibold text-white shadow"
            >
              {t('camera.capture')}
            </button>
            <button
              onClick={stopCamera}
              className="text-wood-800 rounded-full bg-white/80 px-4 py-2 text-sm font-medium shadow hover:bg-white"
            >
              {t('camera.stop')}
            </button>
          </div>
        </div>
      )}

      {/* Captured photo */}
      {status === 'captured' && photoDataUrl && (
        <div className="space-y-2">
          <img
            src={photoDataUrl}
            alt={t('camera.capturedAlt')}
            className="border-wood-300 dark:border-wood-600 w-full rounded-lg border"
          />
          <button
            onClick={() => void startCamera()}
            className="border-wood-300 text-wood-700 hover:bg-wood-50 dark:border-wood-600 dark:text-wood-200 dark:hover:bg-wood-800 rounded-md border px-3 py-1 text-sm"
          >
            {t('camera.retake')}
          </button>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {t('camera.error')}: {error}
        </p>
      )}

      {/* Idle: open camera button */}
      {(status === 'idle' || status === 'error') && (
        <button
          onClick={() => void startCamera()}
          className="bg-wood-600 hover:bg-wood-700 rounded-md px-4 py-2 text-sm font-medium text-white"
        >
          {t('camera.start')}
        </button>
      )}
    </section>
  );
}
