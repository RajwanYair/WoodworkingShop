# ADR-001: TypeScript 7 Native Compiler

- Status: Accepted
- Date: 2026-10-11

## Context

The project needs TypeScript 7's native compiler for typechecking and builds. The current `typescript-eslint` release requires the TypeScript 6 JavaScript API and rejects TypeScript 7 at runtime, so a single compiler package cannot serve both tasks.

## Decision

Install TypeScript 7.0.2 as the `@typescript/native` npm alias and invoke its compiler entry point directly for the `typecheck` and `build` scripts. This avoids a `tsc` shim collision with TypeScript 6. Keep `typescript` at TypeScript 6 for `typescript-eslint` and lint tooling. The AI context version validator derives the advertised TypeScript version from the native compiler alias.

## Consequences

- Typecheck and build use the native TypeScript 7 compiler; lint retains the TypeScript 6 API.
- The native compiler alias is pinned to an exact version so installs are reproducible.
- Both compiler packages must remain represented in the lockfile and pass `npm ci` validation.

## Removal trigger

Remove the TypeScript 6 dependency and this side-by-side arrangement after `typescript-eslint` officially supports the TypeScript 7 API used by the project and lint passes with that API. At that point, use the supported TypeScript 7 package directly and update the version validator and documentation.
