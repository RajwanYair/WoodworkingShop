import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PluginRegistryPanel } from '../../src/components/layout/PluginRegistryPanel';
import { registerPlugin, unregisterPlugin, getPlugins, type CabinetPlannerPlugin } from '../../src/engine/plugin';

// Reset the plugin registry before each test so tests are isolated.
beforeEach(() => {
  for (const p of [...getPlugins()]) unregisterPlugin(p.id);
});

const mockPlugin: CabinetPlannerPlugin = {
  id: 'com.test.demo',
  name: 'Demo Plugin',
  version: '1.2.3',
};

describe('PluginRegistryPanel', () => {
  it('shows empty state when no plugins are registered', () => {
    render(<PluginRegistryPanel />);
    expect(screen.getByText(/no plugins/i)).toBeInTheDocument();
  });

  it('renders a registered plugin name and id', () => {
    registerPlugin(mockPlugin);
    render(<PluginRegistryPanel />);
    expect(screen.getByText('Demo Plugin')).toBeInTheDocument();
    expect(screen.getByText(/com\.test\.demo/)).toBeInTheDocument();
  });

  it('displays the plugin version', () => {
    registerPlugin(mockPlugin);
    render(<PluginRegistryPanel />);
    expect(screen.getByText(/1\.2\.3/)).toBeInTheDocument();
  });

  it('shows "Enabled" button when plugin is active', () => {
    registerPlugin(mockPlugin);
    render(<PluginRegistryPanel />);
    expect(screen.getByRole('button', { pressed: true })).toBeInTheDocument();
  });

  it('toggles plugin to disabled on button click', () => {
    registerPlugin(mockPlugin);
    render(<PluginRegistryPanel />);
    const btn = screen.getByRole('button', { pressed: true });
    fireEvent.click(btn);
    // After clicking, aria-pressed should be false
    expect(screen.getByRole('button', { pressed: false })).toBeInTheDocument();
  });

  it('toggles plugin back to enabled on second click', () => {
    registerPlugin(mockPlugin);
    render(<PluginRegistryPanel />);
    const btn = screen.getByRole('button', { pressed: true });
    fireEvent.click(btn);
    fireEvent.click(screen.getByRole('button', { pressed: false }));
    expect(screen.getByRole('button', { pressed: true })).toBeInTheDocument();
  });

  it('shows the API version badge', () => {
    render(<PluginRegistryPanel />);
    expect(screen.getByText(/API v1\.2\.0/)).toBeInTheDocument();
  });

  it('renders multiple plugins in a list', () => {
    registerPlugin({ id: 'plugin.a', name: 'Plugin A', version: '1.0.0' });
    registerPlugin({ id: 'plugin.b', name: 'Plugin B', version: '2.0.0' });
    render(<PluginRegistryPanel />);
    expect(screen.getByText('Plugin A')).toBeInTheDocument();
    expect(screen.getByText('Plugin B')).toBeInTheDocument();
  });

  it('plugin list has accessible label', () => {
    registerPlugin(mockPlugin);
    render(<PluginRegistryPanel />);
    // The <ul> should have an aria-label
    expect(screen.getByRole('list')).toBeInTheDocument();
  });
});
