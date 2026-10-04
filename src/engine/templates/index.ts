export {
  TEMPLATE_CATALOGUE,
  getTemplatesByCategory,
  getTemplate,
  instantiateTemplate as instantiateLibraryTemplate,
  listTemplateIds,
} from './library';
export type {
  TemplateCategory,
  TemplateDimensions,
  CabinetTemplate,
  TemplateInstance as LibraryTemplateInstance,
} from './library';

export {
  validateTemplate,
  instantiateTemplate as instantiateParametricTemplate,
  getDefaultValues,
  getParamDependencies,
  evaluateExpression,
  MAX_PARAMS,
  MAX_RULES,
  MAX_COMPUTED,
  MAX_EXPRESSION_LENGTH,
} from './parametric';
export type {
  ParamType,
  NumberConstraint,
  ParamDefBase,
  NumberParamDef,
  BooleanParamDef,
  ChoiceParamDef,
  ParamDef,
  ConditionalRule,
  ComputedField,
  ParametricTemplate,
  ParamValues,
  TemplateInstance as ParametricTemplateInstance,
  TemplateValidationError,
  TemplateValidationResult,
} from './parametric';

export {
  getTemplate as getCabinetTemplate,
  getTemplatesByCategory as getCabinetTemplatesByCategory,
  instantiateTemplate as instantiateCabinetTemplate,
  BUILT_IN_TEMPLATES,
} from './cabinet';
export type {
  CabinetCategory,
  DimensionConstraint as CabinetDimensionConstraint,
  CabinetTemplate as BuiltInCabinetTemplate,
  ValidationError as CabinetValidationError,
  TemplateParams,
  TemplateInstance as CabinetTemplateInstance,
} from './cabinet';

export {
  TEMPLATES,
  getTemplate as getConfiguratorTemplate,
  instantiateTemplate as instantiateConfiguratorTemplate,
  getTemplateDefaults as getConfiguratorTemplateDefaults,
  evaluateTemplateExpr,
} from './configurator';
export type { CabinetTemplate as ConfiguratorCabinetTemplate } from './configurator';
