# Contract — Preset Apply Result v1

## Outcomes

```ts
type PresetApplyOutcomeV1 =
  | "applied"
  | "unchanged"
  | "conflict"
  | "invalid-preset"
  | "not-found"
  | "read-error"
  | "write-error"
  | "verification-error";
```

`internal-error` is CLI-only and belongs to the JSON/command contract, not the headless apply result.

## Shape

```ts
interface PresetApplyResultV1 {
  readonly outcome: PresetApplyOutcomeV1;
  readonly preset: PresetCatalogEntryV1 | null;
  readonly targetFile: "design-system/tokens/base.tokens.json" | null;
  readonly plan: PresetApplicationPlanV1 | null;
  readonly wrote: boolean;
  readonly verification: PresetVerificationV1 | null;
  readonly notFoundResource: "preset" | "design-system" | null;
  readonly backup: { readonly relativePath: string } | null;
  readonly error: { readonly code: string; readonly message: string } | null;
}

interface PresetVerificationV1 {
  readonly checked: boolean;
  readonly valid: boolean;
  readonly contributedTokensPresent: boolean;
  readonly newStructuralErrors: readonly PresetConflictV1[];
}
```

## Outcome Semantics

| Outcome | Wrote | Meaning |
|---|---:|---|
| `applied` | true | write succeeded and post-write verification passed |
| `unchanged` | false | plan has no creates/updates; no write attempted |
| `conflict` | false | blocking conflict or concurrent modification |
| `invalid-preset` | false | bundled preset failed validation |
| `not-found` | false | preset or host DS target not found; `notFoundResource` distinguishes which |
| `read-error` | false | host target could not be safely read/analyzed |
| `write-error` | false | write failed before replacement completed; original preserved |
| `verification-error` | true | replacement happened but post-write verification failed |

## Verification Failure

V1 does not automatically restore the original after a successful replacement followed by failed
verification. The result must report `verification-error`, `wrote: true`, sanitized details, and a
retained same-directory backup path in `backup`. The target file remains on disk for user inspection;
the backup exists for manual recovery and is deleted on successful verification.
