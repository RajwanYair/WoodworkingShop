import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRef } from 'react';
import { useFocusTrap } from '../../src/hooks/useFocusTrap';

/** A minimal wrapper component that wires useFocusTrap to a div. */
function Trap({
  active = true,
  onEscape,
  children,
}: {
  active?: boolean;
  onEscape?: () => void;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, active, onEscape);
  return (
    <div ref={ref} tabIndex={-1} data-testid="trap">
      {children}
    </div>
  );
}

describe('useFocusTrap', () => {
  it('does nothing when active is false', () => {
    render(<Trap active={false} />);
    // Should not throw and container should not receive focus automatically
    expect(screen.getByTestId('trap')).toBeInTheDocument();
  });

  it('focuses container when no focusable children exist', () => {
    render(<Trap active={true} />);
    // The container itself should receive focus as the fallback
    expect(screen.getByTestId('trap')).toHaveFocus();
  });

  it('focuses first focusable child on mount', () => {
    render(
      <Trap active={true}>
        <button>First</button>
        <button>Second</button>
      </Trap>,
    );
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus();
  });

  it('calls onEscape when Escape key is pressed', () => {
    const onEscape = vi.fn();
    render(
      <Trap active={true} onEscape={onEscape}>
        <button>OK</button>
      </Trap>,
    );
    fireEvent.keyDown(screen.getByTestId('trap'), { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledOnce();
  });

  it('wraps Tab from last focusable element to first', () => {
    render(
      <Trap active={true}>
        <button>First</button>
        <button>Last</button>
      </Trap>,
    );
    const [first, last] = screen.getAllByRole('button');
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab', shiftKey: false });
    expect(first).toHaveFocus();
  });

  it('wraps Shift+Tab from first focusable element to last', () => {
    render(
      <Trap active={true}>
        <button>First</button>
        <button>Last</button>
      </Trap>,
    );
    const [first, last] = screen.getAllByRole('button');
    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('ignores non-Tab, non-Escape keys', () => {
    render(
      <Trap active={true}>
        <button>OK</button>
      </Trap>,
    );
    // Should not throw or misbehave
    fireEvent.keyDown(screen.getByRole('button', { name: 'OK' }), { key: 'Enter' });
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
  });

  it('does not wrap Tab when active element is not the last', () => {
    render(
      <Trap active={true}>
        <button>First</button>
        <button>Second</button>
        <button>Last</button>
      </Trap>,
    );
    const [first, second] = screen.getAllByRole('button');
    second.focus();
    // Tab from middle — focus should remain on second (browser handles natural Tab, we don't intercept)
    fireEvent.keyDown(second, { key: 'Tab', shiftKey: false });
    expect(first).not.toHaveFocus();
  });

  it('does not wrap Shift+Tab when active element is not the first', () => {
    render(
      <Trap active={true}>
        <button>First</button>
        <button>Second</button>
        <button>Last</button>
      </Trap>,
    );
    const [, second, last] = screen.getAllByRole('button');
    second.focus();
    // Shift+Tab from middle — should not wrap to last
    fireEvent.keyDown(second, { key: 'Tab', shiftKey: true });
    expect(last).not.toHaveFocus();
  });

  it('Tab with no focusable items does not throw', () => {
    render(<Trap active={true} />);
    // container has tabIndex=-1, excluded from FOCUSABLE — items list will be empty
    fireEvent.keyDown(screen.getByTestId('trap'), { key: 'Tab' });
    expect(screen.getByTestId('trap')).toBeInTheDocument();
  });

  it('Escape without onEscape callback does not throw', () => {
    render(
      <Trap active={true}>
        <button>OK</button>
      </Trap>,
    );
    expect(() => fireEvent.keyDown(screen.getByTestId('trap'), { key: 'Escape' })).not.toThrow();
  });

  it('removes keydown listener on unmount', () => {
    const onEscape = vi.fn();
    const { unmount } = render(
      <Trap active={true} onEscape={onEscape}>
        <button>OK</button>
      </Trap>,
    );
    const trapEl = screen.getByTestId('trap');
    unmount();
    // After unmount the cleanup removes the listener — Escape should NOT call onEscape
    fireEvent.keyDown(trapEl, { key: 'Escape' });
    expect(onEscape).not.toHaveBeenCalled();
  });
});
