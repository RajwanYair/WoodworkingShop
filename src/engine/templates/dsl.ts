/**
 * template-dsl.ts — Phase 17.3 / E6
 *
 * Extracted from templates.ts: the hand-rolled recursive-descent DSL
 * parser/evaluator used by `instantiateTemplate()` to compute parametric
 * fields (e.g. `"Math.floor(internalHeight / 350)"`).
 *
 * Deliberately avoids eval() and Function() to satisfy the OWASP injection
 * constraint.  Only arithmetic (+−×÷), parentheses, number literals, and
 * Math.{floor|ceil|round|min|max|abs|trunc} are permitted.
 */

// ── Phase 13 / Sprint 4 — Parametric templates v2: DSL evaluator ─────────────

type _DslToken =
  | { k: 'num'; v: number }
  | { k: 'id'; v: string }
  | { k: 'op'; v: string }
  | { k: 'lp' }
  | { k: 'rp' }
  | { k: 'comma' }
  | { k: 'dot' };

function _tokenize(expr: string): _DslToken[] {
  const toks: _DslToken[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/\d/.test(ch)) {
      let s = '';
      while (i < expr.length && /[\d.]/.test(expr[i])) s += expr[i++];
      toks.push({ k: 'num', v: parseFloat(s) });
      continue;
    }
    if (/[a-z_]/i.test(ch)) {
      let s = '';
      while (i < expr.length && /\w/.test(expr[i])) s += expr[i++];
      toks.push({ k: 'id', v: s });
      continue;
    }
    if ('+-*/'.includes(ch)) {
      toks.push({ k: 'op', v: ch });
      i++;
      continue;
    }
    if (ch === '(') {
      toks.push({ k: 'lp' });
      i++;
      continue;
    }
    if (ch === ')') {
      toks.push({ k: 'rp' });
      i++;
      continue;
    }
    if (ch === ',') {
      toks.push({ k: 'comma' });
      i++;
      continue;
    }
    if (ch === '.') {
      toks.push({ k: 'dot' });
      i++;
      continue;
    }
    throw new Error(`DSL: unexpected char '${ch}'`);
  }
  return toks;
}

const _MATH_FNS = new Set<string>(['floor', 'ceil', 'round', 'min', 'max', 'abs', 'trunc']);

function _expr(toks: _DslToken[], p: number, ctx: Record<string, number>): [number, number] {
  let [lhs, pos] = _term(toks, p, ctx);
  while (pos < toks.length) {
    const t = toks[pos];
    if (t.k !== 'op' || (t.v !== '+' && t.v !== '-')) break;
    const [rhs, pos2] = _term(toks, pos + 1, ctx);
    lhs = t.v === '+' ? lhs + rhs : lhs - rhs;
    pos = pos2;
  }
  return [lhs, pos];
}

function _term(toks: _DslToken[], p: number, ctx: Record<string, number>): [number, number] {
  let [lhs, pos] = _unary(toks, p, ctx);
  while (pos < toks.length) {
    const t = toks[pos];
    if (t.k !== 'op' || (t.v !== '*' && t.v !== '/')) break;
    const [rhs, pos2] = _unary(toks, pos + 1, ctx);
    lhs = t.v === '*' ? lhs * rhs : lhs / rhs;
    pos = pos2;
  }
  return [lhs, pos];
}

function _unary(toks: _DslToken[], p: number, ctx: Record<string, number>): [number, number] {
  const t = toks[p];
  if (t?.k === 'op' && t.v === '-') {
    const [v, pos] = _primary(toks, p + 1, ctx);
    return [-v, pos];
  }
  return _primary(toks, p, ctx);
}

function _primary(toks: _DslToken[], p: number, ctx: Record<string, number>): [number, number] {
  const t = toks[p];
  if (!t) throw new Error('DSL: unexpected end of expression');
  if (t.k === 'num') return [t.v, p + 1];
  if (t.k === 'lp') {
    const [v, pos] = _expr(toks, p + 1, ctx);
    if (toks[pos]?.k !== 'rp') throw new Error('DSL: expected )');
    return [v, pos + 1];
  }
  if (t.k === 'id') {
    const name = t.v;
    const t1 = toks[p + 1];
    const t2 = toks[p + 2];
    const t3 = toks[p + 3];
    if (name === 'Math' && t1?.k === 'dot' && t2?.k === 'id') {
      const fn = t2.v;
      if (!_MATH_FNS.has(fn)) throw new Error(`DSL: Math.${fn} is not permitted`);
      if (t3?.k !== 'lp') throw new Error(`DSL: expected ( after Math.${fn}`);
      const args: number[] = [];
      let pos = p + 4;
      if (toks[pos]?.k !== 'rp') {
        const [a1, pos1] = _expr(toks, pos, ctx);
        args.push(a1);
        pos = pos1;
        while (toks[pos]?.k === 'comma') {
          const [aN, posN] = _expr(toks, pos + 1, ctx);
          args.push(aN);
          pos = posN;
        }
      }
      if (toks[pos]?.k !== 'rp') throw new Error(`DSL: expected ) after Math.${fn} args`);
      type AllowedFn = 'floor' | 'ceil' | 'round' | 'min' | 'max' | 'abs' | 'trunc';
      const mathFn = Math[fn as AllowedFn] as (...a: number[]) => number;
      return [mathFn(...args), pos + 1];
    }
    if (!(name in ctx)) throw new Error(`DSL: unknown variable '${name}'`);
    return [ctx[name], p + 1];
  }
  throw new Error(`DSL: unexpected token type '${t.k}'`);
}

/**
 * Evaluate a constrained arithmetic expression against a numeric context.
 * Safe alternative to eval() — only supports numbers, arithmetic, parentheses,
 * and Math.{floor|ceil|round|min|max|abs|trunc}.
 * @throws {Error} on disallowed constructs, unknown variables, or syntax errors.
 */
export function evaluateTemplateExpr(expr: string, ctx: Record<string, number>): number {
  const toks = _tokenize(expr);
  const [value, pos] = _expr(toks, 0, ctx);
  if (pos !== toks.length) throw new Error('DSL: trailing tokens after expression');
  return value;
}
