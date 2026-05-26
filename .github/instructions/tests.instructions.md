---
applyTo: "tests/**"
---

# Test File Instructions

These instructions apply to all files under `tests/`.

## Style

- Use `it.each` for parametrised positive/negative test pairs — not separate `it()` blocks
- Group related assertions in one `it()` rather than one `expect()` per `it()`
- Name tests descriptively: `'returns X when Y'` or `'throws RangeError when Z is negative'`
- Use `describe` blocks to group tests by function or behaviour

## Engine tests (`tests/engine/`)

- Import engine functions directly — no React, no store, no DOM
- Use `cfg()` helper from `tests/helpers.ts` to build `CabinetConfig` fixtures from `DEFAULT_CONFIG + overrides`
- Never import workers in unit tests — use synchronous fallback functions

## Store tests (`tests/store/`)

- Use `useCabinetStore.getState()` to call actions and read state
- Reset store between tests: call `useCabinetStore.getState().reset()` in `beforeEach`
- Never render React components in store tests

## Component tests (`tests/components/`)

- Use `@testing-library/react` — no Enzyme, no shallow rendering
- Use `userEvent` from `@testing-library/user-event` for interactions (not `fireEvent`)
- Query by accessible role/label — not by test-id unless unavoidable

## Mocking

- Use `vi.mock(...)` at the top of the file for module mocks
- Use `vi.spyOn(...)` with `afterEach(() => spy.mockRestore())` for method spies
- Never leave `.only` tests in committed code (`no-only-tests` plugin enforces this)

## Coverage targets

- Engine: 80% line coverage minimum (CI gate)
- Store: 70% line coverage minimum
