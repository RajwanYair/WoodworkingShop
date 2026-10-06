---
description: "Run an OWASP Top 10 security audit against any project. Use when: preparing a release, reviewing security posture, auditing dependencies, or responding to a CVE. Covers automated scans + manual checklist."
---

# Security Audit Skill

Reusable OWASP Top 10 security audit procedure for any project in the MyScripts workspace.

## Step 1 — Identify Threat Model

Before auditing, classify the project:

| Project Type        | Relevant OWASP Categories | Not Applicable         |
|---------------------|---------------------------|------------------------|
| Static PWA          | A03, A05, A06, A08        | A01, A04, A07, A10     |
| CLI tool            | A03, A06, A08             | A01, A04, A05, A07     |
| Web API / server    | All (A01–A10)             | —                      |
| Library / package   | A03, A06, A08             | A01, A04, A05, A07     |

## Step 2 — Automated Scans

Run all applicable checks — all must exit 0:

```powershell
# Dependency audit
npm audit --audit-level=high          # Node.js
pip-audit                             # Python

# Lint (security rules)
npx eslint src tests --max-warnings 0  # JS/TS
ruff check src tests                   # Python

# Type safety
npx tsc --noEmit                       # TypeScript
mypy src                               # Python

# Supply chain
npm audit signatures                   # Sigstore verification
```

## Step 3 — Code Review Patterns

Search for these anti-patterns in the codebase:

| Anti-Pattern              | Search                                      | Fix                              |
|---------------------------|----------------------------------------------|----------------------------------|
| XSS via innerHTML         | `grep_search("innerHTML")`                   | Use `textContent`                |
| eval / Function           | `grep_search("eval\|new Function")`          | Refactor to safe alternative     |
| Hardcoded secrets         | `grep_search("password\|secret\|token\|key")` | Move to env vars / vault        |
| Shell injection           | `grep_search("shell=True\|exec(")`          | Use parameterized commands       |
| SQL injection             | `grep_search("f\".*SELECT\|format.*SELECT")` | Use parameterized queries       |
| Unpinned Actions          | Check `.github/workflows/*.yml`              | Pin to full SHA                  |
| Debug in production       | `grep_search("console.log\|print(")`        | Use structured logging           |

## Step 4 — Dependency Health

- [ ] No HIGH/CRITICAL CVEs in direct dependencies
- [ ] Renovate or Dependabot configured for automatic updates
- [ ] Lock file committed and up to date
- [ ] GitHub Actions pinned to full 40-char SHAs

## Step 5 — Report

For each finding:

| Field       | Content                              |
|-------------|--------------------------------------|
| Severity    | Critical / High / Medium / Low       |
| Category    | OWASP A01–A10                        |
| Location    | `file:line`                          |
| Description | What the vulnerability is            |
| Fix         | Exact code change or config update   |
| Status      | Open / Fixed (with commit hash)      |

**Gate**: All Critical and High findings must be fixed before the next release tag.
