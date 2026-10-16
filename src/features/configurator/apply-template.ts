import { getConfiguratorTemplate, TEMPLATES } from '../../engine/project/templates/index';
import { useCabinetStore } from '../../store/cabinet-store';
import { setBrowserQueryParam } from '../../store/platform-boundary';

export { TEMPLATES };

export function applyCabinetTemplate(templateId: string): boolean {
  const template = getConfiguratorTemplate(templateId);
  if (!template) return false;

  useCabinetStore.getState().setConfig(template.config);
  setBrowserQueryParam('tpl', templateId);
  return true;
}
