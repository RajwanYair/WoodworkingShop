---
mode: agent
tools:
  - read_file
  - replace_string_in_file
  - run_in_terminal
  - grep_search
---

# Content Security Policy Hardening

## Goal

Harden `public/_headers` (Cloudflare Pages) with a strict CSP that:

- Blocks XSS via `default-src 'self'`
- Removes `unsafe-eval` and `unsafe-inline` where possible
- Adds `Trusted Types` policy if browser support allows
- Preserves all app functionality (PDF, Web Workers, Vite dev server)

## Steps

### 1 — Read current headers

```bash
cat public/_headers
```

### 2 — Identify what CSP directives are needed

| Source type                | Required directive                 |
| -------------------------- | ---------------------------------- |
| React app JS               | `script-src 'self'`                |
| Tailwind CSS (inline vars) | `style-src 'self' 'unsafe-inline'` |
| Web Workers                | `worker-src 'self' blob:`          |
| PDF generation (Worker)    | `worker-src 'self' blob:`          |
| Fonts (if any CDN)         | `font-src 'self'`                  |
| Manifest / PWA             | `manifest-src 'self'`              |

### 3 — Apply to `public/_headers`

```text
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; img-src 'self' data: blob:; font-src 'self'; manifest-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
```

### 4 — Verify app still works

Build and serve locally:

```bash
npm run build && npx serve dist -l 4173
```

Open browser DevTools → Console for CSP violations.

### 5 — Verify with Lighthouse

```bash
node scripts/lighthouse.js
```

CSP issues appear in the Best Practices category.

### 6 — Document

Add entry to `CHANGELOG.md [Unreleased]`:

```markdown
### Security

- Hardened CSP headers in `public/_headers` — removes unsafe-eval, adds frame-ancestors deny
```

## Output contract

1. List all files changed.
2. List verification commands executed.
3. Report acceptance criteria as pass/fail.
4. Report unresolved risks or follow-up items.
