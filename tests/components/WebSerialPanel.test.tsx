import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSerialPanel } from '../../src/components/assembly/WebSerialPanel';
import { useCabinetStore } from '../../src/store/cabinet-store';
import { makeOptimizationResult } from '../helpers';

const originalSerialDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serial');

afterEach(() => {
  if (originalSerialDescriptor) {
    Object.defineProperty(navigator, 'serial', originalSerialDescriptor);
  } else {
    Reflect.deleteProperty(navigator, 'serial');
  }
});

describe('WebSerialPanel', () => {
  it('shows the browser support notice when Web Serial is unavailable', () => {
    Reflect.deleteProperty(navigator, 'serial');

    render(<WebSerialPanel />);

    expect(screen.getByText(/Web Serial is not supported in this browser/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Connect to machine' })).not.toBeInTheDocument();
  });

  it('keeps connection disabled until optimization sheets exist', () => {
    Object.defineProperty(navigator, 'serial', { configurable: true, value: {} });
    useCabinetStore.setState({ combinedOptimization: makeOptimizationResult({ sheets: [] }) });

    render(<WebSerialPanel />);

    expect(screen.getByText('Run the cut optimizer first to generate G-code.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect to machine' })).toBeDisabled();
  });
});
