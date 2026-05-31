# MCP and GitHub Governance

> Scope: VS Code MCP configuration and GitHub release integration for this repository.

## MCP Server Governance Matrix

| Server               | Tier     | Owner           | Purpose                                                   | Secret Source                                         |
| -------------------- | -------- | --------------- | --------------------------------------------------------- | ----------------------------------------------------- |
| `github`             | Core     | Repo Maintainer | PR, issue, workflow, and code search operations in chat   | GitHub auth token managed by VS Code/GitHub extension |
| `filesystem`         | Core     | Repo Maintainer | Workspace-scoped file system access for edits and audits  | None                                                  |
| `fetch`              | Core     | Repo Maintainer | Retrieve web/API payloads for fact-grounded decisions     | None                                                  |
| `playwright`         | Core     | QA/Testing      | Browser automation and E2E diagnostics                    | None                                                  |
| `memory`             | Core     | Repo Maintainer | Persistent agent memory and session context               | None                                                  |
| `sequentialthinking` | Core     | Repo Maintainer | Structured multi-step reasoning for complex tasks         | None                                                  |
| `context7`           | Core     | Repo Maintainer | Current package and framework documentation lookup        | None                                                  |
| `gitkraken`          | Optional | Repo Maintainer | Advanced git/PR workflow support                          | GitKraken-managed auth                                |
| `cloudflare`         | Optional | Platform Owner  | Cloudflare Pages/Workers operations when needed           | Cloudflare auth via MCP provider                      |
| `brave-search`       | Optional | Repo Maintainer | Web search fallback when docs are unavailable in Context7 | VS Code secret input `brave-api-key`                  |

## Governance Rules

1. Core servers must remain enabled unless a replacement is documented.
2. Optional servers must have an active use-case in the current sprint.
3. Secrets must come from VS Code secret inputs or provider auth flows only.
4. Plain-text tokens in workspace files are prohibited.
5. Any MCP server addition must include owner, purpose, and decommission criteria.

## GitHub Integration Validation

The release flow is considered valid only when all checks below pass:

| Check                    | Command                                                                      | Expected Result                    |
| ------------------------ | ---------------------------------------------------------------------------- | ---------------------------------- |
| Quality gate             | `npm run check`                                                              | Pass                               |
| Build and packaging gate | `npm run release:build`                                                      | Pass                               |
| Main branch published    | `git push origin main`                                                       | Remote `main` matches local `HEAD` |
| Tag publish              | `git tag vX.Y.Z && git push origin vX.Y.Z`                                   | Tag exists on origin               |
| Release publish          | `gh release create vX.Y.Z --generate-notes --title "WoodworkingShop vX.Y.Z"` | GitHub release created             |

## Operational Notes

- `.vscode/mcp.json` is the source of truth for active MCP servers.
- Server descriptions in `.vscode/mcp.json` must stay aligned with this document.
- If a server is temporarily disabled, record the reason in the sprint commit message.
