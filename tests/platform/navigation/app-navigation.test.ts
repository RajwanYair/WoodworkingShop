import { describe, expect, it, vi } from 'vitest';
import { commitAppUrl, listenForTraverse } from '../../../src/platform/navigation/app-navigation';

function fakeWindow(navigation?: object) {
  const listeners = new Map<string, Set<(event: Event) => void>>();
  return {
    location: { href: 'https://shop.example/?tab=workspace', pathname: '/', search: '?tab=workspace' },
    history: {
      pushState: vi.fn(),
      replaceState: vi.fn(),
    },
    navigation,
    addEventListener: (type: string, listener: (event: Event) => void) => {
      const set = listeners.get(type) ?? new Set();
      set.add(listener);
      listeners.set(type, set);
    },
    removeEventListener: (type: string, listener: (event: Event) => void) => {
      listeners.get(type)?.delete(listener);
    },
    dispatch(type: string) {
      listeners.get(type)?.forEach((listener) => listener(new Event(type)));
    },
  };
}

describe('commitAppUrl', () => {
  it('uses the History API when the Navigation API is absent', () => {
    const target = fakeWindow();

    commitAppUrl('/?tab=optimizer&cab=2', 'push', target);
    commitAppUrl('/?tab=pdf', 'replace', target);

    expect(target.history.pushState).toHaveBeenCalledWith(null, '', '/?tab=optimizer&cab=2');
    expect(target.history.replaceState).toHaveBeenCalledWith(null, '', '/?tab=pdf');
  });

  it('keeps same-document commits on the History API even when navigation.navigate would reload', () => {
    const navigate = vi.fn();
    const target = fakeWindow({
      navigate,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    commitAppUrl('/?tab=assembly', 'push', target);
    commitAppUrl('/?tab=calculators', 'replace', target);

    expect(navigate).not.toHaveBeenCalled();
    expect(target.history.pushState).toHaveBeenCalledWith(null, '', '/?tab=assembly');
    expect(target.history.replaceState).toHaveBeenCalledWith(null, '', '/?tab=calculators');
  });
});

describe('listenForTraverse', () => {
  it('uses popstate when the Navigation API is absent', () => {
    const target = fakeWindow();
    const onHref = vi.fn();
    const stop = listenForTraverse(onHref, target);

    target.location.pathname = '/';
    target.location.search = '?tab=preview&cab=1';
    target.dispatch('popstate');
    stop();
    target.dispatch('popstate');

    expect(onHref).toHaveBeenCalledTimes(1);
    expect(onHref).toHaveBeenCalledWith('/?tab=preview&cab=1');
  });

  it('also reports popstate when the Navigation API is present', () => {
    const target = fakeWindow({
      navigate: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const onHref = vi.fn();
    const stop = listenForTraverse(onHref, target);

    target.location.pathname = '/';
    target.location.search = '?tab=optimizer';
    target.dispatch('popstate');
    stop();
    target.dispatch('popstate');

    expect(onHref).toHaveBeenCalledTimes(1);
    expect(onHref).toHaveBeenCalledWith('/?tab=optimizer');
  });

  it('reports only traverse navigations when the Navigation API is present', () => {
    const listeners = new Set<(event: Event) => void>();
    const target = fakeWindow({
      navigate: vi.fn(),
      addEventListener: (_type: string, listener: (event: Event) => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: Event) => void) => listeners.delete(listener),
    });
    const onHref = vi.fn();
    const stop = listenForTraverse(onHref, target);
    const emit = (event: object) => listeners.forEach((listener) => listener(event as Event));

    emit({ navigationType: 'push', destination: { url: 'https://shop.example/?tab=optimizer' } });
    emit({ navigationType: 'traverse', destination: { url: 'https://shop.example/?tab=pdf&cab=2' } });
    stop();
    emit({ navigationType: 'traverse', destination: { url: 'https://shop.example/?tab=workspace' } });

    expect(onHref).toHaveBeenCalledTimes(1);
    expect(onHref).toHaveBeenCalledWith('https://shop.example/?tab=pdf&cab=2');
  });
});
