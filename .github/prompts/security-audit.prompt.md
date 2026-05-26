---
mode: agent
description: OWASP Top 10 security audit — scan for vulnerabilities, fix them, and document mitigations.
---

# Security Audit

You are performing a security audit of the Cabinet Planner project against the OWASP Top 10 for client-side SPAs.

## Scope

This is a pure client-side SPA — no server, no database, no authentication. Relevant OWASP categories:

| Category                  | Relevant risks for this app                                       |
| ------------------------- | ----------------------------------------------------------------- |
| A03 Injection             | XSS via `dangerouslySetInnerHTML`, user-supplied SVG, plugin eval |
| A05 Misconfiguration      | CSP headers, CORS, exposed secrets in env vars                    |
| A06 Vulnerable Components | Outdated deps with known CVEs                                     |
| A08 Integrity Failures    | Build artifact tampering, unsigned releases                       |
| A09 Logging               | Console leaking sensitive data in production                      |

## Step 1 — Dependency audit

```bash
npm audit --audit-level=moderate 2>&1
```

Fix all `high` and `critical` findings. For `moderate`, evaluate and document.

## Step 2 — Static analysis

```bash
npm run lint 2>&1              # ESLint for JS security patterns
cat public/_headers             # verify CSP headers are present
```

Check for:

- `dangerouslySetInnerHTML` usage → must sanitize with DOMPurify if unavoidable
- `eval()`, `new Function()`, `setTimeout(string)` → forbidden
- `localStorage` storing sensitive data → flag for review
- `window.location.href = userInput` → verify input is sanitized

## Step 3 — Plugin security

The plugin system (`src/engine/plugin.ts`) accepts user-supplied code/config:

- Verify plugin execution is sandboxed (no direct `eval`)
- Verify plugin manifest schema is validated before execution
- Verify plugin API surface is documented and limited

## Step 4 — Build integrity

- SBOM is generated during release (`sbom.json`) — verify it is present in release artifacts
- Check `public/_headers` for `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`

## Step 5 — Fix and document

For each finding:

1. Fix the root cause (never suppress lint rules to hide it)
2. Add a comment explaining the mitigation if the fix is non-obvious

## Output

Report findings with:

- Severity: Critical / High / Medium / Low / Info
- Location: file + line
- Description: what the vulnerability is
- Fix applied: what was changed
