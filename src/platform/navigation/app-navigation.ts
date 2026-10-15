export type AppHistoryMode = 'push' | 'replace';

interface AppNavigateDestination {
  url: string;
}

interface AppNavigateEvent extends Event {
  navigationType: string;
  destination: AppNavigateDestination;
}

interface AppNavigationController {
  navigate: (url: string, options?: { history?: AppHistoryMode }) => unknown;
  addEventListener: (type: 'navigate', listener: (event: Event) => void) => void;
  removeEventListener: (type: 'navigate', listener: (event: Event) => void) => void;
}

function isAppNavigationController(value: unknown): value is AppNavigationController {
  if (!value || typeof value !== 'object') return false;
  return (
    'navigate' in value &&
    typeof value.navigate === 'function' &&
    'addEventListener' in value &&
    typeof value.addEventListener === 'function' &&
    'removeEventListener' in value &&
    typeof value.removeEventListener === 'function'
  );
}

interface AppNavigationTarget {
  location: { href: string; pathname: string; search: string };
  history: {
    pushState: (data: null, unused: string, url?: string | null) => void;
    replaceState: (data: null, unused: string, url?: string | null) => void;
  };
  navigation?: unknown;
  addEventListener: (type: string, listener: (event: Event) => void) => void;
  removeEventListener: (type: string, listener: (event: Event) => void) => void;
}

function readNavigation(target: AppNavigationTarget): AppNavigationController | null {
  if (!('navigation' in target)) return null;
  return isAppNavigationController(target.navigation) ? target.navigation : null;
}

function isTraverseNavigation(event: Event): event is AppNavigateEvent {
  if (!('navigationType' in event) || !('destination' in event)) return false;
  const destination = event.destination;
  return (
    event.navigationType === 'traverse' &&
    typeof destination === 'object' &&
    destination !== null &&
    'url' in destination &&
    typeof destination.url === 'string'
  );
}

function writeHistory(target: AppNavigationTarget, url: string, history: AppHistoryMode): void {
  if (history === 'replace') target.history.replaceState(null, '', url);
  else target.history.pushState(null, '', url);
}

/**
 * Commit a same-document URL with the History API.
 * `navigation.navigate()` is not used: in current Chromium it performs a document load for a
 * query-only URL, which drops unsaved shell state. The Navigation API still observes traversals.
 */
export function commitAppUrl(url: string, history: AppHistoryMode, target: AppNavigationTarget = window): void {
  writeHistory(target, url, history);
}

/**
 * Observe back/forward traversals. Browsers with the Navigation API report them as
 * `navigate` events of type `traverse`. Other browsers use `popstate`.
 */
export function listenForTraverse(onHref: (href: string) => void, target: AppNavigationTarget = window): () => void {
  const onPopState = () => onHref(`${target.location.pathname}${target.location.search}`);
  target.addEventListener('popstate', onPopState);
  const navigation = readNavigation(target);
  if (!navigation) return () => target.removeEventListener('popstate', onPopState);
  const onNavigate = (event: Event) => {
    if (!isTraverseNavigation(event)) return;
    onHref(event.destination.url);
  };
  navigation.addEventListener('navigate', onNavigate);
  return () => {
    target.removeEventListener('popstate', onPopState);
    navigation.removeEventListener('navigate', onNavigate);
  };
}
