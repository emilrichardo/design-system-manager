# Contract — Preset Catalog v1

## Assets

```text
presets/
├── catalog.json
└── <id>.preset.json
```

`presets/catalog.json` is package data, included in the npm tarball with the individual preset
envelopes. Runtime resolution must use package-relative URLs from compiled ESM, not `process.cwd()`.

## Catalog Shape

```ts
interface PresetCatalogV1 {
  readonly formatVersion: "1.0.0";
  readonly presets: readonly PresetCatalogItemV1[];
}

interface PresetCatalogItemV1 {
  readonly id: string;
  readonly file: string;
}
```

## Invariants

- `presets` order is the public list order.
- IDs are unique and match the envelope `id`.
- `file` is a relative file name under `presets/`, no path separators escaping the directory.
- Missing/corrupt catalog or asset yields `invalid-preset` for affected operations or safe internal
  packaging failure in tests; it never executes code or reaches network.

## List Result

`listPresets` returns catalog entries projected from validated envelope metadata:

```ts
interface PresetCatalogEntryV1 {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly includedCategories: readonly string[];
}
```

No absolute asset path is exposed.
