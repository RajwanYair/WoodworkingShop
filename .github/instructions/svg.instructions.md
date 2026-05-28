---
applyTo: 'src/components/**/*.tsx,src/components/**/*.ts,docs/*.svg,public/*.svg'
---

# SVG Instructions — Cabinet Planner

These instructions apply to all SVG rendering code in `src/components/` and all
standalone `.svg` assets under `docs/` and `public/`.

## Core constraints

- **Dark-mode safe**: use `stroke="currentColor"` (with `strokeOpacity`) instead of
  hardcoded hex colours for structural outlines — Tailwind `dark:` class changes
  `color` and `currentColor` adapts automatically
- **No hardcoded grays for structure**: `#444`, `#666`, `#888`, `#aaa` are only
  acceptable for decorative details (grain lines, shadows) — never for primary strokes
- **Filter IDs are SVG-scoped**: IDs such as `part-shadow`, `part-hover-glow`,
  `iso-handle-grad` are unique per `<svg>` element — no conflicts on pages with multiple SVGs

## Visual quality standards (v5.21.0 baseline)

### Drop shadows

Use `<filter id="part-shadow">` with `<feDropShadow>` for panel parts:

```svg
<feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.18" />
```

### Hover effects

Glow filter for hovered parts (`id="part-hover-glow"`):

```svg
<feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#FFD700" floodOpacity="0.5" />
```

### Hardware colors (handles, hinges)

- **Fill**: golden gradient `iso-handle-grad` — `#e8c060` → `#c8a040` → `#a07820`
- **Stroke**: `#a07820`
- **strokeWidth**: 0.4–0.5

### Ambient occlusion

Add a semi-transparent dark polygon at bottom edges of side faces (isometric views):

```tsx
fill="#000" opacity={0.12..0.18} pointerEvents="none"
```

### Glass shine (door overlays)

Use two overlapping lines for dual-highlight effect:

- Primary: `stroke="#ffffff" strokeWidth={2} opacity={0.56}`
- Secondary: `stroke="#ffffff" strokeWidth={1} opacity={0.31}`

### Grid backgrounds (toolpath / GCode views)

Use `<pattern>` with `patternUnits="userSpaceOnUse"` for graph-paper overlay:

- Pattern stroke: `#555`, opacity `0.25`

## Coordinate systems

### 2D views (Cabinet views)

- Scale: `S = 0.2` — `mm → SVG px`
- `W = width * S`, `H = height * S`, `D = depth * S`

### Isometric view (IsometricView.tsx)

- Scale: `sc = 0.18`
- `iso(x, y, z)` function returns `[svgX, svgY]` using 30° angles
- `x` → right face (width direction)
- `y` → down (height direction)
- `z` → depth direction

## SVG asset versioning (docs/banner.svg, docs/features.svg)

- Update version badges whenever `package.json#version` changes
- Test count badges in banner.svg must match current `vitest run --reporter=json` pass count
- Use `text-anchor="middle"` for centered labels; `dominant-baseline="middle"` for vertical centering

## Accessibility

- Every interactive SVG element must have a `<title>` child with descriptive text
- Non-decorative SVG icons need `aria-label` on the parent `<svg>` or `role="img"`
- Decorative elements get `aria-hidden="true"`
- Hover-only interactions must be keyboard-accessible (`onKeyDown` / `onFocus` fallback)

## React / JSX SVG rules

- Use `fillOpacity` (camelCase) not `fill-opacity`
- Use `strokeWidth` not `stroke-width`
- Use `strokeLinecap` not `stroke-linecap`
- `pointerEvents="none"` on decorative overlays to prevent blocking hover state
- Filter references: `filter="url(#part-shadow)"` — must match an ID inside the
  same `<svg>` element's `<defs>` block
