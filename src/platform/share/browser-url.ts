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

export function getBrowserHref(): string {
  return window.location.href;
}

export function setBrowserQueryParam(key: string, value: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
}

export function replaceBrowserUrl(url: string): void {
  window.history.replaceState(null, '', url);
}

export function pushBrowserUrl(url: string): void {
  window.history.pushState(null, '', url);
}
