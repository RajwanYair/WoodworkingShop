# API Capability Boundaries

This document captures optional integration boundaries and the runtime guarantees for each capability.

Source of truth: src/services/capability-contracts.ts

## Boundary Rules

1. Network-dependent capabilities are never on the critical path.
2. Every capability has an explicit owner and source file.
3. Experimental capabilities must be behind an explicit feature flag.
4. Core workflows must remain functional when optional capabilities are unavailable.

## Capability Matrix

| Capability ID | Name | Status | Requires Network | Critical Path | Feature Flag |
| --- | --- | --- | --- | --- | --- |
| error-reporter | Client Error Reporter | active | no | no | - |
| supabase-sync | Supabase Sync Adapter | experimental | yes | no | SUPABASE_SYNC |
