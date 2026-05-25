# PDF Renderer Spike: pdfme vs @react-pdf/renderer

> **Sprint 62 — Phase 17 DX & Bundle Optimization**
> Evaluated: 2025 | Status: **Decision recorded — keep @react-pdf/renderer**

---

## 1. Context

Cabinet Planner generates multi-page PDF cut-plans and BOM reports via
`src/components/pdf/CabinetPdfDocument.tsx`. The renderer
(`@react-pdf/renderer ^4.5.1`) is the largest single dependency in the bundle.
This spike evaluates whether switching to **pdfme** would meaningfully improve
bundle size and developer experience without regressing PDF quality.

---

## 2. Candidates

| Criterion | @react-pdf/renderer v4.5.1 | pdfme v4.x |
|-----------|---------------------------|-----------|
| Bundle size (minified+gzip) | ~285 KB (lazy chunk) | ~95 KB |
| API style | JSX components (`<Document>`, `<Page>`, `<View>`) | JSON template + `generate(inputs)` |
| Font embedding | Built-in (`Font.register`) | Built-in (`fonts` in template schema) |
| Images | `<Image src={...}>` | Base64 string in template |
| Dynamic layout | Full React layout model — arbitrary nesting | Fixed column/row schema; dynamic data via `inputs` array |
| RTL text (HE/AR) | Native, tested | Experimental — bidirectional text requires manual shaping |
| Complex tables | Native flexbox-style layout | Grid-only; spanning cells unsupported |
| TypeScript types | Excellent | Good |
| React integration | Native — hooks, context, i18n work transparently | None — imperative async API |
| Active maintenance | GitHub: diegomura/react-pdf — active | GitHub: pdfmeHQ/pdfme — active |
| License | MIT | MIT |

---

## 3. Migration Complexity

### What would need to change

- `CabinetPdfDocument.tsx` (607 lines) completely rewritten as JSON template definitions
- All 6 i18n locales would need string injection via `inputs[]` instead of `useTranslation()`
- RTL support (HE, AR) is currently automatic via `@react-pdf/renderer`'s Unicode bidi
  algorithm. pdfme has no equivalent — manual bidirectional text shaping would be required.
- Multi-page layout (dynamic row count, page breaks) would require custom pagination logic
- All `tests/components/pdf/` tests would be rewritten
- Worker off-thread rendering pattern (`bom-export.worker.ts`) still compatible with pdfme

### Estimate

| Phase | pdfme migration effort |
|-------|----------------------|
| Template authoring (replace JSX) | 3–4 days |
| RTL / bidi shaping (HE + AR) | 2–3 days |
| i18n wiring (no React context) | 1 day |
| Test rewrite | 1 day |
| QA + regression | 1–2 days |
| **Total** | **8–11 developer-days** |

---

## 4. Bundle Impact

The `@react-pdf/renderer` chunk is **already isolated** in a dedicated Vite
split (`pdf-renderer` manualChunk added in Sprint 63). It is never included in
the initial JS payload — it loads only when the user opens the PDF export panel.

```
Initial bundle (excl. pdf-renderer chunk): ~220 KB gzip
pdf-renderer lazy chunk:                   ~285 KB gzip   ← loads on demand
pdfme equivalent (hypothetical):           ~95 KB gzip
```

**Savings if migrated**: ~190 KB on a lazy chunk that the user explicitly
requests. The initial load time is **not affected**.

---

## 5. Decision

**Keep `@react-pdf/renderer`.**

Rationale:

1. **Bundle savings are on a lazy chunk.** The 190 KB saving only applies after
   the user triggers PDF export — it does not improve Time-to-Interactive or
   Lighthouse scores.
2. **RTL support is a hard blocker.** HE and AR are first-class locales.
   Implementing correct bidirectional text in pdfme would require a custom
   Unicode bidi algorithm (or integrating `bidi-js` / `fribidi-wasm`),
   neutralising most of the bundle saving and adding 2–3 days of risky work.
3. **Migration cost vs. benefit ratio is poor.** 8–11 developer-days for a
   ~190 KB saving on a lazy chunk that is never in the critical path.
4. **@react-pdf/renderer is already well-integrated.** i18n context, Zustand
   state, and TypeScript types all work transparently. The existing 607-line
   `CabinetPdfDocument.tsx` produces high-quality output and is fully tested.

### Future re-evaluation triggers

- If pdfme ships first-class RTL/bidi support
- If the `pdf-renderer` chunk grows beyond 500 KB gzip
- If pdfme adds a React wrapper that eliminates the migration cost

---

## 6. References

- [@react-pdf/renderer](https://github.com/diegomura/react-pdf) — v4.5.1
- [pdfme](https://github.com/pdfmeHQ/pdfme) — v4.x
- [Sprint 63 — chunk strategy](../vite.config.ts) — `pdf-renderer` manualChunk
- [CabinetPdfDocument.tsx](../src/components/pdf/CabinetPdfDocument.tsx)
