/**
 * Sprint 74 — WebSerial CNC panel, mounted at the bottom of the Assembly tab.
 * Uses progressive enhancement: shows a "not supported" notice on non-Chrome browsers.
 */
import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import {
  isWebSerialAvailable,
  connectToMachine,
  streamGcodeLines,
  disconnectFromMachine,
  DEFAULT_SERIAL_PROFILE,
  type WebSerialState,
  type WebSerialProfile,
} from '../../engine/webserial';
import { cutSheetToGcode } from '../../utils/gcode-export';

/** Internal serial port handle type (matches engine/webserial SerialPortHandle). */
interface PortHandle {
  close(): Promise<void>;
  readonly writable: WritableStream<Uint8Array> | null;
  readonly readable: ReadableStream<Uint8Array> | null;
}

export function WebSerialPanel() {
  const { t } = useTranslation();
  const { combinedOptimization } = useCabinetStore();
  const cutSheets = combinedOptimization.sheets;

  const [state, setState] = useState<WebSerialState>('disconnected');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const portRef = useRef<PortHandle | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Collect all G-code lines from every cut sheet
  const buildGcodeLines = useCallback((): string[] => {
    const all: string[] = [];
    for (const sheet of cutSheets) {
      const text = cutSheetToGcode(sheet);
      all.push(
        ...text
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0 && !l.startsWith(';')),
      );
    }
    return all;
  }, [cutSheets]);

  const handleConnect = useCallback(async () => {
    setErrorMsg(null);
    setState('connecting');
    try {
      const profile: WebSerialProfile = { ...DEFAULT_SERIAL_PROFILE };
      const port = await connectToMachine(profile);
      portRef.current = port as unknown as PortHandle;
      const lines = buildGcodeLines();
      if (lines.length === 0) {
        setState('connected');
        return;
      }
      setState('streaming');
      const ac = new AbortController();
      abortRef.current = ac;
      setProgress({ current: 0, total: lines.length });
      await streamGcodeLines(
        port as Parameters<typeof streamGcodeLines>[0],
        lines,
        (sent, total) => setProgress({ current: sent, total }),
        ac.signal,
      );
      setState('connected');
      setProgress(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setState('error');
    }
  }, [buildGcodeLines]);

  const handleDisconnect = useCallback(async () => {
    abortRef.current?.abort();
    if (portRef.current) {
      await disconnectFromMachine(portRef.current as Parameters<typeof disconnectFromMachine>[0]);
      portRef.current = null;
    }
    setState('disconnected');
    setProgress(null);
    setErrorMsg(null);
  }, []);

  const isConnected = state === 'connected' || state === 'streaming';
  const isBusy = state === 'connecting' || state === 'streaming';
  const hasSheets = cutSheets.length > 0;

  if (!isWebSerialAvailable()) {
    return (
      <div className="border-wood-200 dark:border-wood-700 rounded-lg border p-4">
        <h3 className="text-wood-700 dark:text-wood-200 mb-1 text-sm font-semibold">{t('webserial.title')}</h3>
        <p className="text-wood-400 dark:text-wood-500 text-xs">{t('webserial.notSupported')}</p>
      </div>
    );
  }

  return (
    <div className="border-wood-200 dark:border-wood-700 rounded-lg border p-4">
      <h3 className="text-wood-700 dark:text-wood-200 mb-3 text-sm font-semibold">{t('webserial.title')}</h3>

      {!hasSheets && !isConnected && (
        <p className="text-wood-400 dark:text-wood-500 mb-3 text-xs">{t('webserial.noSheets')}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {!isConnected ? (
          <button
            type="button"
            disabled={isBusy || !hasSheets}
            onClick={handleConnect}
            className="bg-wood-600 hover:bg-wood-700 disabled:bg-wood-300 dark:disabled:bg-wood-700 rounded px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed"
          >
            {t('webserial.connect')}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleDisconnect}
            className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-50 dark:hover:bg-wood-700 rounded border px-3 py-1.5 text-sm transition-colors"
          >
            {t('webserial.disconnect')}
          </button>
        )}

        {/* Progress indicator */}
        {progress && (
          <span className="text-wood-500 dark:text-wood-400 text-xs tabular-nums">
            {t('webserial.streaming', { current: progress.current, total: progress.total })}
          </span>
        )}
        {state === 'connected' && !progress && (
          <span className="text-wood-500 dark:text-wood-400 text-xs">
            {t('webserial.done', { total: buildGcodeLines().length })}
          </span>
        )}
      </div>

      {/* Error notice */}
      {state === 'error' && errorMsg && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{t('webserial.error', { message: errorMsg })}</p>
      )}
    </div>
  );
}
