---
applyTo: src/**,public/**
---

# Security Instructions — Cabinet Planner

Rules enforced for every source and public file.

## OWASP A01 — Broken Access Control

- All URL params, localStorage values, and IndexedDB reads are validated with
  a type guard before use. Never assume shape.
- The Plugin API `PluginContext` exposes only a read-only view of state.
  No direct store `set()` access from plugin code.

## OWASP A03 — Injection

- **No `dangerouslySetInnerHTML`** in React components. All user content must
  go through React's auto-escaping JSX.
- **No `eval()`**, `new Function()`, or `setTimeout(string)`.
- G-code and DXF export strings must strip control characters from user-supplied
  text (part names, labels) before embedding in output.
- URL state deserialization: parse JSON, validate with type guard, never exec.

## OWASP A05 — Security Misconfiguration

- `public/_headers` must include:

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=()
```

- No `unsafe-eval` or `unsafe-inline` in CSP script-src unless justified with
  an inline JSDoc comment referencing the specific Vite/React requirement.

## OWASP A06 — Vulnerable Components

- Run `npm audit --audit-level=moderate` before every release.
- Dependencies must not have known CVEs at `high` or `critical` severity.
- Do not add: `@supabase/supabase-js`, `valibot`, `zod` — not in this project.

## OWASP A08 — Integrity Failures

- No remote script/style tags added to `index.html` without SRI hash.
- Service worker (`public/sw.js` / Workbox) must not cache cross-origin
  resources or execute untrusted code.

## Secrets hygiene

- No API keys, tokens, passwords, or secrets in source files.
- Environment variables accessed only via `import.meta.env.VITE_*`.
- `.github/.gitleaks.toml` guards the repository; do not disable rules.

## localStorage / session storage

- Store only non-sensitive config (dimensions, layout preferences).
- Never store auth tokens, user PII, or financial data in browser storage.
- Always stringify with `JSON.stringify` and parse with try/catch + type guard.
