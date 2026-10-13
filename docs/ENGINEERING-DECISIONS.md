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

## Oxlint Pre-pass (Sprint 424)

**Decision:** Do not add Oxlint to the blocking lint or quality pipeline yet. Keep ESLint as the sole authoritative lint gate; revisit an opt-in fast-feedback command only if lint latency becomes a measured developer bottleneck.

**Evidence:** On this Windows workspace, one clean `npm run lint` run took 5.87 seconds. A warmed ephemeral Oxlint 1.83.0 scan of `src` and `tests` took 1.82 seconds. Its default scan emitted 11 warnings and included `tests/e2e`, which the existing ESLint config ignores. The trial did not establish rule parity.

The blocking `quality:fast` runner executes checks concurrently, and ESLint must still pass after any pre-pass. Adding Oxlint cannot reduce the required full-gate duration and would add configuration and maintenance cost.

**Re-evaluate when:** repeated lint measurements show a material developer-feedback bottleneck, and a scoped Oxlint config can demonstrate rule parity for selected fast rules without widening the existing ESLint file scope. Benchmark both clean and failing runs before adding a package or CI step. Oxlint remains advisory unless the ESLint rules and seven-plugin gate stay unchanged and blocking.
