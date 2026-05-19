import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
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
    const { getByTestId } = render(<Trap active={false} />);
    // Should not throw and container should not receive focus automatically
    expect(getByTestId('trap')).toBeInTheDocument();
  });

  it('focuses container when no focusable children exist', () => {
    const { getByTestId } = render(<Trap active={true} />);
    // The container itself should receive focus as the fallback
    expect(document.activeElement).toBe(getByTestId('trap'));
  });

  it('focuses first focusable child on mount', () => {
    const { getByRole } = render(
      <Trap active={true}>
        <button>First</button>
        <button>Second</button>
      </Trap>,
    );
    expect(document.activeElement).toBe(getByRole('button', { name: 'First' }));
  });

  it('calls onEscape when Escape key is pressed', () => {
    const onEscape = vi.fn();
    const { getByTestId } = render(
      <Trap active={true} onEscape={onEscape}>
        <button>OK</button>
      </Trap>,
    );
    fireEvent.keyDown(getByTestId('trap'), { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledOnce();
  });

  it('wraps Tab from last focusable element to first', () => {
    const { getAllByRole } = render(
      <Trap active={true}>
        <button>First</button>
        <button>Last</button>
      </Trap>,
    );
    const [first, last] = getAllByRole('button');
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(first);
  });

  it('wraps Shift+Tab from first focusable element to last', () => {
    const { getAllByRole } = render(
      <Trap active={true}>
        <button>First</button>
        <button>Last</button>
      </Trap>,
    );
    const [first, last] = getAllByRole('button');
    first.focus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('ignores non-Tab, non-Escape keys', () => {
    const { getByRole } = render(
      <Trap active={true}>
        <button>OK</button>
      </Trap>,
    );
    // Should not throw or misbehave
    fireEvent.keyDown(getByRole('button', { name: 'OK' }), { key: 'Enter' });
    expect(getByRole('button', { name: 'OK' })).toBeInTheDocument();
  });
});
