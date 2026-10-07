/**
 * Sprint 74 — WebSerial CNC panel, mounted at the bottom of the Assembly tab.
 * Uses progressive enhancement: shows a "not supported" notice on non-Chrome browsers.
 */
import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { isWebSerialAvailable, openSerialPort, type CncSerialSession } from '../../utils/webserial-cnc';
import { cutSheetToGcode } from '../../utils/gcode-export';
import { MachineProfileSelector } from './MachineProfileSelector';
import { getDefaultMachineProfile, type MachineProfile } from '../../engine/machine-profiles';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'streaming' | 'paused' | 'error';

export function WebSerialPanel() {
  const { t } = useTranslation();
  const { combinedOptimization } = useCabinetStore();
  const cutSheets = combinedOptimization.sheets;

  const [state, setState] = useState<ConnectionState>('disconnected');
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [machineProfile, setMachineProfile] = useState<MachineProfile>(getDefaultMachineProfile);
  const portRef = useRef<CncSerialSession | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const gcodeLinesRef = useRef<string[]>([]);
  const stopReasonRef = useRef<'pause' | 'disconnect' | null>(null);

  // Collect all G-code lines from every cut sheet
  const buildGcodeLines = useCallback((): string[] => {
    const all: string[] = [];
    for (const sheet of cutSheets) {
      const text = cutSheetToGcode(sheet, {
        feedRate: machineProfile.feedRate,
        plungeRate: machineProfile.plungeRate,
        safeZ: machineProfile.safeZ,
        passDepth: machineProfile.passDepth,
        toolDiameter: machineProfile.toolDiameter,
        spindleRpm: machineProfile.spindleRpm,
        useArcs: machineProfile.useArcs,
      });
      all.push(
        ...text
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0 && !l.startsWith(';')),
      );
    }
    return all;
  }, [cutSheets, machineProfile]);

  const sendLinesFrom = useCallback(async (startAt: number) => {
    const port = portRef.current;
    const lines = gcodeLinesRef.current;
    if (!port) return;

    const remainingLines = lines.slice(startAt);
    const abortController = new AbortController();
    abortRef.current = abortController;
    setState('streaming');
    setProgress({ current: startAt, total: lines.length });

    try {
      await port.send(
        remainingLines.join('\n'),
        (update) => setProgress({ current: startAt + update.sent, total: lines.length }),
        abortController.signal,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setState('error');
      setProgress(null);
      await port.close();
      if (portRef.current === port) portRef.current = null;
      return;
    } finally {
      if (abortRef.current === abortController) abortRef.current = null;
    }

    if (stopReasonRef.current === 'disconnect') return;
    if (stopReasonRef.current === 'pause') {
      stopReasonRef.current = null;
      setState('paused');
      return;
    }

    setState('connected');
    setProgress(null);
  }, []);

  const handleConnect = useCallback(async () => {
    setErrorMsg(null);
    setState('connecting');
    stopReasonRef.current = null;
    try {
      const profile = {
        baudRate: machineProfile.baudRate,
        dataBits: machineProfile.dataBits,
        stopBits: machineProfile.stopBits,
        parity: machineProfile.parity,
      };
      const port = await openSerialPort(profile);
      portRef.current = port;
      gcodeLinesRef.current = buildGcodeLines();
      if (gcodeLinesRef.current.length === 0) {
        setState('connected');
        return;
      }
      await sendLinesFrom(0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const port = portRef.current;
      if (port) {
        await port.close();
        portRef.current = null;
      }
      setErrorMsg(msg);
      setState('error');
    }
  }, [buildGcodeLines, machineProfile, sendLinesFrom]);

  const handlePause = useCallback(() => {
    stopReasonRef.current = 'pause';
    abortRef.current?.abort();
  }, []);

  const handleResume = useCallback(() => {
    if (progress) void sendLinesFrom(progress.current);
  }, [progress, sendLinesFrom]);

  const handleDisconnect = useCallback(async () => {
    stopReasonRef.current = 'disconnect';
    abortRef.current?.abort();
    if (portRef.current) {
      await portRef.current.close();
      portRef.current = null;
    }
    setState('disconnected');
    setProgress(null);
    setErrorMsg(null);
    gcodeLinesRef.current = [];
  }, []);

  const isConnected = state === 'connected' || state === 'streaming' || state === 'paused';
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

      {/* Sprint 75 — machine profile selector (hidden while connected) */}
      {!isConnected && (
        <div className="mb-4">
          <MachineProfileSelector onSelect={setMachineProfile} />
        </div>
      )}

      {!hasSheets && !isConnected && (
        <p className="text-wood-400 dark:text-wood-500 mb-3 text-xs">{t('webserial.noSheets')}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {!isConnected ? (
          <button
            type="button"
            disabled={isBusy || !hasSheets}
            onClick={handleConnect}
            className="bg-accent hover:bg-accent-hover disabled:bg-wood-300 dark:disabled:bg-wood-700 rounded px-3 py-1.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed"
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

        {state === 'streaming' && (
          <button
            type="button"
            onClick={handlePause}
            className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-50 dark:hover:bg-wood-700 rounded border px-3 py-1.5 text-sm transition-colors"
          >
            {t('webserial.pause')}
          </button>
        )}
        {state === 'paused' && (
          <button
            type="button"
            onClick={handleResume}
            className="border-wood-300 dark:border-wood-600 text-wood-600 dark:text-wood-300 hover:bg-wood-50 dark:hover:bg-wood-700 rounded border px-3 py-1.5 text-sm transition-colors"
          >
            {t('webserial.resume')}
          </button>
        )}

        {/* Progress indicator */}
        {progress && state === 'streaming' && (
          <span className="text-wood-500 dark:text-wood-400 text-xs tabular-nums">
            {t('webserial.streaming', { current: progress.current, total: progress.total })}
          </span>
        )}
        {state === 'connected' && !progress && (
          <span className="text-wood-500 dark:text-wood-400 text-xs">
            {t('webserial.done', { total: buildGcodeLines().length })}
          </span>
        )}
        {state === 'paused' && progress && (
          <span className="text-wood-500 dark:text-wood-400 text-xs">
            {t('webserial.paused', { current: progress.current, total: progress.total })}
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
