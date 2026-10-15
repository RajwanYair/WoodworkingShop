---
description: 'Zustand store slice, undo/redo, and persistence conventions.'
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

- Cabinet undo/redo lives in `slices/cabinetsSlice.ts` and `slices/cabinetHistory.ts`
- History stores structural patches, not full cabinet snapshots, and is capped at 50 steps
- Group slider drags with `beginHistoryGroup` / `endHistoryGroup` so they remain one undo step
- Do not put catalog, hardware, stock, cost-variance, room, or toast edits on the cabinet history stack

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
