# Engineering Decisions

Concise outcomes of completed evaluations. Re-evaluate only when a trigger below changes.

## PDF Renderer

**Decision:** Keep `@react-pdf/renderer`.

Its lazy-loaded PDF chunk is outside the initial app payload, while the current integration supports React layout, dynamic pagination, tests, and RTL locales. The evaluated alternative, pdfme, reduced the lazy chunk but lacked equivalent RTL support and would require a substantial rewrite. That tradeoff did not justify migration.

**Re-evaluate when:** pdfme gains first-class RTL and dynamic pagination, or PDF rendering becomes a measured performance bottleneck. Source record: Sprint 62, Phase 17.

## Package Manager

**Decision:** Keep npm; defer pnpm migration.

The project shares a parent npm-workspace installation. Moving to pnpm would require changing that shared workspace, CI setup, lockfile, and install configuration. Potential install and disk savings did not justify the cross-workspace migration risk at evaluation time. Source record: Sprint 64, Phase 17.

**Re-evaluate when:** the shared workspace is ready to migrate, npm install time becomes a bottleneck, or a separately scoped migration can verify Windows, CI, and build compatibility.
