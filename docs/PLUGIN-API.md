# Cabinet Planner Plugin API

> **API version**: 1.2.0 · **App version**: ≥ 3.62.0 · **Stability**: `experimental`
> **Source**: [`src/engine/plugin.ts`](../src/engine/plugin.ts)
> **Import from**: `src/engine/index.ts` (barrel) — never import directly from individual engine files.

---

## Overview

The Cabinet Planner Plugin API lets you intercept the parts pipeline, config changes,
validation results, and G-code output — without forking the application or modifying
source files.

All hooks are **pure**: return new values instead of mutating inputs.
A plugin only needs to implement the hooks it cares about; all hooks are optional.

```ts
import { registerPlugin, getPluginContract, pluginEventBus } from './engine';
import type { CabinetPlannerPlugin } from './engine';
```

---

## Stability Tiers

| Tier           | Meaning                                                             |
| -------------- | ------------------------------------------------------------------- |
| `stable`       | Guaranteed not to break within a major version (1.x).               |
| `experimental` | May change without notice. Opt-in only; do not use in production.   |
| `deprecated`   | Will be removed in the next major release. Migrate off immediately. |

Check hook stability at runtime:

```ts
const contract = getPluginContract();
// contract.apiVersion => '1.2.0'
// contract.hooks[0].stability => 'stable' | 'experimental' | 'deprecated'
```

---

## Hook Reference

### `onPartsGenerated` — **stable** (since 1.0.0)

Called after `generateParts()` produces the initial part list.

```ts
onPartsGenerated?(parts: Part[], cfg: CabinetConfig): Part[]
```

- Receives the full `Part[]` and the current `CabinetConfig`.
- Return a **modified copy**; never mutate `parts`.
- Return the same array reference to signal no change (avoids a re-render).

**Example — add a custom backer strip:**

```ts
onPartsGenerated(parts, cfg) {
  if (cfg.width <= 600) return parts; // no change
  const backerStrip: Part = {
    id: 'custom-backer',
    label: { en: 'Backer Strip', he: 'רצועת גב' },
    width: cfg.width - 4,
    length: 100,
    qty: 1,
    material: 'plywood-18',
    grain: false,
  };
  return [...parts, backerStrip];
},
```

---

### `onConfigChange` — **stable** (since 1.0.0)

Called before a config change is committed to the Zustand store.

```ts
onConfigChange?(cfg: CabinetConfig): CabinetConfig
```

- Return a modified `CabinetConfig` to override what the user entered.
- Return the original object reference for no change.

**Example — enforce minimum depth:**

```ts
onConfigChange(cfg) {
  if (cfg.depth < 400) return { ...cfg, depth: 400 };
  return cfg;
},
```

---

### `onValidate` — **experimental** (since 1.1.0)

Called after `validateConfig()` has run all built-in and custom rules.

```ts
onValidate?(issues: ValidationIssue[], cfg: CabinetConfig): ValidationIssue[]
```

- May add, remove, or re-prioritise `ValidationIssue` objects.
- Return the same array reference to signal no change.

**Example — suppress a built-in warning for a specific use-case:**

```ts
onValidate(issues, cfg) {
  if (cfg.furnitureType !== 'wardrobe') return issues;
  return issues.filter(i => i.code !== 'SHELF_COUNT_WARDROBE_BARE');
},
```

---

### `onGcodeGenerated` — **experimental** (since 1.2.0)

Called after `cutSheetToGcode()` has assembled the raw G-code string for a single sheet.

```ts
onGcodeGenerated?(raw: string): string
```

- May rewrite the G-code to target a specific CNC controller dialect
  (Mach3, LinuxCNC, Fanuc, etc.).
- Return the modified string; return the same string reference for no change.

**Example — prepend a Mach3-style program header:**

```ts
onGcodeGenerated(raw) {
  const header = `%\nO0001 (Cabinet Planner — ${new Date().toISOString()})\n`;
  return header + raw;
},
```

---

## Registration

```ts
import { registerPlugin, unregisterPlugin, getPlugins } from './engine';

// Register — returns Result<void, string>; fails if id already registered.
const result = registerPlugin(myPlugin);
if (result.type === 'err') console.warn(result.error);

// Unregister by id (no-op if not found).
unregisterPlugin('com.example.my-plugin');

// Inspect registered plugins (read-only snapshot).
const plugins: readonly CabinetPlannerPlugin[] = getPlugins();
```

---

## Plugin Event Bus

Plugins can subscribe to named events emitted by the store and engine.
This is an **experimental** publish/subscribe mechanism.

```ts
import { pluginEventBus } from './engine';
```

### Events

| Event name              | Payload type                                   | Emitted when                     |
| ----------------------- | ---------------------------------------------- | -------------------------------- |
| `config:change`         | `{ config: CabinetConfig }`                    | Any config field is updated      |
| `optimization:complete` | `{ sheetCount: number; yieldPercent: number }` | Cut optimizer finishes a run     |
| `project:save`          | `{ projectName: string }`                      | Project saved (auto or explicit) |
| `part:rotation-lock`    | `{ partId: string; locked: boolean }`          | Rotation lock toggled on a part  |

### Usage

```ts
// Subscribe
const off = pluginEventBus.on('optimization:complete', ({ sheetCount, yieldPercent }) => {
  console.log(`Optimization done: ${sheetCount} sheets, ${yieldPercent.toFixed(1)}% yield`);
});

// Unsubscribe when done
off();

// Or remove by reference
pluginEventBus.off('config:change', myHandler);
```

---

## Full Plugin Example

```ts
import { registerPlugin } from './engine';
import type { CabinetPlannerPlugin } from './engine';

const myPlugin: CabinetPlannerPlugin = {
  id: 'com.example.my-plugin',
  name: 'My Cabinet Plugin',
  version: '1.0.0',

  onPartsGenerated(parts, cfg) {
    // Add a custom reinforcement block for wide cabinets
    if (cfg.width < 900) return parts;
    return [
      ...parts,
      {
        id: `reinforcement-${cfg.width}`,
        label: { en: 'Reinforcement Block', he: 'בלוק חיזוק' },
        width: 60,
        length: cfg.height - 4,
        qty: 2,
        material: 'plywood-18',
        grain: true,
      },
    ];
  },

  onConfigChange(cfg) {
    // Clamp shelf count for this plugin's requirements
    const maxShelves = Math.floor(cfg.height / 200);
    if (cfg.shelvesCount > maxShelves) {
      return { ...cfg, shelvesCount: maxShelves };
    }
    return cfg;
  },
};

registerPlugin(myPlugin);
```

---

## Validation Rule API

Beyond hooks, plugins can register custom validation rules using the same registry
the built-in rules use:

```ts
import { registerRule, unregisterRule } from './engine';
import type { ValidationRule } from './engine';

const myRule: ValidationRule = {
  code: 'MY_PLUGIN_MIN_DEPTH',
  severity: 'error',
  check(cfg) {
    if (cfg.depth < 350) {
      return {
        code: 'MY_PLUGIN_MIN_DEPTH',
        severity: 'error',
        message: { en: 'Depth must be at least 350 mm for this hardware.', he: 'עומק חייב להיות לפחות 350 מ"מ.' },
        field: 'depth',
        suggestedValue: 350,
      };
    }
    return null;
  },
};

registerRule(myRule);
```

---

## Sandbox / Error Isolation

Each plugin hook is called from within the application's error boundary.
A hook that throws will:

1. Log the error via `console.error`.
2. Return the **original unmodified value** so the application continues.

Plugin event bus handlers also run inside individual try/catch blocks — a faulty
handler cannot abort sibling handlers or the emitting code.

### `runWithSandbox` — _experimental_ (since 1.1.0)

For integrating untrusted or community plugins, wrap hook calls in `runWithSandbox`
to catch exceptions and enforce a wall-clock time budget:

```ts
import { runWithSandbox, SandboxTimeoutError } from '../src/engine';

const safeParts = runWithSandbox(
  () => plugin.onPartsGenerated!(parts, cfg),
  parts, // fallback returned if the hook throws
  {
    timeoutMs: 30,
    onError(err) {
      if (err instanceof SandboxTimeoutError) {
        console.warn(`Hook too slow: ${err.elapsedMs} ms > ${err.limitMs} ms`);
      } else {
        console.error('[plugin sandbox] hook threw:', err);
      }
    },
  }
);
```

**`SandboxOptions`**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `timeoutMs` | `number` | `50` | Soft wall-clock limit in ms. Exceeded → calls `onError` with `SandboxTimeoutError`. Return value is still used. |
| `onError` | `(error: unknown) => void` | `undefined` | Called when the function throws or exceeds `timeoutMs`. |

**`SandboxTimeoutError`** extends `Error` with two readonly properties:

| Property | Type | Description |
|----------|------|-------------|
| `elapsedMs` | `number` | Actual elapsed time in ms |
| `limitMs` | `number` | Configured `timeoutMs` limit |

---

## Versioning & Compatibility

| API version | App version | Key additions |
| ----------- | ----------- | ------------- |
| 1.0.0 | ≥ 3.55.0 | `onPartsGenerated`, `onConfigChange`, registry, `PLUGIN_CONTRACT` |
| 1.1.0 | ≥ 3.57.0 | `onValidate`, Plugin Event Bus, `runWithSandbox` |
| 1.2.0 | ≥ 3.62.0 | `onGcodeGenerated` |

Check at runtime — no version-string hardcoding needed:

```ts
import { getPluginContract } from '../src/engine';
const { apiVersion } = getPluginContract(); // '1.2.0'
```

### `PluginHookContract` and `PluginContract`

The `PLUGIN_CONTRACT` constant (also returned by `getPluginContract()`) exposes
the full stability contract as a typed object:

```ts
import { PLUGIN_CONTRACT } from '../src/engine';
// PLUGIN_CONTRACT.apiVersion  → '1.2.0'
// PLUGIN_CONTRACT.stability   → 'experimental'
// PLUGIN_CONTRACT.hooks       → readonly PluginHookContract[]

for (const hook of PLUGIN_CONTRACT.hooks) {
  console.log(hook.hookName, hook.stability, hook.introducedIn);
}
```

**`PluginHookContract` fields**

| Field | Type | Description |
|-------|------|-------------|
| `hookName` | `keyof CabinetPlannerPlugin` (excluding `id`/`name`/`version`) | Name of the hook |
| `stability` | `'stable' \| 'experimental' \| 'deprecated'` | Stability tier |
| `introducedIn` | `string` | API semver when the hook was introduced |
| `deprecatedIn` | `string \| undefined` | API semver when deprecated (if applicable) |
| `description` | `string` | Short description of the hook's purpose |

---

## Stability Matrix

| Symbol | Category | Stability | Since |
|--------|----------|-----------|-------|
| `CabinetPlannerPlugin` | Interface | `stable` | 1.0.0 |
| `onPartsGenerated` | Hook | `stable` | 1.0.0 |
| `onConfigChange` | Hook | `stable` | 1.0.0 |
| `onValidate` | Hook | `experimental` | 1.1.0 |
| `onGcodeGenerated` | Hook | `experimental` | 1.2.0 |
| `registerPlugin` | Function | `stable` | 1.0.0 |
| `unregisterPlugin` | Function | `stable` | 1.0.0 |
| `getPlugins` | Function | `stable` | 1.0.0 |
| `getPluginContract` | Function | `stable` | 1.0.0 |
| `PLUGIN_CONTRACT` | Constant | `stable` | 1.0.0 |
| `PluginContract` | Type | `stable` | 1.0.0 |
| `PluginHookContract` | Type | `stable` | 1.0.0 |
| `PluginStability` | Type | `stable` | 1.0.0 |
| `pluginEventBus` | Singleton | `experimental` | 1.1.0 |
| `PluginEventMap` | Type | `experimental` | 1.1.0 |
| `PluginEventName` | Type | `experimental` | 1.1.0 |
| `PluginEventHandler` | Type | `experimental` | 1.1.0 |
| `runWithSandbox` | Function | `experimental` | 1.1.0 |
| `SandboxOptions` | Interface | `experimental` | 1.1.0 |
| `SandboxTimeoutError` | Class | `experimental` | 1.1.0 |

Use `getPluginContract()` at runtime to discover hook availability and stability
without hardcoding version numbers.

---

## Constraints

- **Pure functions only**: hooks must have no side effects. Do not call `fetch`, DOM
  APIs, or Zustand actions from within a hook.
- **No mutation**: return new objects/arrays instead of mutating inputs.
- **Fast**: hooks run synchronously on the main thread. Target < 5 ms per hook.
- **No `as any`**: TypeScript strict mode enforces type safety throughout the API.
- **Unique IDs**: use reverse-domain notation (`com.yourcompany.plugin-name`) to
  prevent registry collisions.

---

## See Also

- [Architecture Overview](ARCHITECTURE.md)
- [Engine source](../src/engine/plugin.ts)
- [Validation rule registry](../src/engine/validation.ts)
