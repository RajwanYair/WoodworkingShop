# ADR-0004: Cap Direct Production Dependencies

- Status: Accepted
- Date: 2026-10-13

## Context

The application is intended to remain small, local-first, and maintainable as a static client-side tool. Runtime dependencies affect download size, supply-chain exposure, licensing review, and the offline app. `package.json` currently declares eight direct production dependencies; the cap is also recorded as a planning constraint in the [roadmap](../ROADMAP.md).

## Decision

Keep the direct production dependency cap at eight. Before adding a production dependency, first remove or replace an existing dependency, or record an explicit decision showing measured user value, bundle impact, license compatibility, and why an in-house implementation is not preferable. Development and test dependencies are outside this runtime cap but remain subject to normal review.

## Consequences

The cap limits runtime surface and encourages reuse of existing browser and platform APIs. It also makes additions a deliberate trade-off rather than a default response to small features. The current cap is a project policy; it is not an automated package-manager constraint, so code review and roadmap governance remain responsible for enforcing it. Reconsider only through a recorded decision supported by measurements.
