import { useState, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useCabinetStore } from '../../store/cabinet-store';
import { evaluateNamedParameters } from '../../engine/parameter-expressions';
import type { NamedExpression } from '../../store/slices/namedExpressionsSlice';

const NAME_PATTERN = /^[a-z_]\w*$/i;
const MAX_NAME_LENGTH = 32;
const MAX_EXPR_LENGTH = 256;

/**
 * NamedExpressionsPanel — Sprint 296
 *
 * Lets users define formula-based named expressions for parametric dimensions,
 * e.g. `shelf_gap = height / (shelfCount + 1)`. The panel evaluates expressions
 * live and shows computed values + per-expression errors so users can see the
 * output before applying values to config fields.
 */
export function NamedExpressionsPanel() {
  const { t } = useTranslation();
  const { namedExpressions, expressionErrors, setNamedExpression, removeNamedExpression, clearExpressionErrors } =
    useCabinetStore();
  const { config } = useCabinetStore();

  const [draftName, setDraftName] = useState('');
  const [draftExpr, setDraftExpr] = useState('');
  const [addError, setAddError] = useState('');

  const nameInputId = useId();
  const exprInputId = useId();

  // Compute current values using the active config dimensions as base values.
  const baseValues: Record<string, number> = {
    width: config.width,
    height: config.height,
    depth: config.depth,
    shelfCount: config.shelfCount,
    doorCount: config.doorCount,
    drawerCount: config.drawerCount,
    kickHeight: config.kickHeight ?? 0,
  };

  const definitions: Record<string, string> = Object.fromEntries(namedExpressions.map((e) => [e.name, e.expression]));

  let resolvedValues: Record<string, number> = {};
  let evalError = '';
  try {
    const result = evaluateNamedParameters(definitions, baseValues);
    resolvedValues = result.values;
  } catch (err) {
    evalError = err instanceof Error ? err.message : String(err);
  }

  function validateDraft(): string | null {
    const name = draftName.trim();
    const expr = draftExpr.trim();
    if (!name) return t('namedExpressions.errorNameRequired');
    if (!NAME_PATTERN.test(name)) return t('namedExpressions.errorNameInvalid');
    if (name.length > MAX_NAME_LENGTH) return t('namedExpressions.errorNameTooLong');
    if (!expr) return t('namedExpressions.errorExprRequired');
    if (expr.length > MAX_EXPR_LENGTH) return t('namedExpressions.errorExprTooLong');
    return null;
  }

  function handleAdd() {
    const err = validateDraft();
    if (err) {
      setAddError(err);
      return;
    }
    const entry: NamedExpression = { name: draftName.trim(), expression: draftExpr.trim() };
    setNamedExpression(entry);
    clearExpressionErrors();
    setDraftName('');
    setDraftExpr('');
    setAddError('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <section aria-label={t('namedExpressions.panelLabel')} className="space-y-4">
      <h3 className="text-wood-700 dark:text-wood-300 text-sm font-semibold">{t('namedExpressions.title')}</h3>
      <p className="text-wood-500 dark:text-wood-400 text-xs">{t('namedExpressions.description')}</p>

      {/* Existing expressions list */}
      {namedExpressions.length > 0 && (
        <ul className="space-y-2" aria-label={t('namedExpressions.listLabel')}>
          {namedExpressions.map((expr) => {
            const value = resolvedValues[expr.name];
            const error = expressionErrors[expr.name] ?? (evalError.includes(expr.name) ? evalError : '');
            return (
              <li
                key={expr.name}
                className="border-wood-200 bg-wood-50 dark:border-wood-700 dark:bg-wood-900 flex items-start gap-2 rounded-md border px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-wood-800 dark:text-wood-200 font-mono text-xs font-semibold">{expr.name}</span>
                  <span className="text-wood-400 mx-1 text-xs">=</span>
                  <span className="text-wood-600 dark:text-wood-400 font-mono text-xs">{expr.expression}</span>
                  {value !== undefined && !error && (
                    <span
                      className="ms-2 font-mono text-xs font-medium text-green-700 dark:text-green-400"
                      aria-label={t('namedExpressions.resolvedValue', { name: expr.name, value })}
                    >
                      → {value.toFixed(2)}
                    </span>
                  )}
                  {error && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                      {error}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeNamedExpression(expr.name)}
                  className="text-wood-400 shrink-0 rounded p-1 hover:text-red-500 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
                  aria-label={t('namedExpressions.remove', { name: expr.name })}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {namedExpressions.length === 0 && <p className="text-wood-400 text-xs italic">{t('namedExpressions.empty')}</p>}

      {/* Add new expression */}
      <div className="border-wood-300 dark:border-wood-600 space-y-2 rounded-md border border-dashed p-3">
        <p className="text-wood-600 dark:text-wood-300 text-xs font-medium">{t('namedExpressions.addTitle')}</p>
        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor={nameInputId} className="text-wood-500 mb-1 block text-xs">
              {t('namedExpressions.nameLabel')}
            </label>
            <input
              id={nameInputId}
              type="text"
              value={draftName}
              onChange={(e) => {
                setDraftName(e.target.value);
                setAddError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder={t('namedExpressions.namePlaceholder')}
              className="border-wood-300 text-wood-800 focus:border-wood-500 focus:ring-wood-500 dark:border-wood-600 dark:bg-wood-900 dark:text-wood-200 w-full rounded border bg-white px-2 py-1 font-mono text-xs focus:ring-1 focus:outline-none"
              aria-describedby={addError ? `${nameInputId}-error` : undefined}
              maxLength={MAX_NAME_LENGTH}
            />
          </div>
          <div className="flex-2">
            <label htmlFor={exprInputId} className="text-wood-500 mb-1 block text-xs">
              {t('namedExpressions.exprLabel')}
            </label>
            <input
              id={exprInputId}
              type="text"
              value={draftExpr}
              onChange={(e) => {
                setDraftExpr(e.target.value);
                setAddError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder={t('namedExpressions.exprPlaceholder')}
              className="border-wood-300 text-wood-800 focus:border-wood-500 focus:ring-wood-500 dark:border-wood-600 dark:bg-wood-900 dark:text-wood-200 w-full rounded border bg-white px-2 py-1 font-mono text-xs focus:ring-1 focus:outline-none"
              aria-describedby={addError ? `${nameInputId}-error` : undefined}
              maxLength={MAX_EXPR_LENGTH}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAdd}
              className="bg-wood-600 hover:bg-wood-700 focus-visible:ring-wood-500 rounded px-3 py-1 text-xs font-medium text-white focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
            >
              {t('namedExpressions.add')}
            </button>
          </div>
        </div>
        {addError && (
          <p id={`${nameInputId}-error`} className="text-xs text-red-600 dark:text-red-400" role="alert">
            {addError}
          </p>
        )}
        <p className="text-wood-400 dark:text-wood-500 text-xs">{t('namedExpressions.hint')}</p>
      </div>
    </section>
  );
}
