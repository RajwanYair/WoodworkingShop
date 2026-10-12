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

## TypeScript 7 Compiler and TypeScript 6 Tooling Compatibility

**Decision:** Use TypeScript 7.0.2 for builds and project typechecks, with both scripts invoking `@typescript/native` explicitly and `ai:context:validate` enforcing compiler major 7. Keep `@typescript/typescript6` under the `typescript` alias only for tools whose published peer ranges stop at TypeScript 6, and for the VS Code language-service SDK; this compatibility alias does not select the build compiler. TypeScript 7.0 does not yet provide the compiler API expected by those tools.

**Re-evaluate when:** typescript-eslint, TypeDoc, and the editor language service support TypeScript 7's API; then remove the compatibility alias and verify those tools against TypeScript 7 alone. Do not downgrade the build or typecheck compiler to satisfy a tooling peer range.
