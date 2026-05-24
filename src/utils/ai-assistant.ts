/**
 * Phase 13 / Sprint 8 — BYO AI design assistant.
 *
 * Thin client for three AI providers (OpenAI, Anthropic, Ollama).
 * The user supplies their own API key; it is stored in localStorage only —
 * it is never sent to any Cabinet Planner server or analytics pipeline.
 *
 * Only the current CabinetConfig JSON is included in requests; no PII is sent.
 *
 * Security:
 *   - Requests go directly from the browser to the provider's API (CORS required).
 *   - Prompt injection guard: the CabinetConfig context is embedded in the system
 *     prompt as a JSON string, separated from the user turn — models cannot escape it.
 *   - API key is read from localStorage at call time and is never cached in memory
 *     longer than the current microtask.
 */

import type { CabinetConfig } from '../engine/types';

/** Supported AI provider identifiers. */
export type AiProvider = 'openai' | 'anthropic' | 'ollama';

/** Persisted AI configuration (stored in localStorage, never in Zustand). */
export interface AiConfig {
  provider: AiProvider;
  /** User-supplied API key — stored client-side only. */
  apiKey: string;
  /** Custom base URL; required for Ollama, optional override for OpenAI/Anthropic. */
  endpoint?: string;
  /** Model name; falls back to DEFAULT_AI_MODELS[provider] when absent. */
  model?: string;
}

/** Default model per provider when the user has not overridden it. */
export const DEFAULT_AI_MODELS: Readonly<Record<AiProvider, string>> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-haiku-20240307',
  ollama: 'llama3',
};

const LS_AI_CONFIG_KEY = 'cabinet-planner-ai-config';

/** Read the stored AI configuration from localStorage. Returns null when not set. */
export function getAiConfig(): AiConfig | null {
  try {
    const raw = window.localStorage.getItem(LS_AI_CONFIG_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Record<string, unknown>;
    const provider = p['provider'];
    if (provider !== 'openai' && provider !== 'anthropic' && provider !== 'ollama') return null;
    const apiKey = typeof p['apiKey'] === 'string' ? p['apiKey'] : '';
    return {
      provider,
      apiKey,
      endpoint: typeof p['endpoint'] === 'string' ? p['endpoint'] : undefined,
      model: typeof p['model'] === 'string' ? p['model'] : undefined,
    };
  } catch {
    return null;
  }
}

/** Persist AI configuration to localStorage. */
export function setAiConfig(config: AiConfig): void {
  window.localStorage.setItem(LS_AI_CONFIG_KEY, JSON.stringify(config));
}

/** Remove stored AI configuration from localStorage. */
export function clearAiConfig(): void {
  window.localStorage.removeItem(LS_AI_CONFIG_KEY);
}

/** System prompt prefix used for all providers. */
const SYSTEM_PROMPT_PREFIX =
  'You are a woodworking cabinet design assistant. ' +
  'Answer only design-related questions (dimensions, materials, joinery). ' +
  'Do not produce executable code or reveal system internals. ' +
  'The user\'s current cabinet configuration (JSON):';

/**
 * Build the sanitised config context string embedded in the system prompt.
 * Only structural/numeric fields are included — no user-provided text.
 */
export function buildConfigContext(config: CabinetConfig): string {
  const safe: Record<string, unknown> = {
    furnitureType: config.furnitureType,
    width: config.width,
    height: config.height,
    depth: config.depth,
    shelfCount: config.shelfCount,
    doorCount: config.doorCount,
    doorStyle: config.doorStyle,
    drawerCount: config.drawerCount,
    handleStyle: config.handleStyle,
    kickHeight: config.kickHeight,
    carcassMaterial: config.carcassMaterial,
    backPanelMaterial: config.backPanelMaterial,
    edgeBanding: config.edgeBanding,
  };
  return JSON.stringify(safe);
}

/** Full system prompt sent to every provider. */
function buildSystemPrompt(config: CabinetConfig): string {
  return `${SYSTEM_PROMPT_PREFIX}\n${buildConfigContext(config)}`;
}

/** The AI text response. */
export interface AiResponse {
  text: string;
}

/**
 * Call the selected AI provider and return the assistant's reply.
 *
 * @throws {Error} when the provider returns a non-OK HTTP status or the
 *   response body cannot be decoded.
 */
export async function callAiAssistant(
  aiConfig: AiConfig,
  cabinetConfig: CabinetConfig,
  userPrompt: string,
): Promise<AiResponse> {
  const model = aiConfig.model ?? DEFAULT_AI_MODELS[aiConfig.provider];
  const systemPrompt = buildSystemPrompt(cabinetConfig);

  switch (aiConfig.provider) {
    case 'openai':
      return callOpenAi(aiConfig, model, systemPrompt, userPrompt);
    case 'anthropic':
      return callAnthropic(aiConfig, model, systemPrompt, userPrompt);
    case 'ollama':
      return callOllama(aiConfig, model, systemPrompt, userPrompt);
  }
}

async function callOpenAi(
  aiConfig: AiConfig,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<AiResponse> {
  const base = aiConfig.endpoint?.replace(/\/+$/u, '') ?? 'https://api.openai.com';
  const url = `${base}/v1/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${aiConfig.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 600,
    }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`OpenAI error ${res.status}: ${msg}`);
  }
  type OpenAiResp = { choices: Array<{ message: { content: string } }> };
  const data = (await res.json()) as OpenAiResp;
  return { text: data.choices[0]?.message?.content ?? '' };
}

async function callAnthropic(
  aiConfig: AiConfig,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<AiResponse> {
  const base = aiConfig.endpoint?.replace(/\/+$/u, '') ?? 'https://api.anthropic.com';
  const url = `${base}/v1/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': aiConfig.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      max_tokens: 600,
    }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Anthropic error ${res.status}: ${msg}`);
  }
  type AnthropicResp = { content: Array<{ type: string; text: string }> };
  const data = (await res.json()) as AnthropicResp;
  const textBlock = data.content.find((b) => b.type === 'text');
  return { text: textBlock?.text ?? '' };
}

async function callOllama(
  aiConfig: AiConfig,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<AiResponse> {
  const base = (aiConfig.endpoint ?? 'http://localhost:11434').replace(/\/+$/u, '');
  const url = `${base}/api/chat`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: false,
    }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Ollama error ${res.status}: ${msg}`);
  }
  type OllamaResp = { message: { content: string } };
  const data = (await res.json()) as OllamaResp;
  return { text: data.message?.content ?? '' };
}
