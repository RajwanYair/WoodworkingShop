# MCP and GitHub Governance

> Scope: VS Code MCP configuration and GitHub release integration for this repository.

## MCP Server Governance Matrix

| Server               | Tier     | Owner           | Purpose                                                  | Secret Source                                         |
| -------------------- | -------- | --------------- | -------------------------------------------------------- | ----------------------------------------------------- |
| `github`             | Core     | Repo Maintainer | PR, issue, workflow, and code search operations in chat  | GitHub auth token managed by VS Code/GitHub extension |
| `filesystem`         | Core     | Repo Maintainer | Workspace-scoped file system access for edits and audits | None                                                  |
| `playwright`         | Core     | QA/Testing      | Browser automation and E2E diagnostics                   | None                                                  |
| `memory`             | Core     | Repo Maintainer | Persistent agent memory and session context              | None                                                  |
| `sequentialthinking` | Core     | Repo Maintainer | Structured multi-step reasoning for complex tasks        | None                                                  |
| `context7`           | Core     | Repo Maintainer | Current package and framework documentation lookup       | None                                                  |
| `chrome-devtools`    | Optional | QA/Performance  | Chrome performance traces and browser diagnostics        | None                                                  |

## Governance Rules

1. Core servers must remain enabled unless a replacement is documented.
2. Optional servers must have an active use-case in the current sprint.
3. Secrets must come from VS Code secret inputs or provider auth flows only.
4. Plain-text tokens in workspace files are prohibited.
5. Any MCP server addition must include owner, purpose, and decommission criteria.

`chrome-devtools` is intended for interactive trace-based performance diagnosis when Lighthouse findings need browser-level investigation. Decommission it if that performance workflow is no longer used or the server stops providing capability beyond Playwright. It runs headless with a temporary isolated profile; Google usage statistics and CrUX URL submissions are disabled.

## GitHub Integration Validation

The release flow is considered valid only when all checks below pass:

| Check                    | Command                                                           | Expected Result                                                        |
| ------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Quality gate             | `npm run check`                                                   | Pass                                                                   |
| Build and packaging gate | `npm run release:build`                                           | Pass                                                                   |
| Main branch updated      | Merge the reviewed release PR to `main`                           | Release commit is present on `main`                                    |
| Release tag published    | `git push origin vX.Y.Z`                                          | Annotated tag points to the merged release commit                      |
| Release publish          | Push `vX.Y.Z`; `.github/workflows/release.yml` runs automatically | `WoodworkingShop vX.Y.Z` includes archive, checksum, SBOM, attestation |

## Operational Notes

- `.vscode/mcp.json` is the source of truth for the seven configured MCP servers.
- Server descriptions in `.vscode/mcp.json` must stay aligned with this document.
- Workspace setting `chat.mcp.autostart: "never"` keeps servers available on demand without starting them automatically; use **MCP: List Servers** to start one.
- Publishing an annotated `v*` tag triggers the release workflow; do not also create a manual GitHub release.
- The workflow uploads the generated SBOM from the workspace root; local `npm run sbom` writes under the OS temp directory.
- If a server is temporarily disabled, record the reason in the sprint commit message.

## First-Run Setup

No administrator privileges or machine-wide installation are required. Local
servers use `npx`; VS Code may ask to trust each configured server before its
first launch. Confirm only after reviewing the server entry in `.vscode/mcp.json`.

| Integration     | One-time user action                                                          | When to enable                                      |
| --------------- | ----------------------------------------------------------------------------- | --------------------------------------------------- |
| GitHub MCP      | Sign in to GitHub in VS Code and approve the GitHub MCP authorization prompt. | PR, issue, and Actions workflows                    |
| Chrome DevTools | Ensure Chrome is installed, then start it from **MCP: List Servers**.         | Optional performance traces and browser diagnostics |

For daily use, open **Chat: Open Customizations** to review project agents and
skills, or type `/` in chat to invoke a skill such as `/browser-qa`,
`/docs-sync-audit`, or `/test-gap-audit`. Run **MCP: List Servers** to start,
authorize, inspect logs, or disable integrations. Authentication is deliberately
completed through VS Code or each provider; do not copy credentials into shell
history, workspace settings, or committed files.
