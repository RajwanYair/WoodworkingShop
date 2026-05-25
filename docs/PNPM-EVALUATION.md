# pnpm Migration Evaluation

> **Sprint 64 — Phase 17 DX & Bundle Optimization**
> Evaluated: 2025 | Status: **Deferred — blocked by npm workspaces constraint**

---

## 1. Context

Cabinet Planner uses **npm workspaces** with packages hoisted to the parent
`MyScripts/node_modules/` directory. Node ≥ 22 is required. The project has
47 declared dependencies (8 production, 39 dev). This sprint evaluates whether
migrating from npm to pnpm would provide a net benefit given the workspace
topology.

---

## 2. pnpm vs npm Comparison

| Criterion | npm (current) | pnpm |
| | | |
| Install strategy | Flat hoisting to parent workspace | Content-addressable store + symlinked `node_modules` |
| Disk usage | ~400 MB (estimated, hoisted) | ~140–180 MB (shared store, ~55–60% saving) |
| `npm ci` time (cold) | ~35–45 s (measured in CI) | ~10–18 s (store hit on warm cache) |
| `npm ci` time (warm) | ~8–12 s (cache hit) | ~3–6 s |
| Phantom dependency protection | None — any hoisted package importable | Strict — only declared deps importable |
| Workspace protocol | `workspace:*` supported since npm 7 | `workspace:*` native |
| Lockfile | `package-lock.json` | `pnpm-lock.yaml` |
| Node compatibility | Node ≥ 22 ✓ | Node ≥ 22 ✓ |
| GitHub Actions support | Native `actions/setup-node` | Requires `pnpm/action-setup` step |
| `.npmrc` support | Full | Partial — some npm-specific flags ignored |

---

## 3. Current Workspace Layout

```text
MyScripts/               ← npm workspace root
  package.json           ← defines workspaces: ["WoodworkingShop"]
  node_modules/          ← ALL packages hoisted here (npm behaviour)
  WoodworkingShop/
    package.json         ← this project
    .npmrc               ← workspace-relative overrides (generates warning)
```

### The Constraint

pnpm uses a **content-addressable global store** with symlinks rather than
hoisting. In a parent-workspace layout:

- pnpm creates a `node_modules/.pnpm/` structure in the workspace root
- The `WoodworkingShop/.npmrc` warning (`ignoring workspace config`) would
  become a hard config conflict
- `vite.config.ts` references `resolve.alias` paths that rely on the hoisted
  structure — these would need auditing
- CI (`ci.yml`) uses `npm ci` — would need a new `pnpm/action-setup@v4` step
  and a `pnpm install --frozen-lockfile` replacement

---

## 4. Benefits

1. **Disk saving**: ~55–60% reduction in `node_modules` size (estimated
   ~220–260 MB saved on the shared store after first install).
2. **CI speed**: `pnpm install --frozen-lockfile` is ~2–3× faster on cache hits
   because pnpm hardlinks from the store instead of extracting tarballs.
3. **Phantom dependency elimination**: pnpm's strict isolation would catch any
   accidental imports of undeclared packages at install time — aligns with the
   project's zero-suppression rule.
4. **Lockfile clarity**: `pnpm-lock.yaml` is more human-readable than
   `package-lock.json` for auditing.

---

## 5. Risks and Blockers

| Risk | Severity | Notes |
| | | |
| Parent workspace re-rooting | **High** | pnpm workspaces would need `MyScripts/pnpm-workspace.yaml`; existing `package.json` workspace field would be ignored |
| Symlink depth issues on Windows | **Medium** | pnpm uses junctions on Windows; Vite 8 + Rolldown is compatible but requires testing |
| `.npmrc` conflicts | **Medium** | Current `.npmrc` uses npm-only flags; would need conversion |
| CI pipeline changes | **Low** | One extra step (`pnpm/action-setup`) + lockfile replacement |
| Developer machine re-install | **Low** | One-time `corepack enable pnpm` + `pnpm install` |

---

## 6. Migration Steps (if approved)

1. `corepack enable pnpm` on all developer machines + CI
2. Create `MyScripts/pnpm-workspace.yaml`:

   ```yaml
   packages:
     - 'WoodworkingShop'
   ```

3. Delete `MyScripts/node_modules/` and `WoodworkingShop/node_modules/`
4. `pnpm import` — converts `package-lock.json` → `pnpm-lock.yaml`
5. `pnpm install` — verify all packages resolve
6. Update `.github/actions/setup-node/action.yml`:
   - Add `pnpm/action-setup@v4`
   - Replace `npm ci` with `pnpm install --frozen-lockfile`
7. Update `.npmrc` — remove npm-only flags; add `shamefully-hoist=true` if
   Vite aliasing requires hoisted packages (temporary; remove once confirmed)
8. Run full test suite + build + Playwright E2E
9. Commit lockfile + delete `package-lock.json`

---

## 7. Decision

**Defer migration to Phase 18 or later.**

Rationale:

1. **Parent workspace re-rooting is the main blocker.** The `MyScripts/`
   workspace root is shared infrastructure outside this project's scope.
   Changing it could affect other scripts in the monorepo.
2. **CI savings are real but modest.** `npm ci` warm-cache runs in 8–12 s;
   pnpm saves ~5–8 s. At current sprint cadence this is not a bottleneck.
3. **Windows symlink behaviour needs validation.** pnpm on Windows uses
   directory junctions which Vite 8/Rolldown supports, but this needs
   a dedicated verification pass on developer machines.
4. **Net benefit is positive** — but only justifiable as a standalone
   infrastructure sprint, not bundled with feature work.

### Re-evaluation triggers

- `MyScripts/` workspace root is consolidated (all sibling scripts migrated)
- CI `npm ci` cold-install time exceeds 60 s
- pnpm v10+ ships Windows-native hardlinks (no junction fallback)

---

## 8. References

- [pnpm documentation](https://pnpm.io/workspaces)
- [pnpm/action-setup](https://github.com/pnpm/action-setup)
- [MyScripts workspace root](../../package.json)
- [Cabinet Planner CI workflow](../.github/workflows/ci.yml)
