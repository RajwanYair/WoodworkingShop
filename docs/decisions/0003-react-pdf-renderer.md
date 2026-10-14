# ADR-0003: React PDF for Document Export

- Status: Accepted
- Date: 2026-10-13

## Context

The application exports multi-page build plans, cut lists, and BOMs with dynamic pagination,
localized content, and Hebrew/Arabic text. The PDF renderer is isolated behind the lazy-loaded PDF
export panel, so users do not load it on the initial route. A prior evaluation compared
`@react-pdf/renderer` with pdfme and recorded bundle, RTL, layout, and migration trade-offs in the
[PDF renderer spike](../PDF-RENDERER-SPIKE.md). See also [document
component](../../src/components/pdf/CabinetPdfDocument.tsx) and [build
configuration](../../vite.config.ts).

## Decision

Keep `@react-pdf/renderer` for PDF generation. Preserve lazy loading and the existing React component-based document model. Do not migrate to a different renderer solely to reduce the PDF chunk; revisit if a candidate provides equivalent tested RTL and pagination with a material end-user benefit.

## Consequences

Existing React localization and layout code remains usable, and no headless browser is required. The renderer remains a large dependency and its output requires regression tests for page content, geometry, localization, and size. Bundle changes must continue to keep it out of the initial route. The prior pdfme comparison is historical evidence; re-evaluate current versions and RTL support before any future migration.
