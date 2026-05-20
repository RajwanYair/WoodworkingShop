# 🔐 Security Policy

<div align="center">
  <img src="../docs/banner.svg" alt="Cabinet Planner" width="100%"/>
</div>

[![Security: Responsible Disclosure](https://img.shields.io/badge/security-responsible%20disclosure-brightgreen)](SECURITY.md)

## 📋 Supported Versions

| Version | Supported        | Notes                                      |
| ------- | ---------------- | ------------------------------------------ |
| **3.x** | ✅ Active        | Current release — patches issued as needed |
| 2.x     | ⚠️ Critical only | Security-critical fixes only               |
| < 2.0   | ❌ End of life   | No longer supported                        |

## 🚨 Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

1. Email the maintainer with subject `[SECURITY] WoodworkingShop — <brief description>`
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes or patches

**Response timeline:**

| Step                           | Target                 |
| ------------------------------ | ---------------------- |
| Initial acknowledgement        | ≤ 48 hours             |
| Triage and severity assessment | ≤ 5 business days      |
| Fix or mitigation              | ≤ 30 days for critical |
| Public disclosure              | After fix is released  |

## 🛡 Security Best Practices for Contributors

### Code

- **No hardcoded credentials** — never commit passwords, API keys, or tokens
- **Input validation** — validate all user-supplied values at system boundaries (config dimensions, material names)
- **No `eval` / dynamic code** — this is a pure-client SPA; avoid any dynamic code execution
- **Sanitise SVG output** — exported SVGs must not embed user-controlled scripts

### Dependencies

- Dependabot is configured to open PRs for dependency updates weekly
- Review security advisories before merging dependency updates
- Run `npm audit` to check for known vulnerabilities

## ✅ Security Checklist for PRs

- [ ] No hardcoded credentials or tokens in code
- [ ] All user input validated and clamped before use
- [ ] No new `eval`, `Function()`, or `innerHTML` with user content
- [ ] `npm audit` reports no new high/critical issues
- [ ] Dependencies added are necessary and from trusted sources

## ♿ Accessibility Security Stance — v3.54.0

Accessibility violations are treated as **quality-blocking issues** in this project. The following measures ensure WCAG 2.2 AA compliance is maintained:

| Gate              | Details                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **axe-core CI**   | `@axe-core/playwright` runs on every PR. Any WCAG 2.1 AA violation fails the pipeline with a named assertion error.                         |
| **Lighthouse CI** | Performance and accessibility categories are gated via `config/lighthouserc.json`. `categories:accessibility` must be ≥ 0.90 (error-level). |
| **PR checklist**  | Contributors are asked to run the app with keyboard-only navigation and a screen reader on any UI change.                                   |

### Reporting Accessibility Issues

Accessibility barriers that affect users with disabilities are treated as **security-equivalent defects** — they restrict access and can violate applicable law (e.g. WCAG, ADA, EN 301 549).

- Report via a **public GitHub issue** tagged `accessibility` (unlike security vulnerabilities, a11y issues may be reported publicly)
- Include: browser/OS, assistive technology used, steps to reproduce, WCAG criterion affected
- Target resolution: ≤ 14 days for Level A violations, ≤ 30 days for Level AA
