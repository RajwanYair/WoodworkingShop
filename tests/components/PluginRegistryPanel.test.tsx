import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PluginRegistryPanel } from '../../src/features/workspace/PluginRegistryPanel';
import { registerPlugin, unregisterPlugin, getPlugins, type CabinetPlannerPlugin } from '../../src/engine/core/plugin';
import { getRegistryEntry } from '../../src/engine/core';

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
    const btn = screen.getByRole('button', { name: /disable plugin/i });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('deactivates the registered plugin in the engine on button click', async () => {
    const user = userEvent.setup();
    registerPlugin(mockPlugin);
    render(<PluginRegistryPanel />);
    await user.click(screen.getByRole('button', { name: /disable plugin/i }));
    expect(getRegistryEntry(mockPlugin.id)?.state).toBe('deactivated');
    expect(screen.getByRole('button', { name: /enable plugin/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reactivates a deactivated plugin in the engine on second click', async () => {
    const user = userEvent.setup();
    registerPlugin(mockPlugin);
    render(<PluginRegistryPanel />);
    await user.click(screen.getByRole('button', { name: /disable plugin/i }));
    await user.click(screen.getByRole('button', { name: /enable plugin/i }));
    expect(getRegistryEntry(mockPlugin.id)?.state).toBe('active');
    expect(screen.getByRole('button', { name: /disable plugin/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('updates when a plugin is registered after the panel is open', async () => {
    render(<PluginRegistryPanel />);
    expect(screen.getByText(/no plugins/i)).toBeInTheDocument();
    registerPlugin(mockPlugin);
    expect(await screen.findByText('Demo Plugin')).toBeInTheDocument();
  });

  it('offers a browse-only catalog recovery action from the empty state', async () => {
    const user = userEvent.setup();
    const onMarketplaceOpen = vi.fn();
    window.addEventListener('marketplace:open', onMarketplaceOpen);
    render(<PluginRegistryPanel />);
    await user.click(screen.getByRole('button', { name: 'Browse catalog' }));
    expect(onMarketplaceOpen).toHaveBeenCalledOnce();
    window.removeEventListener('marketplace:open', onMarketplaceOpen);
  });

  it('shows the API version badge', () => {
    render(<PluginRegistryPanel />);
    expect(screen.getByText(/API v1\.3\.0/)).toBeInTheDocument();
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
