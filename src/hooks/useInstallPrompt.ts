import { useCallback, useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

/**
 * Sprint 149 — PWA install prompt hook.
 *
 * Captures the `beforeinstallprompt` event and defers it so the app can
 * show a custom install banner at the right moment (e.g. after the user
 * has interacted with the tool for 30+ seconds).
 *
 * Returns:
 * - `canInstall`: whether the prompt is available and app is not installed
 * - `promptInstall`: triggers the native install dialog
 * - `isInstalled`: whether the app is already running as a PWA
 */
export function useInstallPrompt(): {
  canInstall: boolean;
  promptInstall: () => Promise<'accepted' | 'dismissed' | null>;
  isInstalled: boolean;
} {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect if already installed (standalone or fullscreen display mode)
    const mq = window.matchMedia('(display-mode: standalone)');
    setIsInstalled(mq.matches);

    const handleDisplayChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
      if (e.matches) {
        setCanInstall(false);
        deferredPromptRef.current = null;
      }
    };
    mq.addEventListener('change', handleDisplayChange);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      mq.removeEventListener('change', handleDisplayChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | null> => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return null;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;

    // The prompt can only be used once
    deferredPromptRef.current = null;
    setCanInstall(false);

    return outcome;
  }, []);

  return { canInstall, promptInstall, isInstalled };
}
