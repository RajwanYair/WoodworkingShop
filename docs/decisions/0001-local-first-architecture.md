# ADR-0001: Local-First Application Architecture

- Status: Accepted
- Date: 2026-10-13

## Context

WoodworkingShop is a browser-based planning tool whose core value is configuring furniture, calculating dimensions and parts, optimizing cut sheets, and exporting workshop documents. The product is designed to work without an account or required network service. Projects are stored in the browser, and the PWA can continue offline after its application shell has been cached. See [architecture](../ARCHITECTURE.md), [storage implementation](../../src/utils/indexed-db-storage.ts), and [roadmap constraints](../ROADMAP.md).

## Decision

Keep the application local-first and serverless for core workflows. Run domain calculations in the browser; use IndexedDB for durable project data and localStorage for small preferences and session state. Any future cloud synchronization must remain opt-in, disclosed, and separable from the offline workflow. Do not make accounts, telemetry, or remote APIs prerequisites for creating, editing, or exporting a project.

## Consequences

Users retain control of their design data and core workflows remain available offline. The browser owns persistence and compatibility responsibilities, so storage migrations and export formats require explicit tests. Optional network features must have local fallbacks and must not silently upload project contents. Reconsider only if demonstrated user needs justify a separately threat-modeled sync service without weakening the local workflow.
