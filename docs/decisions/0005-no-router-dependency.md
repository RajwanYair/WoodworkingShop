# ADR-0005: Keep Routing on Browser APIs

- Status: Accepted
- Date: 2026-10-13

## Context

The application is a compact single-page workspace with a small set of tabs and shareable configuration state. The current implementation stores the active tab and project/configuration parameters in the URL and uses the browser History API; there are no React Router or TanStack Router dependencies. See [URL state utilities](../../src/utils/url-state.ts), [application shell](../../src/App.tsx), and the [routing decision ledger](../ROADMAP.md).

## Decision

Do not add a client-side router library for the current application. Continue using browser URL and History APIs for tab deep links and shareable project state.
Sprint 430 observes back/forward with the platform Navigation API where it is present, and always writes same-document tab URLs with the History API.
`navigation.navigate()` is not used for those writes because current Chromium treats a query-only call as a document load.
`popstate` remains the fallback. A third-party router stays out of scope.

## Consequences

The application avoids runtime dependency and adapter overhead for a small tab-based experience. Route matching, browser history behavior, and URL restoration remain application responsibilities and must be covered by browser tests. Reconsider if multiple nested route hierarchies, route loaders, or navigation-level data boundaries become a demonstrated requirement.
