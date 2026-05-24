/**
 * Tests for Phase 13 / Sprint 8 — BYO AI design assistant utility.
 * Covers pure functions: getAiConfig, setAiConfig, clearAiConfig, buildConfigContext.
 * callAiAssistant tests use fetch mocks to avoid real network calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import {
  getAiConfig,
  setAiConfig,
  clearAiConfig,
  buildConfigContext,
  callAiAssistant,
  DEFAULT_AI_MODELS,
} from '../../src/utils/ai-assistant';
import { DEFAULT_CONFIG } from '../../src/engine/materials';

// ── localStorage stub (jsdom exposes window.localStorage but not bare global) ─
const localStorageStore = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: (k) => localStorageStore.get(k) ?? null,
  setItem: (k, v) => {
    localStorageStore.set(k, String(v));
  },
  removeItem: (k) => {
    localStorageStore.delete(k);
  },
  clear: () => {
    localStorageStore.clear();
  },
  get length() {
    return localStorageStore.size;
  },
  key: (i) => [...localStorageStore.keys()][i] ?? null,
};

beforeAll(() => {
  vi.stubGlobal('localStorage', localStorageMock);
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true, configurable: true });
});

// ── localStorage helpers ──────────────────────────────────────────────────────

describe('getAiConfig / setAiConfig / clearAiConfig', () => {
  beforeEach(() => localStorageMock.clear());
  afterEach(() => localStorageMock.clear());

  it('returns null when nothing is stored', () => {
    expect(getAiConfig()).toBeNull();
  });

  it('round-trips a valid openai config', () => {
    setAiConfig({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-4o' });
    const cfg = getAiConfig();
    expect(cfg?.provider).toBe('openai');
    expect(cfg?.apiKey).toBe('sk-test');
    expect(cfg?.model).toBe('gpt-4o');
  });

  it('round-trips an anthropic config with custom endpoint', () => {
    setAiConfig({ provider: 'anthropic', apiKey: 'ant-key', endpoint: 'https://proxy.example.com' });
    const cfg = getAiConfig();
    expect(cfg?.provider).toBe('anthropic');
    expect(cfg?.endpoint).toBe('https://proxy.example.com');
  });

  it('round-trips an ollama config', () => {
    setAiConfig({ provider: 'ollama', apiKey: '', endpoint: 'http://localhost:11434', model: 'llama3' });
    const cfg = getAiConfig();
    expect(cfg?.provider).toBe('ollama');
    expect(cfg?.endpoint).toBe('http://localhost:11434');
  });

  it('clearAiConfig removes the stored config', () => {
    setAiConfig({ provider: 'openai', apiKey: 'sk-key' });
    clearAiConfig();
    expect(getAiConfig()).toBeNull();
  });

  it('returns null for corrupted localStorage data', () => {
    localStorageMock.setItem('cabinet-planner-ai-config', 'not-json{{{');
    expect(getAiConfig()).toBeNull();
  });

  it('returns null when provider field is invalid', () => {
    localStorageMock.setItem('cabinet-planner-ai-config', JSON.stringify({ provider: 'unknown', apiKey: 'x' }));
    expect(getAiConfig()).toBeNull();
  });
});

// ── buildConfigContext ────────────────────────────────────────────────────────

describe('buildConfigContext', () => {
  it('includes expected structural fields', () => {
    const ctx = buildConfigContext(DEFAULT_CONFIG);
    const obj = JSON.parse(ctx) as Record<string, unknown>;
    expect(obj['furnitureType']).toBeDefined();
    expect(obj['width']).toBeDefined();
    expect(obj['height']).toBeDefined();
    expect(obj['depth']).toBeDefined();
    expect(obj['carcassMaterial']).toBeDefined();
  });

  it('does not include lang field (not structural)', () => {
    const ctx = buildConfigContext(DEFAULT_CONFIG);
    expect(ctx).not.toContain('"lang"');
  });

  it('produces valid JSON', () => {
    expect(() => JSON.parse(buildConfigContext(DEFAULT_CONFIG))).not.toThrow();
  });
});

// ── DEFAULT_AI_MODELS ─────────────────────────────────────────────────────────

describe('DEFAULT_AI_MODELS', () => {
  it('defines a model for openai', () => {
    expect(DEFAULT_AI_MODELS.openai).toBeTruthy();
  });

  it('defines a model for anthropic', () => {
    expect(DEFAULT_AI_MODELS.anthropic).toBeTruthy();
  });

  it('defines a model for ollama', () => {
    expect(DEFAULT_AI_MODELS.ollama).toBeTruthy();
  });
});

// ── callAiAssistant (fetch mock) ──────────────────────────────────────────────

describe('callAiAssistant', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const okOpenAi = { choices: [{ message: { content: 'Try 650mm width.' } }] };
  const okAnthropic = { content: [{ type: 'text', text: 'Consider birch plywood.' }] };
  const okOllama = { message: { content: 'Shelf every 350mm.' } };

  const mockFetch = (body: unknown, status = 200) => {
    vi.mocked(fetch).mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    } as Response);
  };

  it('calls openai endpoint and returns text', async () => {
    mockFetch(okOpenAi);
    const res = await callAiAssistant(
      { provider: 'openai', apiKey: 'sk-test' },
      DEFAULT_CONFIG,
      'What width for a standard kitchen base?',
    );
    expect(res.text).toBe('Try 650mm width.');
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('openai.com'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('calls anthropic endpoint and returns text', async () => {
    mockFetch(okAnthropic);
    const res = await callAiAssistant(
      { provider: 'anthropic', apiKey: 'ant-key' },
      DEFAULT_CONFIG,
      'Best material for a bathroom cabinet?',
    );
    expect(res.text).toBe('Consider birch plywood.');
  });

  it('calls ollama endpoint and returns text', async () => {
    mockFetch(okOllama);
    const res = await callAiAssistant(
      { provider: 'ollama', apiKey: '', endpoint: 'http://localhost:11434' },
      DEFAULT_CONFIG,
      'Shelf spacing recommendation?',
    );
    expect(res.text).toBe('Shelf every 350mm.');
  });

  it('uses custom endpoint for openai when provided', async () => {
    mockFetch(okOpenAi);
    await callAiAssistant(
      { provider: 'openai', apiKey: 'sk', endpoint: 'https://my-proxy.example.com' },
      DEFAULT_CONFIG,
      'Test',
    );
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      'https://my-proxy.example.com/v1/chat/completions',
      expect.anything(),
    );
  });

  it('throws on non-ok response from openai', async () => {
    mockFetch({ error: { message: 'Invalid API key' } }, 401);
    await expect(callAiAssistant({ provider: 'openai', apiKey: 'bad' }, DEFAULT_CONFIG, 'Test')).rejects.toThrow(
      /OpenAI error 401/,
    );
  });

  it('throws on non-ok response from anthropic', async () => {
    mockFetch({ error: 'forbidden' }, 403);
    await expect(callAiAssistant({ provider: 'anthropic', apiKey: 'bad' }, DEFAULT_CONFIG, 'Test')).rejects.toThrow(
      /Anthropic error 403/,
    );
  });

  it('throws on non-ok response from ollama', async () => {
    mockFetch({ error: 'model not found' }, 404);
    await expect(
      callAiAssistant({ provider: 'ollama', apiKey: '', endpoint: 'http://localhost:11434' }, DEFAULT_CONFIG, 'Test'),
    ).rejects.toThrow(/Ollama error 404/);
  });

  it('uses default model when config.model is absent', async () => {
    mockFetch(okOpenAi);
    await callAiAssistant({ provider: 'openai', apiKey: 'sk' }, DEFAULT_CONFIG, 'Test');
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string) as { model: string };
    expect(body.model).toBe(DEFAULT_AI_MODELS.openai);
  });

  it('uses overridden model when config.model is set', async () => {
    mockFetch(okOpenAi);
    await callAiAssistant({ provider: 'openai', apiKey: 'sk', model: 'gpt-4o' }, DEFAULT_CONFIG, 'Test');
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string) as { model: string };
    expect(body.model).toBe('gpt-4o');
  });
});
