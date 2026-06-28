# Contract — Foundations JSON envelope & result v1 (004)

A **separate** JSON contract for `neuraz-ds foundations --json`. It does NOT reuse, extend, or modify
003's `JsonEnvelopeV1`, `JSON_FORMAT_VERSION`, or the validate/inspect payloads. It reuses only the
deterministic low-level formatting (`JSON.stringify(env, null, 2) + "\n"`).

## Envelope

```ts
const FOUNDATIONS_JSON_FORMAT_VERSION = "1.0.0"; // independent of 003

type FoundationsJsonEnvelopeV1 =
  | { formatVersion: "1.0.0"; command: "foundations";
      outcome: "valid" | "complete-invalid" | "partial" | "read-error";
      result: JsonFoundationsResultV1 }
  | { formatVersion: "1.0.0"; command: "foundations"; outcome: "not-found";
      result: null; error: { code: string; message: string } | null }
  | { formatVersion: "1.0.0"; command: "foundations"; outcome: "internal-error";
      result: null; error: { code: "internal-cli-error"; message: string } };
```

Four base fields always present; `error` only in `not-found` (reserved → `null` in v1, since
`hostError` is not populated) and `internal-error`. Canonical key order: `formatVersion, command,
outcome, result[, error]`. Serialization: 2-space indent + trailing newline; deterministic; no
timestamps/UUID/env; no `undefined`.

## Result

```ts
interface JsonFoundationsResultV1 {
  host: { root: string; designSystemPath: string | null } | null;
  structuralState: string;
  categories: ReadonlyArray<{
    id: string; state: "absent" | "partial" | "complete" | "invalid";
    validationDepth: "deep" | "shallow";
    counts: { total: number; primitive: number; semantic: number; unclassified: number };
    tokens: ReadonlyArray<JsonFoundationTokenV1>;   // ALL tokens (no 200 cap)
    issues: ReadonlyArray<JsonFoundationIssueV1>;
  }>;                                                // exactly 9, canonical order
  unresolved: ReadonlyArray<JsonFoundationTokenV1>;
  summary: { categories: { absent: number; partial: number; complete: number; invalid: number };
             tokens: { total: number; primitive: number; semantic: number; unclassified: number; unresolved: number };
             errors: number; warnings: number };
  validation: { valid: boolean; errors: JsonFoundationIssueV1[]; warnings: JsonFoundationIssueV1[];
                limits: { reached: boolean; partial: boolean; hits: { limit: string; detail: string }[] } };
  limits: { reached: boolean; partial: boolean; hits: { limit: string; detail: string }[] };
}

interface JsonFoundationTokenV1 {
  path: string; category: string;            // category id or "unresolved"
  level: "primitive" | "semantic" | "unclassified";
  levelSource: "token" | "group" | "none" | "invalid"; levelSourcePath: string | null;
  effectiveType: string | null; kind: "concrete" | "alias";
  aliasTarget: string | null; aliasState: string; trust: string;
}

interface JsonFoundationIssueV1 {
  severity: "error" | "warning"; code: string; message: string;
  document: string | null; path: string | null;
}
```

## Compatibility (hard requirement)

`validate --json` and `inspect --json` MUST remain **byte-identical** to 003. Regression tests assert
their output and `JSON_FORMAT_VERSION` are unchanged. Foundations JSON is additive and isolated.

## Example — `valid` (init DS just classified; abbreviated)

```json
{
  "formatVersion": "1.0.0",
  "command": "foundations",
  "outcome": "partial",
  "result": {
    "host": { "root": "/project", "designSystemPath": "/project/design-system" },
    "structuralState": "complete-valid",
    "categories": [
      { "id": "color", "state": "partial", "validationDepth": "deep",
        "counts": { "total": 2, "primitive": 0, "semantic": 0, "unclassified": 2 },
        "tokens": ["…2 JsonFoundationTokenV1…"], "issues": [] }
      /* … spacing … motion, all "absent" … */
    ],
    "unresolved": [],
    "summary": { "categories": { "absent": 8, "partial": 1, "complete": 0, "invalid": 0 },
                 "tokens": { "total": 2, "primitive": 0, "semantic": 0, "unclassified": 2, "unresolved": 0 },
                 "errors": 0, "warnings": 2 },
    "validation": { "valid": false, "errors": [], "warnings": ["…unclassified…"],
                    "limits": { "reached": false, "partial": false, "hits": [] } },
    "limits": { "reached": false, "partial": false, "hits": [] }
  }
}
```

> The init DS has no foundation metadata, so its two color tokens are `unclassified` → `color` is
> `partial`, global `partial`, exit 4. Arrays abbreviated for the contract doc only; real output is
> complete.
