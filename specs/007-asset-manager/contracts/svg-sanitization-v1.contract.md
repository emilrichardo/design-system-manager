# Contract: SvgSanitizationV1

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: SVG sanitizer (infrastructure, pure transform over bytes/text)
- **Consumers**: `planAssetImport` (preview), `applyAssetImport` (writes sanitized bytes)

## Schema Concept

```text
sanitizeSvg(input: bytes) -> {
  safe: boolean
  bytes: Uint8Array | null            # sanitized output when safe; null when blocked
  report: {
    safe: boolean
    removed: string[]                 # stable codes: "script", "event-handler", "external-ref",
                                      #   "foreign-object", "doctype", "entity", "unknown-element", …
    reason: string | null             # why blocked when safe:false
  }
}
```

## Invariants

- Allowlist-based: only known-safe SVG elements/attributes are kept; everything else is removed.
- Always removes: `<script>`, all `on*` event handlers, external `href`/`xlink:href` (non-`data:`),
  `<foreignObject>`, `<!DOCTYPE>`/external entities, and any active/embedded content.
- The sanitizer **never executes** SVG and never resolves external references or network resources.
- If the input cannot be reduced to well-formed, safe SVG, `safe:false`, `bytes:null`, and the candidate
  is `blocked` (`svg-unsafe`).
- Deterministic and pure: same input ⇒ same output bytes and report; no filesystem/clock/random/network.
- The asset store only ever receives sanitized bytes; raw unsafe SVG is never written.

## Out of scope

SVG editing/optimization/minification beyond what sanitization requires; rendering; rasterization.
