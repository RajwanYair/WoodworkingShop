# Engineering Decisions

Concise outcomes of completed evaluations. Re-evaluate only when a trigger below changes.

## PDF Renderer

**Decision:** Keep `@react-pdf/renderer`.

Its lazy-loaded PDF chunk is outside the initial app payload, while the current integration supports React layout, dynamic pagination, tests, and RTL locales. The evaluated alternative, pdfme, reduced the lazy chunk but lacked equivalent RTL support and would require a substantial rewrite. That tradeoff did not justify migration.

**Re-evaluate when:** pdfme gains first-class RTL and dynamic pagination, or PDF rendering becomes a measured performance bottleneck. Source record: Sprint 62, Phase 17.

## Package Manager

**Decision:** Keep npm with a repository-local install; defer pnpm migration.

Current setup uses `package-lock.json` and `npm ci` at the repository root. There is no npm-workspaces declaration or shared parent install in this checkout. The earlier shared-workspace rationale is historical (Sprint 64, Phase 17), not the current environment. No measured install-time or disk benefit currently justifies changing package managers.

**Re-evaluate when:** clean-install time becomes a measured bottleneck or a separately scoped migration can verify Windows, CI, and build compatibility.
