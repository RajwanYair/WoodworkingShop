---
applyTo: 'src/store/**'
---

# Store (Zustand) Instructions

These instructions apply to all files under `src/store/`.

## Slice pattern

```ts
export interface MyFeatureSlice {
  field: Type;
  setField: (value: Type) => void;
}

export const createMyFeatureSlice = (set: SetState<MyFeatureSlice>): MyFeatureSlice => ({
  field: defaultValue,
  setField: (value) => set((s) => ({ ...s, field: value })),
});
```

## State updates

- Always spread the full state: `set((s) => ({ ...s, field: value }))` — never mutate directly
- For nested updates: `set((s) => ({ ...s, config: { ...s.config, width } }))`
- Actions that modify state must return `void`

## Reading state outside React

```ts
useCabinetStore.getState().someAction(payload);
const value = useCabinetStore.getState().someField;
```

## Undo/redo

- The main store in `cabinet-store.ts` has undo/redo middleware
- Store slices that should participate in history must be registered in the temporal middleware config

## No side effects

- Store slices are pure state containers
- Do NOT import engine functions that have side effects
- Do NOT call `fetch`, `localStorage`, or DOM APIs directly in setters — use `services/`

## Selector pattern

```ts
// Single field (no shallow needed)
const width = useCabinetStore((s) => s.config.width);

// Multiple fields (use shallow for performance)
import { shallow } from 'zustand/shallow';
const { width, height } = useCabinetStore((s) => ({ width: s.config.width, height: s.config.height }), shallow);
```
