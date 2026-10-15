import type { TFunction, TOptions } from 'i18next';

/** Translator that accepts runtime keys and still shows a missing key instead of hiding it. */
export type StringTranslator = (key: string, options?: Record<string, unknown>) => string;

export function translateKey(t: TFunction, key: string, options?: TOptions): string {
  return t(key, { ...options, defaultValue: key });
}

export function asStringTranslator(t: TFunction): StringTranslator {
  return (key, options) => translateKey(t, key, options);
}
