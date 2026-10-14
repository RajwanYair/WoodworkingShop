export interface BrowserUrlSnapshot {
  origin: string;
  pathname: string;
  search: string;
}

export function getBrowserUrl(): BrowserUrlSnapshot {
  return {
    origin: window.location.origin,
    pathname: window.location.pathname,
    search: window.location.search,
  };
}

export function replaceBrowserUrl(url: string): void {
  window.history.replaceState(null, '', url);
}

export function pushBrowserUrl(url: string): void {
  window.history.pushState(null, '', url);
}
