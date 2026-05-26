// Haptic feedback hook.
// On native Capacitor builds: delegates to the Capacitor Haptics plugin.
// On web: falls back to the Web Vibration API (navigator.vibrate).

// Minimal Capacitor types — avoids adding @capacitor/core as a prod dep.
interface CapacitorHapticsPlugin {
  impact(options: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }): Promise<void>;
  notification(options: { type: 'SUCCESS' | 'WARNING' | 'ERROR' }): Promise<void>;
  vibrate(options: { duration: number }): Promise<void>;
  selectionChanged(): Promise<void>;
}

interface CapWindow {
  Capacitor?: {
    isNativePlatform(): boolean;
    Plugins?: { Haptics?: CapacitorHapticsPlugin };
  };
}

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotificationType = 'success' | 'warning' | 'error';

export interface UseHapticsResult {
  /** Short tap feedback — use on button press, drag start. */
  impact(style?: ImpactStyle): void;
  /** Feedback pattern — use on action completion or errors. */
  notification(type?: NotificationType): void;
  /** Very short tick — use on list-item selection change. */
  selectionChanged(): void;
  /** True if any haptic channel is available. */
  isAvailable: boolean;
}

// Web Vibration API duration map (ms)
const WEB_IMPACT: Record<ImpactStyle, number> = { light: 10, medium: 20, heavy: 40 };
const WEB_NOTIFICATION: Record<NotificationType, VibratePattern> = {
  success: [10, 50, 10],
  warning: [20, 30, 20],
  error: [40, 30, 40, 30, 40],
};

/**
 * Returns haptic feedback helpers.
 * Calling these on unsupported platforms is always safe (no-op).
 */
export function useHaptics(): UseHapticsResult {
  const cap = (window as CapWindow).Capacitor;
  const isNative = cap?.isNativePlatform?.() ?? false;
  const hap = cap?.Plugins?.Haptics;
  const hasVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  const isAvailable = isNative ? Boolean(hap) : hasVibrate;

  function impact(style: ImpactStyle = 'medium'): void {
    if (isNative && hap) {
      void hap.impact({ style: style.toUpperCase() as 'LIGHT' | 'MEDIUM' | 'HEAVY' });
    } else if (hasVibrate) {
      navigator.vibrate(WEB_IMPACT[style]);
    }
  }

  function notification(type: NotificationType = 'success'): void {
    if (isNative && hap) {
      void hap.notification({ type: type.toUpperCase() as 'SUCCESS' | 'WARNING' | 'ERROR' });
    } else if (hasVibrate) {
      navigator.vibrate(WEB_NOTIFICATION[type]);
    }
  }

  function selectionChanged(): void {
    if (isNative && hap) {
      void hap.selectionChanged();
    } else if (hasVibrate) {
      navigator.vibrate(5);
    }
  }

  return { impact, notification, selectionChanged, isAvailable };
}
