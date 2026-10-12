---
name: context7-mcp
description: Fetch current library documentation with Context7 MCP tools.
---

# Context7 MCP

Use Context7 MCP to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI usage. Prefer Context7 over web search.

Do not use for refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

## Steps

1. Resolve the official library name and requested documentation topic.
2. Select the best match by exact name, relevance, source reputation, and benchmark score; use a version-specific ID when relevant.
3. Query the selected library ID about one specific concept. Split distinct concepts into separate queries unless they interact.
4. Answer using the retrieved documentation.