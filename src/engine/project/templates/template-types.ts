import type { CabinetConfig } from '../../core/contracts/index';

/** Built-in configurator template. Expressions are evaluated after size overrides. */
export interface CabinetTemplate {
  id: string;
  name: { en: string; he: string };
  description: { en: string; he: string };
  icon: string;
  config: CabinetConfig;
  /**
   * Optional map of CabinetConfig field name → arithmetic expression string.
   * Evaluated by `instantiateTemplate()` after size overrides are applied.
   * Expressions may reference any numeric CabinetConfig field plus:
   *   - `internalHeight` = height − kickHeight − 36  (approx top+bottom panels)
   *   - `internalWidth`  = width  − 36               (approx left+right sides)
   * Only arithmetic (+−×÷), parentheses, number literals, and
   * Math.{floor|ceil|round|min|max|abs|trunc} are permitted.
   * @example { shelfCount: "Math.floor(internalHeight / 350)" }
   */
  readonly computedFields?: Readonly<Record<string, string>>;
}
