---
name: create-canvas
description: Author, validate, and debug canvas extensions that the agent can open in the GitHub Copilot app's side panel. Use when creating, reviewing, or troubleshooting a canvas extension — including its actions, inputs, rendered content, and the surrounding extension wiring (tools, hooks, lifecycle).
---

# Extension Canvas Authoring

Use this skill when creating or debugging an extension canvas that integrates with the runtime canvas model.

The host app no longer participates in extension canvas registration. Extensions declare canvases directly to the runtime via the Copilot SDK on `joinSession`; the runtime routes provider callbacks (`canvas.open`, `canvas.action.invoke`, etc.) straight to the declaring connection; the host app just renders whatever URL the provider returns.

## Authoring workflow (do this in order)

A canvas lives inside a normal Copilot CLI extension, so use the extension tooling to bootstrap and iterate. The order matters — skipping the guide step is the most common cause of writing brittle extensions that fight the SDK.

1. **Read the bundled SDK docs first.** Call `extensions_manage({ operation: "guide" })`. It prints absolute paths to the canonical docs that ship with the installed SDK:
   - `docs/extensions.md` — architecture, discovery, lifecycle.
   - `docs/agent-author.md` — step-by-step workflow, full type signatures for tools/hooks/session/events, gotchas.
   - `docs/examples.md` — practical recipes for tools, hooks, events, lifecycle, file watching, programmatic `session.send`.
   - `index.d.ts` (and siblings `canvas.d.ts`, `extension.d.ts`, `session.d.ts`, `types.d.ts`) — the source of truth for every type. View these directly when you need an exact field name or signature.

   Read at minimum `extensions.md` and `canvas.d.ts`. Read `agent-author.md` if the extension will also contribute tools or hooks alongside the canvas.

2. **Decide the scope, then ask the user if it's ambiguous.** Project (`.github/extensions/<name>/`) is committed to the repo and shared with the team. User (`$COPILOT_HOME/extensions/<name>/`, defaults to `~/.copilot/extensions/<name>/`) is local to the current user. Session (`$COPILOT_HOME/session-state/<sessionId>/extensions/<name>/`) is loaded only for the current session and disappears with it — ideal for a throwaway canvas the agent spins up for one conversation. **Don't assume.** Unless the request makes it obvious ("a personal scratch tool" → user; "a tool everyone on the repo should have" → project; "a canvas just for this session" → session), ask before creating files — the choice changes who sees the extension, whether it's committed, where global storage lives, and the resulting `extensionId`.

3. **Scaffold via the tool, don't hand-write the skeleton.** Call `extensions_manage({ operation: "scaffold", kind: "canvas", name: "<name>", location: "project" | "user" | "session" })`. The `session` location targets the current session's state directory. The canvas scaffold produces an `extension.mjs` with `joinSession({ canvases: [createCanvas({...})] })`, a working loopback HTTP server per instance, an example action, and `onClose` cleanup. Edit from there — don't recreate the boilerplate.

4. **Edit the file.** Implement your `open`, `actions[]`, optional `onClose`, and (if needed) tools/hooks alongside. Keep `extension.mjs` focused on wiring; pull renderer assets, schemas, and large helpers into sibling files imported from the entry point.

5. **Reload.** Call `extensions_reload`. The runtime restarts extension providers; affected canvas instances flip to `stale`, then back to `ready` once the provider reconnects. The runtime automatically re-invokes your `open()` (with `reason: "rehydrate"`) for previously-open instances using the input on file, so a new URL/port is captured.

6. **Verify it loaded.** Call `extensions_manage({ operation: "list" })` and `extensions_manage({ operation: "inspect", name: "<name>" })`. If the extension is marked failed, the `inspect` output includes a tail of its log file — that log path is the primary debugging surface, since stdout is reserved for JSON-RPC and `console.log` will corrupt the protocol.

7. **Drive it.** Run the validation checklist below via `list_canvas_capabilities`, `open_canvas`, and `invoke_canvas_action`.

## Extension shape

A canvas extension is a normal Copilot CLI extension running as a forked Node process that speaks JSON-RPC over stdio to the CLI. Constraints:

- Entry file **must** be named `extension.mjs` (only ES modules; TypeScript is not supported).
- Discovery scans only immediate subdirectories of `.github/extensions/` (relative to git root), `$COPILOT_HOME/extensions/`, and the current session's `$COPILOT_HOME/session-state/<sessionId>/extensions/`.
- The runtime auto-derives a stable `extensionId` of `${source}:${name}` (e.g. `project:my-extension`); session-scoped extensions embed the owning session id as `session:<sessionId>:<name>`. The CLI shadows at discovery time — if `.github/extensions/<name>/` exists, a user extension with the same `<name>` is dropped before loading, so the `user:<name>` provider never registers.
- `@github/copilot-sdk` is resolved automatically by the CLI — do **not** add a `package.json` or `node_modules` for it.
- `stdout` is reserved for JSON-RPC. **Never `console.log`.** Use `session.log(message, { level, ephemeral })` to surface anything to the user.
- If the extension also registers tools, names must be globally unique across all loaded extensions — collisions cause the second extension to fail to load.

A canvas extension can combine canvases with the rest of the SDK surface in the same `joinSession` call:

```js
import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";

const session = await joinSession({
    canvases: [createCanvas({ /* ... */ })],
    tools: [/* optional custom agent tools */],
    hooks: {/* optional onUserPromptSubmitted, onPreToolUse, onPostToolUse, onSessionStart, onSessionEnd, onErrorOccurred */},
    onPermissionRequest: async (request) => ({ kind: "approve-once" }), // optional
});
// session.sessionId, session.workspacePath (string | undefined),
// session.send, session.sendAndWait, session.log, session.on, session.rpc
```

See `docs/agent-author.md` and `docs/examples.md` for the full tool/hook/event surface.

## Injecting instructions

Two paths, depending on how persistent and how privileged the injected text needs to be:

- **`additionalContext` from hooks** (everyday path). `onSessionStart` and `onUserPromptSubmitted` can return `{ additionalContext: "..." }`. The runtime appends it as a `developer`-role message (see `docs/generated/session-events.d.ts`), distinct from the SDK-owned system prompt. Use `onSessionStart` for once-per-session guidance and `onUserPromptSubmitted` for per-turn nudges.
- **`systemMessage` on `joinSession`** (real system-prompt path). `JoinSessionConfig` inherits `systemMessage?: SystemMessageConfig` from `SessionConfigBase` (`types.d.ts`). For an extension, only two modes really make sense:
  - `{ mode: "append", content }` — append to the SDK foundation (default).
  - `{ mode: "customize", sections: {...}, content }` — override individual sections by ID (`identity`, `tone`, `safety`, `custom_instructions`, `runtime_instructions`, etc.) with `replace` / `remove` / `append` / `prepend` / transform-callback actions. Unknown section IDs fall back gracefully (content-bearing overrides go to additional instructions; `remove` on unknown is a silent no-op).

  A third mode, `{ mode: "replace", content }`, exists but **don't use it from an extension.** It throws away the entire SDK-managed prompt including security guardrails, and an extension is the wrong place to make that call — the user almost certainly doesn't expect installing your extension to silently strip their session's safety rules. It's there for hosts that own the full prompt; extensions should stick to `append` or `customize`.

Reach for `additionalContext` first; reach for `systemMessage` only when you actually need section-level control over the SDK-managed prompt.

## ID model

Three distinct identifiers, not interchangeable:

- **`canvasId`** — the canvas *type*, declared by the extension and shown in the `<canvases>` system-prompt section. Accepted by `list_canvas_capabilities` and `open_canvas`; not by `invoke_canvas_action`.
- **`extensionId`** — auto-derived `${source}:${name}` (e.g. `project:triage-board`). Only pass it to disambiguate when two extensions declare the same `canvasId` (the runtime returns `canvas_ambiguous` with the candidate list when you don't).
- **`instanceId`** — caller-invented handle for one running panel, free-form (slug or UUID), unrelated to `canvasId`. Two panels of the same canvas need two `instanceId`s. `invoke_canvas_action` and `close` take only `instanceId`. The runtime validates it against `^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$` — at most 128 characters, an alphanumeric first character, then only alphanumerics, `.`, `_`, or `-`. IDs that violate this (e.g. starting with `-`/`_`, containing spaces, or exceeding 128 chars) are rejected with `Invalid canvas instance ID`.

Example: `open_canvas({ canvasId: "triage-board", instanceId: "triage-1" })` then `invoke_canvas_action({ instanceId: "triage-1", actionName: "refresh" })`. See [State model](#state-model) for durable-storage keying.

## Canvas API

The canvas types live in `canvas.d.ts` and are re-exported from `@github/copilot-sdk/extension`. Summary:

```js
import { createCanvas, CanvasError, joinSession } from "@github/copilot-sdk/extension";

const canvas = createCanvas({
    id: "main",                  // CanvasDeclaration.id — unique within this extension
    displayName: "My canvas",    // human-readable label, shown in host chrome
    description: "Short summary the agent sees in the system-prompt canvas catalog.",
    inputSchema: { /* JSON Schema for open input (optional) */ },
    actions: [
        {
            name: "do_thing",                            // unique within this canvas; must NOT start with `canvas.`
            description: "...",
            inputSchema: { /* JSON Schema (optional) */ },
            handler: async (ctx) => {
                // ctx: { sessionId, extensionId, canvasId, instanceId, actionName, input, host }
                // Return the raw action result; throw CanvasError("code", "message") for errors.
                return { /* whatever the caller should receive */ };
            },
        },
    ],
    open: async (ctx) => {
        // ctx: { sessionId, extensionId, canvasId, instanceId, input, host }
        // Idempotent: same instanceId may arrive again after provider reconnect,
        // host re-open, or `extensions_reload`. Resolve the *domain* ID
        // (documentId, file path, record ID, etc.) from `input` and load/store
        // state under that ID in your own durable storage — never key persistent
        // state by `instanceId` alone. See "State model" below.
        return {
            url: "http://127.0.0.1:<loopback-port>/", // optional for native canvases
            title: "...",                              // optional, shown in host chrome
            status: "...",                             // optional, shown in host chrome
        };
    },
    onClose: async (ctx) => {
        // Optional. ctx: { sessionId, extensionId, canvasId, instanceId, host }
        // Fire-and-forget: return value ignored, errors logged but not surfaced.
    },
});

const session = await joinSession({ canvases: [canvas] });
```

Rules enforced by the runtime:

- Action names starting with `canvas.` are reserved and rejected at declaration time.
- Every entry in `actions[]` must have a `handler`; missing handlers fall through to `CanvasError.noHandler()`.
- Canvas-level `inputSchema` is validated before `open` runs; action-level `inputSchema` is validated before `invoke_canvas_action` dispatches. Failure returns `canvas_input_invalid` with structured Ajv details.
- Action handlers return the raw value directly — do **not** wrap in `{ ok, result, error }`. Throw `CanvasError("code", "message")` for errors.
- The canvas context field is `ctx.canvasId`, not `ctx.id`.

User-clickable affordances (buttons, menus, keyboard shortcuts) are the iframe's responsibility — the host renders no chrome around the canvas. Wire those controls in your iframe HTML and POST to your own loopback endpoints. `actions` are agent/host-SDK-facing only; they are not auto-rendered by the host.

## Renderer flow

After `open` returns, the runtime emits a `session.canvas.opened` event the host subscribes to:

- `reopen: false` → host creates / renders a new canvas instance.
- `reopen: true` → host focuses the existing instance and reloads the iframe against the URL the runtime currently has for that instance.
- `availability: "ready"` → provider is connected; routing works normally.
- `availability: "stale"` → no provider connected for `(extensionId, canvasId)`. Host shows a reconnecting affordance; routing calls fail with `canvas_provider_unavailable` until the provider reconnects, at which point the runtime re-emits a `ready` event automatically.

On agent-side resume, the host recovers live opens from `response.openCanvases ?? []` or `session.canvas.listOpen()`. The runtime also accepts an `openCanvases` seed on `session.resume` for app-alive / runtime-restarted cases. Once your provider re-registers with the same `extensionId/canvasId`, stale instances flip to ready.

## Iframe → extension

The host iframe loads the URL `open` returned. It has **no privileged bridge** to the host. Use ordinary HTTP:

- Serve static iframe assets and JSON state endpoints from a loopback `http.Server` bound to `127.0.0.1:0` (the OS picks a free port). Bind to **loopback only** — the host will only embed loopback URLs.
- Push state updates to the iframe with Server-Sent Events (`/events`) — simpler than a websocket, no deps.
- Iframe-initiated actions: `fetch` an extension HTTP endpoint, or skip the iframe entirely and only expose `actions`.

## App theme tokens

Extension canvases render in an isolated document, so they do not inherit the app's full stylesheet or React component library. The runtime mirrors the documented canvas theme contract onto your canvas document:

- Root/body attributes: `data-color-mode`, `data-dark-theme`, `data-light-theme`, `data-theme-source`, `data-theme-tone`, and `data-visual-mode`.
- Root/body class: `pointer-on-hover`.
- Theme variables: semantic app tokens such as `--background-color-default`, `--border-color-default`, `--text-color-default`, `--text-color-muted`, `--color-focus-outline`, and `--color-white`.
- True-color semantic variables: documented entries such as `--true-color-red`, `--true-color-red-muted`, `--true-color-blue`, and `--true-color-blue-muted`.
- Rampa stylesheet: the host also mirrors the generated Rampa stylesheet under the named `rampa` stylesheet contract, so raw palette variables such as `--n-0`, `--b-11-10`, and `--bb-11-10` are available as CSS variables in the canvas document. They are stylesheet-provided implementation tokens, not individually sanitized theme-payload variables; prefer semantic tokens unless you intentionally need custom palette work.
- Type ramp variables: documented typography entries such as `--font-sans`, `--font-mono`, `--font-weight-semibold`, `--text-body-medium`, and `--leading-body-medium`.
- Canvas CSS may override these tokens locally; the host injects them as defaults, not with `!important`.

Prefer these variables over hardcoded colors and font sizes unless the user requested a canvas that intentionally deviates from the app theme:

```css
body {
    margin: 0;
    background: var(--background-color-default, #ffffff);
    color: var(--text-color-default, #1f2328);
    font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
    font-size: var(--text-body-medium, 14px);
    line-height: var(--leading-body-medium, 20px);
}

h1 {
    font-family: var(--font-sans-display, var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif));
    font-size: var(--text-title-large, 26px);
    font-weight: var(--font-weight-semibold, 600);
    line-height: var(--leading-title-large, 32px);
}

code {
    font-family: var(--font-mono, "SFMono-Regular", Consolas, "Liberation Mono", monospace);
    font-size: var(--text-code-inline, 12px);
}
```

Only depend on the attributes, classes, and variables documented above. Any other CSS variables, class names, or styles you observe are app-internal implementation details, not part of the canvas extension contract, and can change without notice.

Pattern (matches the canvas scaffold output):

```js
import { createServer } from "node:http";
import { createCanvas, joinSession } from "@github/copilot-sdk/extension";

// One ephemeral-port loopback server per open canvas instance.
const servers = new Map(); // instanceId → { server, url }

async function startServer(instanceId) {
    const server = createServer((req, res) => {
        // Route static assets, JSON state, SSE /events, action POSTs, etc.
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(renderHtml(instanceId));
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const port = server.address().port;
    return { server, url: `http://127.0.0.1:${port}/` };
}

await joinSession({
    canvases: [
        createCanvas({
            id: "my-canvas",
            displayName: "My canvas",
            description: "...",
            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(ctx.instanceId);
                    servers.set(ctx.instanceId, entry);
                }
                return { title: "My canvas", url: entry.url };
            },
            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise((r) => entry.server.close(() => r()));
                }
            },
        }),
    ],
});
```

## Host-side actions

When chat / palette / shortcuts / tests need to round-trip through runtime routing, use the host SDK:

```ts
await client.session.canvas.open({ canvasId, instanceId, input }); // extensionId optional
await client.session.canvas.close({ instanceId });
const { result } = await client.session.canvas.action.invoke({ instanceId, actionName, input });
```

`extensionId` on `open` is optional — runtime resolves the unique provider for the `canvasId`. Supply it only when two providers declare the same `canvasId` (returns `canvas_ambiguous` with the candidate list). Re-opening the same `instanceId` is the focus path: the runtime emits `session.canvas.opened` with `reopen: true`; for extension canvases the host focuses the existing panel and reloads the iframe without invoking the provider.

## State model

**`instanceId` identifies the panel, not the data.** It names a right-panel view the host can focus, reload, or close. It is transient: iframes reload, extensions restart, the app restarts, and the agent may open a fresh `instanceId` for what the user thinks of as "the same thing." Never use `instanceId` as the storage key for anything a user expects to keep.

**Attach state to whatever scope actually owns it.** Pick the smallest scope that matches the data's real lifetime, and pick a storage location the user can reason about (and inspect on disk if they want):

- **Per session / workspace** — anything scoped to "this conversation" or "this project session" (scratch notes, in-progress drafts, ephemeral working state). Write **artifact files into `session.workspacePath`** (from the `CopilotSession` returned by `joinSession({...})`). These live alongside the session's other artifacts so the user can browse/inspect them and they're cleaned up with the session. The CLI always provides `workspacePath`; SDK type is `string | undefined`, so handle the undefined branch defensively.
- **Per user / global** — preferences, recently-opened lists, snippet collections, or any catalog the user expects to follow them across sessions. Write under `$COPILOT_HOME/extensions/<extension-name>/artifacts/`. `$COPILOT_HOME` defaults to `~/.copilot` when unset. Use this location even for project-scope extensions — don't write user-global data into the repo.
- **Per artifact / document with its own identity** — when one logical artifact (a specific document, file, or record) is what the canvas operates on, store under a stable `documentId` / file path / record ID and pass (or derive) that ID via `input` when opening. Place the file in whichever scope matches the artifact's intended lifetime.
- **In-repo, committed artifacts** — it's expected that some canvases operate on files that live in the repo (architecture diagrams, ADRs, design docs, structured planning files, schema definitions, etc.). Write the artifact to a sensible repo path. Treat the file path itself as the durable ID; the canvas just renders/edits that path.
- **Per panel (`instanceId`)** — only ephemeral UI state that genuinely should not survive a reload (scroll position, transient form drafts you're OK losing).

**When scope is ambiguous, ask the user.** If you can't tell whether the user wants the artifact scoped to the current session, the project, or globally, ask before creating it. Bad defaults are sticky — a "global" artifact the user thought was session-scoped is harder to fix than a quick clarifying question.

Resolve the owning ID in `open()` from `input` (or your own lookup), load the persisted state for that ID, and render. The same `documentId` opened under two different `instanceId`s should show the same content.

In-memory module-level `Map` state is fine for throwaway demos but is ephemeral and per provider process. Anything users expect to keep across iframe reloads, extension reloads, app restarts, or fresh `instanceId`s must live in a durable store (artifact file, session workspace, user preferences, external service) — not in module memory.

Concrete example: if two iframes use different `instanceId` values, content stored only in `Map<instanceId, State>` will look lost when the second view opens. Store the content under a stable domain ID (artifact-scoped), and have both canvases load by that ID.

## Validation checklist

Validate via RPC calls and returned payloads. Iframe rendering and host panel state aren't directly observable from chat.

1. **Discovery** — confirm your canvas appears in the `<canvases>` section of the system prompt (gated on the `canvas-renderer` capability). Then verify `list_canvas_capabilities({ canvasId })` returns your `actions[]`. Pass `extensionId` only if multiple providers register the same `canvasId`. Keep `description` short and descriptive — a single sentence the agent reads to decide whether to open the canvas.
2. **Open** — call `open_canvas({ canvasId, input? })`. Confirm you receive `{ instanceId, url? }` and no error.
3. **Action** — call `invoke_canvas_action({ instanceId, actionName, input? })` and confirm it returns without error and the response payload looks right.
4. **Input validation** — call `open_canvas` with input that fails `inputSchema`. Expect `canvas_input_invalid` before `open` runs.
5. **Reserved verb rejection** — call `invoke_canvas_action(instanceId, "canvas.open", ...)`. Expect `canvas_reserved_action_name`.

## Debugging

When something doesn't work, work the tooling in this order:

1. `extensions_manage({ operation: "list" })` — is the extension loaded? Is it marked `failed`?
2. `extensions_manage({ operation: "inspect", name: "<name>" })` — surfaces the log file path and a tail of the log. This is the primary debugging surface; any uncaught throw in `extension.mjs`, a `console.log` accidentally corrupting JSON-RPC, or a missing dependency will show up here.
3. After editing the extension, **always** `extensions_reload` before re-running RPC calls — stale provider code is a common source of "nothing changed" confusion.
4. To force the iframe to reload immediately without waiting for the next stale→ready cycle, call `open_canvas` again with the same `instanceId`. The host focuses the existing panel and reloads the iframe against whatever URL the runtime currently has for that instance.
5. If discovery doesn't pick the extension up at all, double-check the file is named exactly `extension.mjs` and lives in an immediate subdirectory of `.github/extensions/`, `$COPILOT_HOME/extensions/`, or the session's `$COPILOT_HOME/session-state/<sessionId>/extensions/`.

## Sharing extensions via Gist

Users can share and install extensions via private GitHub gists from the command palette ("Share extension as gist…" / "Install extension from gist…"), or via the `share_extension` / `install_extension` tools. The gist format is:

- One **flat** layer of files (gists don't support nested directories).
- A `copilot-extension.json` manifest file with shape `{ "name": "<extension-name>", "version": 1 }`. This is the only field used to validate that the gist is a Copilot extension; the install flow refuses gists that lack it.
- Hidden files are skipped except for a small allow-list (`.gitignore`, `.npmrc`, `.nvmrc`, `.node-version`).
- Per-file cap: ~1 MB. Total cap: ~5 MB. Binary (non-UTF-8) files are refused.

Subdirectories are preserved: the share flow walks the extension folder recursively and encodes `/` as `\` in gist file names (gist keys cannot contain `/`), then decodes on install. So `assets/icon.svg` and `src/util/helpers.js` both round-trip correctly. `node_modules/`, `dist/`, `build/`, `.git/`, and other hidden directories (except `.github/`) are skipped during share. The destination scope on install is chosen by the user, not the gist — the same gist can be installed to `.github/extensions/<name>/`, `$COPILOT_HOME/extensions/<name>/`, or the current session's `$COPILOT_HOME/session-state/<sessionId>/extensions/<name>/`.

## Common pitfalls

- **`console.log` corrupts JSON-RPC.** Use `session.log()` for any user-visible messaging; the log file (via `extensions_manage inspect`) is the place for debug output.
- Do not declare custom action names that start with `canvas.`.
- Do not forget to wire a `handler` on every declared `actions[]` entry; otherwise dispatch falls through.
- Bind embedded servers to **loopback only**. The host only embeds loopback URLs.
- Re-opening the same extension `instanceId` reloads the iframe, and `open` may also be re-invoked after provider reconnect — treat it as idempotent and rehydrate from durable storage per the [State model](#state-model) section.
- Runtime validates canvas-level `inputSchema` before `open` and action-level `inputSchema` before `invoke_canvas_action`. On failure it returns `canvas_input_invalid` with structured Ajv details and does not dispatch.
- Return raw values from action handlers; throw `CanvasError("code", "message")` for errors.
- The canvas context field is `ctx.canvasId`, not `ctx.id`.
- If the extension also contributes `tools[]`, tool names must be globally unique across all loaded extensions — collisions cause the second extension to fail to load.
- `extension.mjs` only. `.ts` is not supported. The `@github/copilot-sdk` import is auto-resolved; do not add a `package.json` for it.
