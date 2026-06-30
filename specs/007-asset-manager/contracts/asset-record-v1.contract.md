# Contract: AssetRecordV1 (MIME / size / dimensions / hash)

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: asset probes (MIME detector, dimension reader, hasher), font validator
- **Consumers**: manifest, import plan, inspection, JSON envelope

## Schema Concept

```text
detectMime(bytes) -> AssetMimeType | null      # by signature, extension is a hint only
hash(bytes) -> sha256-lowercase-hex
readDimensions(bytes, mime) -> { width, height, unit } | null
validateFont(bytes, mime) -> { ok: boolean; code: string|null; message: string|null }

AssetMimeType ∈ {
  font/woff2, font/woff, font/ttf, font/otf,
  image/png, image/jpeg, image/webp, image/gif, image/avif,
  image/svg+xml
}
```

## Invariants

- Pure and deterministic: no filesystem, clock, random, network, process, rendering or external tools.
- MIME is derived from content signature; a file whose signature is unknown/unsupported ⇒ `null` (the
  candidate is later `blocked`).
- Hash is SHA-256 over **exact** bytes, lowercase hex.
- Dimensions are read from headers only (PNG IHDR, JPEG SOF, GIF screen descriptor, WebP VP8/VP8L/VP8X,
  AVIF `ispe`, SVG `width`/`height`/`viewBox`); undeterminable ⇒ `null` (never guessed).
- Font validation checks signatures (`wOF2`, `wOFF`, sfnt `0x00010000`/`true`/`OTTO`) and minimal
  structure; it never converts/subsets.
- `unit` is `px` for raster, `user` for SVG user units, `null` when unknown.

## Out of scope

Image decoding/optimization, font conversion/subsetting, color/EXIF analysis, any AI inference.
