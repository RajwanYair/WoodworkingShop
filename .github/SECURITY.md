<div align="center">
  <img src="../docs/banner.svg" alt="Cabinet Planner" width="100%"/>
</div>

# 🔐 Security Policy

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
