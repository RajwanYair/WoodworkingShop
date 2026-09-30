import type { Lang } from '../../engine/types';

export function resolveEngineLang(uiLanguage: string): Lang {
  return uiLanguage === 'he' || uiLanguage === 'ar' ? 'he' : 'en';
}
