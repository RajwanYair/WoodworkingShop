import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToastStore } from '../../src/store/toast-store';

describe('useToastStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with empty toasts', () => {
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('addToast adds a toast', () => {
    useToastStore.getState().addToast('Hello', 'info');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].message).toBe('Hello');
    expect(useToastStore.getState().toasts[0].type).toBe('info');
  });

  it('addToast defaults to info type', () => {
    useToastStore.getState().addToast('Test');
    expect(useToastStore.getState().toasts[0].type).toBe('info');
  });

  it('removeToast removes by id', () => {
    useToastStore.getState().addToast('A', 'success');
    useToastStore.getState().addToast('B', 'error');
    const id = useToastStore.getState().toasts[0].id;
    useToastStore.getState().removeToast(id);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].message).toBe('B');
  });

  it('auto-removes toast after 3.5s', () => {
    useToastStore.getState().addToast('Temporary', 'info');
    expect(useToastStore.getState().toasts).toHaveLength(1);
    vi.advanceTimersByTime(3500);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('supports multiple simultaneous toasts', () => {
    useToastStore.getState().addToast('First', 'success');
    useToastStore.getState().addToast('Second', 'error');
    useToastStore.getState().addToast('Third', 'info');
    expect(useToastStore.getState().toasts).toHaveLength(3);
  });
});
