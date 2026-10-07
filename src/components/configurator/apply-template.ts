import { getConfiguratorTemplate } from '../../engine/templates';
import { useCabinetStore } from '../../store/cabinet-store';

export function applyCabinetTemplate(templateId: string): boolean {
  const template = getConfiguratorTemplate(templateId);
  if (!template) return false;

  useCabinetStore.getState().setConfig(template.config);
  const url = new URL(window.location.href);
  url.searchParams.set('tpl', templateId);
  window.history.replaceState(null, '', `${url.pathname}?${url.searchParams.toString()}`);
  return true;
}
