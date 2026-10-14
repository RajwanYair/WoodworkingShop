# ADR-0002: Zustand for Application State

- Status: Accepted
- Date: 2026-10-13

## Context

The application has a shared cabinet/project workspace with derived dimensions, parts, hardware,
optimization, costs, undo/redo, and UI preferences. React components need consistent access to
this state, while expensive optimization, cost, and assembly work is scheduled through Web Workers.
The primary store is `useCabinetStore`; it composes focused slices and retains compatibility stores
for several domains. See [store implementation](../../src/store/cabinet-store.ts), [worker
scheduling](../../src/store/worker-schedule.ts), and [architecture](../ARCHITECTURE.md).

## Decision

Keep Zustand as the application state library. Use slices for cohesive state and actions, selectors for component subscriptions, and `getState()` for non-React call sites. Keep pure calculations in the engine and route asynchronous work through the existing worker scheduler. Do not introduce a second state-management library for application state.

## Consequences

The small API and TypeScript inference support the current client-side architecture without a
reducer framework. Shared state still needs deliberate slice boundaries and test isolation. The
current store has accumulated satellite stores and broad responsibilities; Phase 82/Sprint 429 may
reorganize these into domain slices, but that refactor must preserve public store behavior,
undo/redo, and persisted data contracts. Re-evaluate the library only if a measured limitation
cannot be solved within the existing model.
