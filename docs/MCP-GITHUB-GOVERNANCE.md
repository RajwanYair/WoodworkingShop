# MCP and GitHub Governance

> Scope: VS Code MCP configuration and GitHub release integration for this repository.

## MCP Server Governance Matrix

| Server       | Tier | Owner           | Purpose                                                 | Secret Source                                         |
| ------------ | ---- | --------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| `github`     | Core | Repo Maintainer | PR, issue, workflow, and code search operations in chat | GitHub auth token managed by VS Code/GitHub extension |
| `playwright` | Core | QA/Testing      | Browser automation and E2E diagnostics                  | None                                                  |
| `context7`   | Core | Repo Maintainer | Current package and framework documentation lookup      | None                                                  |

Workspace MCP is intentionally limited to these three integrations. VS Code's
built-in tools handle workspace files, host web tools handle general retrieval,
and shared Copilot memory/reasoning tools avoid project-specific duplicates.

## Governance Rules

1. Keep the core set limited to integrations with a distinct workspace use case.
2. Optional servers must have an active use-case in the current sprint.
3. Secrets must come from VS Code secret inputs or provider auth flows only.
4. Plain-text tokens in workspace files are prohibited.
5. Any MCP server addition must include owner, purpose, and decommission criteria.

## GitHub Integration Validation

The release flow is considered valid only when all checks below pass:

| Check                         | Command                                                           | Expected Result                                                       |
| ----------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------- |
| Quality gate                  | `npm run check`                                                   | Pass                                                                  |
| Build and packaging gate      | `npm run release:build`                                           | Pass                                                                  |
| Main branch and tag published | `git push origin main --follow-tags`                              | Remote `main` and annotated release tag match local `HEAD`            |
| Release publish               | Push `vX.Y.Z`; `.github/workflows/release.yml` runs automatically | `WoodworkingShop vX.Y.Z` release includes archive, checksum, and SBOM |

## Operational Notes

- `.vscode/mcp.json` is the source of truth for active MCP servers.
- Server descriptions in `.vscode/mcp.json` must stay aligned with this document.
- Publishing an annotated `v*` tag triggers the release workflow; do not also create a manual GitHub release.
- The workflow uploads the generated SBOM from the workspace root; local `npm run sbom` writes under the OS temp directory.
- If a server is temporarily disabled, record the reason in the sprint commit message.

## First-Run Setup

No administrator privileges or machine-wide installation are required. Local
servers use `npx`; VS Code may ask to trust each configured server before its
first launch. Confirm only after reviewing the server entry in `.vscode/mcp.json`.

| Integration | One-time user action                                                          | When to enable                        |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------- |
| GitHub MCP  | Sign in to GitHub in VS Code and approve the GitHub MCP authorization prompt. | Core PR, issue, and Actions workflows |

For daily use, open **Chat: Open Customizations** to review project agents and
skills, or type `/` in chat to invoke a skill such as `/browser-qa`,
`/docs-sync-audit`, or `/test-gap-audit`. Run **MCP: List Servers** to start,
authorize, inspect logs, or disable integrations. Authentication is deliberately
completed through VS Code or each provider; do not copy credentials into shell
history, workspace settings, or committed files.
