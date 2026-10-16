export const browserSessionStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
  getItem(key) {
    return globalThis.sessionStorage?.getItem(key) ?? null;
  },
  setItem(key, value) {
    globalThis.sessionStorage?.setItem(key, value);
  },
  removeItem(key) {
    globalThis.sessionStorage?.removeItem(key);
  },
};

export function confirmBrowserAction(message: string): boolean {
  return window.confirm(message);
}

export function dispatchBrowserEvent(type: string, detail?: unknown): void {
  const event = detail === undefined ? new Event(type) : new CustomEvent(type, { detail });
  window.dispatchEvent(event);
}

export function listenToBrowserEvent(type: string, listener: EventListener): () => void {
  window.addEventListener(type, listener);
  return () => window.removeEventListener(type, listener);
}

export function listenToKeyboardEvents(listener: (event: KeyboardEvent) => void): () => void {
  window.addEventListener('keydown', listener);
  return () => window.removeEventListener('keydown', listener);
}

export function requestBrowserAnimationFrame(callback: FrameRequestCallback): number {
  return window.requestAnimationFrame(callback);
}

export function cancelBrowserAnimationFrame(handle: number): void {
  window.cancelAnimationFrame(handle);
}

export function isMediaQueryMatched(query: string, fallback = false): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : fallback;
}

export function listenToMediaQuery(query: string, onChange: (matches: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mediaQuery = window.matchMedia(query);
  const handleChange = () => onChange(mediaQuery.matches);
  mediaQuery.addEventListener('change', handleChange);
  return () => mediaQuery.removeEventListener('change', handleChange);
}

export function isTouchPrimaryInput(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    navigator.maxTouchPoints > 0 &&
    (typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function' ||
      window.matchMedia('(pointer: coarse)').matches)
  );
}

export function printBrowserDocument(): void {
  window.print();
}

export function reloadBrowserDocument(): void {
  window.location.reload();
}

export function setBrowserDocumentTitle(title: string): void {
  document.title = title;
}

export function openPrintDocument(html: string): boolean {
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return false;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 100);
  return true;
}
