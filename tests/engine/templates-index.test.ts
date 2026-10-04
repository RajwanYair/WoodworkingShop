import { describe, expect, it } from 'vitest';
import {
  BUILT_IN_TEMPLATES,
  getCabinetTemplate,
  getConfiguratorTemplate,
  getTemplate,
  instantiateCabinetTemplate,
  instantiateConfiguratorTemplate,
  instantiateLibraryTemplate,
  instantiateParametricTemplate,
  TEMPLATE_CATALOGUE,
  TEMPLATES,
} from '../../src/engine/templates/index';
import type {
  BuiltInCabinetTemplate,
  ConfiguratorCabinetTemplate,
  LibraryTemplateInstance,
  ParametricTemplateInstance,
} from '../../src/engine/templates/index';

describe('templates domain barrel', () => {
  it('exports each template family under distinct names', () => {
    const configuratorTemplate: ConfiguratorCabinetTemplate | undefined = getConfiguratorTemplate('kitchen-base');
    const libraryTemplate = getTemplate('base-single-door');
    const cabinetTemplate: BuiltInCabinetTemplate | undefined = getCabinetTemplate('base-standard');

    expect(configuratorTemplate?.config.width).toBe(600);
    expect(libraryTemplate?.defaults.widthMm).toBe(600);
    expect(cabinetTemplate?.width.default).toBe(600);
    expect(TEMPLATES.length).toBeGreaterThan(0);
    expect(Object.keys(TEMPLATE_CATALOGUE)).toContain('base-single-door');
    expect(BUILT_IN_TEMPLATES.map((template) => template.id)).toContain('base-standard');
  });

  it('keeps family-specific instantiation results distinct', () => {
    const libraryInstance: LibraryTemplateInstance | undefined = instantiateLibraryTemplate('base-single-door');
    const cabinetInstance = instantiateCabinetTemplate('base-standard');
    const configuratorInstance = instantiateConfiguratorTemplate(getConfiguratorTemplate('kitchen-base')!);
    const parametricInstance: ParametricTemplateInstance = instantiateParametricTemplate({
      id: 'barrel-test',
      name: 'Barrel test',
      description: '',
      category: 'base',
      version: '1',
      params: [],
      rules: [],
      computed: [],
    });

    expect(libraryInstance?.widthMm).toBe(600);
    expect(cabinetInstance.width).toBe(600);
    expect(configuratorInstance.width).toBe(600);
    expect(parametricInstance.templateId).toBe('barrel-test');
  });
});
