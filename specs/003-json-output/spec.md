# Feature Specification: Machine-readable JSON output for validate and inspect

**Feature Branch**: `003-json-output`

**Created**: 2026-06-27

**Status**: Draft

**Input**: Add `--json` flag to `neuraz-ds validate` and `neuraz-ds inspect` commands so that
scripts, CI pipelines, GitHub Actions, agents, MCP servers, and other consumers can receive
structured, versioned JSON output. The JSON output reuses the existing headless use-case results
without performing a second analysis pass.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Validate JSON output for valid DS (Priority: P1)

As a developer or CI process, I want to run `neuraz-ds validate --json` and receive a structured
JSON document on stdout that tells me whether the Design System is valid, including any warnings,
so I can automate quality gates without parsing human-readable text.

**Why this priority**: This is the foundational use case — a valid DS producing clean JSON is the
baseline that every consumer depends on.

**Independent Test**: Run `validate --json` against a project initialized with `neuraz-ds init`;
parse stdout as JSON; verify `outcome` is `"valid"`, `result.valid` is `true`, exit code is `0`,
and stderr is empty.

**Acceptance Scenarios**:

1. **Given** a fully initialized and valid DS, **When** `neuraz-ds validate --json` is executed,
   **Then** stdout contains exactly one JSON document (2-space indented, trailing newline), with
   `formatVersion` `"1.0.0"`, `command` `"validate"`, `outcome` `"valid"`, `result.valid` `true`,
   all expected fields present, stderr empty, exit `0`.

2. **Given** a valid DS with a recognized-but-not-deeply-supported DTCG type (e.g. `dimension`),
   **When** `validate --json` is executed, **Then** `outcome` is `"valid"`, `result.valid` is
   `true`, `result.warnings` contains a `dtcg-type-not-deeply-inspected` issue, exit `0`.

---

### User Story 2 — Validate JSON output for invalid or error states (Priority: P1)

As an automated tool, I want to receive structured errors and warnings even when `validate --json`
exits with a non-zero code, so I can programmatically diagnose the problem without parsing
human text.

**Why this priority**: Equally essential — consumers must handle every outcome, not just success.

**Independent Test**: Set up each failing state (invalid tokens, partial structure, missing DS,
unreadable file), run `validate --json`, verify JSON is parseable, `outcome` matches expected
value, exit code matches the human-mode exit code, and stderr is empty.

**Acceptance Scenarios**:

1. **Given** a DS with an unrecognized DTCG `$type`, **When** `validate --json` is executed,
   **Then** `outcome` is `"complete-invalid"`, `result.valid` is `false`,
   `result.errors` includes the structured issue, exit `3`.

2. **Given** a DS with missing managed documents (partial structure), **When**
   `validate --json` is executed, **Then** `outcome` is `"partial"`,
   `result.limits.partial` is `true`, exit `4`.

3. **Given** a project with no DS configuration at all, **When** `validate --json` is
   executed, **Then** `outcome` is `"not-found"`, `result` is `null`, exit `5`.

4. **Given** a tokens file with invalid UTF-8 bytes, **When** `validate --json` is executed,
   **Then** `outcome` is `"read-error"`, `result` contains recoverable information, exit `6`.

---

### User Story 3 — Inspect JSON output with full token data (Priority: P1)

As an external consumer (agent, MCP server, dashboard), I want to run
`neuraz-ds inspect --json` and receive identity, files, token statistics, all token paths,
validation results, and limits in a structured JSON document, with no visual truncation applied.

**Why this priority**: The inspect JSON is the primary integration surface for downstream tools.

**Independent Test**: Create a DS with >200 tokens; run `inspect --json`; verify JSON contains
all token paths (not capped at 200), identity fields use `InspectedValue` format with `trust`,
statistics are complete, and no truncation messages appear.

**Acceptance Scenarios**:

1. **Given** a valid DS with 2 tokens, **When** `inspect --json` is executed, **Then** stdout
   contains JSON with identity (name, slug, version as `InspectedValue`), files (expected,
   present, missing), tokens statistics, all token paths, validation, and limits; exit `0`.

2. **Given** a DS with 250 tokens, **When** `inspect --json` is executed, **Then** JSON
   contains all 250 token paths (no 200-row cap), no truncation message, statistics show
   `total: 250`.

---

### User Story 4 — Inspect JSON for recoverable states (Priority: P1)

As an agent or automated pipeline, I want to receive recoverable inspection data from a DS that
is partial or invalid, with trust markers indicating data reliability, so I can still extract
useful information from imperfect states.

**Why this priority**: Real-world DS are often in transition; consumers must handle every state.

**Independent Test**: Set up partial and invalid states; run `inspect --json`; verify
`inspection` is present (not null), `structuralState` matches, trust values are correct.

**Acceptance Scenarios**:

1. **Given** a DS with validation errors (complete-invalid), **When** `inspect --json` is
   executed, **Then** `outcome` is `"complete-invalid"`, `result` includes recoverable
   inspection with trust markers, exit `3`.

2. **Given** a partial DS, **When** `inspect --json` is executed, **Then** `outcome` is
   `"partial"`, recoverable data is present with appropriate trust levels, exit `4`.

3. **Given** a project with no DS, **When** `inspect --json` is executed, **Then**
   `outcome` is `"not-found"`, `result` is `null`, exit `5`.

---

### User Story 5 — Clean stdout for machines (Priority: P1)

As a script piping output to `jq`, a file, or another process, I want stdout to contain
**exclusively** valid JSON when `--json` is used: no ANSI codes, no spinner characters, no
Clack symbols, no table borders, no human text before or after the JSON.

**Why this priority**: If stdout is polluted, `jq` and `JSON.parse` break — the feature is
useless.

**Independent Test**: Redirect stdout to a file; confirm `JSON.parse(file)` succeeds; confirm
file starts with `{` and ends with `}\n`; confirm no ANSI escape sequences.

**Acceptance Scenarios**:

1. **Given** `--json` is passed, **When** any expected outcome occurs, **Then** stdout
   contains exactly one JSON object starting with `{`, ending with `}\n`, with no preceding
   or trailing bytes.

2. **Given** `--json` is passed and stdout is redirected to a file (non-TTY), **When** the
   command completes, **Then** the file is valid JSON parseable by any standard JSON parser.

---

### User Story 6 — Human output compatibility (Priority: P1)

As a user running `validate` or `inspect` without `--json`, I want the CLI behavior to remain
exactly as it was before this feature: same reporters, same text, same exit codes, same 200-row
cap in inspect, same stdout/stderr separation.

**Why this priority**: Existing users and CI integrations must not break.

**Independent Test**: Run the full existing 002 test suite; all 589 tests must pass unchanged.

**Acceptance Scenarios**:

1. **Given** `validate` is run without `--json`, **When** any state is encountered, **Then**
   output and exit codes are identical to pre-003 behavior.

2. **Given** `inspect` is run without `--json` on a DS with >200 tokens, **When** the command
   completes, **Then** the 200-row cap message appears as before.

---

### User Story 7 — Headless-reusable DTO and mappers (Priority: P2)

As a developer building future integrations (TUI, MCP, Studio), I want the JSON DTO types and
mapper functions to be usable without importing CLI, terminal, or Node-specific modules, so I can
serialize the same JSON from any presentation layer.

**Why this priority**: Architectural correctness — headless is a constitutional principle, but
consumers currently only need CLI output.

**Independent Test**: Import DTO types and mapper functions; verify they compile and execute
without Commander, Clack, Node fs, ANSI, or TTY dependencies; verify arch-guard passes.

**Acceptance Scenarios**:

1. **Given** DTO types and mappers exist, **When** they are imported in a test without any
   CLI or infrastructure dependency, **Then** they compile and produce correct JSON objects.

---

### User Story 8 — Safe internal error envelope (Priority: P2)

As an automated process, I want to distinguish a CLI internal error (exit 70) from a DS
validation failure, receiving a minimal safe JSON envelope on stderr when `--json` was requested
and an unexpected exception occurs.

**Why this priority**: Important for robustness, but internal errors are rare by design.

**Independent Test**: Simulate an unexpected exception during `--json` execution; verify stderr
contains a JSON envelope with `outcome: "internal-error"`, stdout is empty, exit 70.

**Acceptance Scenarios**:

1. **Given** `--json` was requested and an unexpected exception occurs, **When** the CLI
   catches it, **Then** stderr contains a JSON envelope `{formatVersion, command, outcome:
   "internal-error", error: {code: "internal-cli-error", message}}`, stdout is empty, exit 70.

---

### Edge Cases

- What happens when `--json` is combined with an unknown flag (e.g. `--json --verbose`)?
  Commander's existing error handling applies; `--json` takes effect only after arguments are
  accepted.
- What happens when stdout is a closed pipe (EPIPE)? The process terminates silently as
  standard POSIX behavior; no special JSON handling.
- What happens when the DS contains Unicode characters (emoji in token descriptions, non-Latin
  names)? JSON output preserves UTF-8 faithfully; no escaping beyond JSON spec requirements.
- What happens when file paths contain spaces? Paths are emitted as-is; no URL-encoding or
  escaping beyond JSON string escaping.
- What happens when `validate --json` and `inspect --json` are run sequentially on the same
  DS? Identical input produces identical JSON output (determinism).

---

## Requirements *(mandatory)*

### Functional Requirements

#### Flag and selection

- **FR-001**: `neuraz-ds validate` MUST accept an optional `--json` flag.
- **FR-002**: `neuraz-ds inspect` MUST accept an optional `--json` flag.
- **FR-003**: When `--json` is present, the command MUST select the JSON presentation adapter
  instead of the textual reporter. The two adapters MUST NOT run simultaneously.

#### Envelope

- **FR-004**: The JSON output MUST be wrapped in a versioned envelope containing:
  `formatVersion` (string, initial value `"1.0.0"`), `command` (`"validate"` | `"inspect"`),
  `outcome` (one of the domain outcomes or `"internal-error"` for CLI-only failures), and
  `result` (the command-specific DTO, or `null` when unavailable).
- **FR-005**: `formatVersion` MUST be independent of the npm package version and MUST follow
  semantic versioning for the JSON contract only.
- **FR-006**: The envelope MUST always contain all four top-level fields; none may be omitted.

#### Validate JSON result

- **FR-007**: For expected outcomes (`valid`, `complete-invalid`, `partial`, `not-found`,
  `read-error`), the validate result object MUST include: `host` (object or `null`),
  `structuralState`, `valid` (boolean), `checkedDocuments` (array), `uncheckedDocuments`
  (array), `summary` (object with `errors`, `warnings`, `tokens` counts), `errors` (array),
  `warnings` (array), `limits` (object).
- **FR-008**: `host`, when present, MUST contain `root` (absolute path of the host project)
  and `designSystemPath` (absolute path of the DS directory).
- **FR-009**: For `not-found` outcomes, `result` MUST be `null`; for `not-found` with a
  `hostError`, the envelope MUST include an `error` field with `code` and `message`.

#### Inspect JSON result

- **FR-010**: For expected outcomes, the inspect result object MUST include: `host` (object or
  `null`), `structuralState`, `identity` (object or `null`), `schemaVersions` (object or
  `null`), `files` (object), `tokens` (object or `null`), `validation` (object), `limits`
  (object).
- **FR-011**: `identity` fields (name, slug, version, description) MUST use `InspectedValue`
  representation: `{value: T | null, trust: "valid" | "recovered" | "untrusted" |
  "unavailable"}`.
- **FR-012**: `tokens.paths` MUST contain ALL token node summaries from the analysis — the
  200-row terminal cap MUST NOT be applied to JSON output.
- **FR-013**: For `not-found` outcomes, `result` MUST be `null`.

#### Issues

- **FR-014**: Each error and warning MUST be serialized as a stable DTO containing:
  `severity` (`"error"` | `"warning"`), `code` (string, stable identifier), `message`
  (human-readable string), `document` (string or `null`), `path` (string or `null`).
- **FR-015**: The issue DTO MUST NOT include stack traces, raw AJV/Zod error objects, internal
  context maps, file contents, or sensitive paths beyond what the domain model already exposes.
- **FR-016**: The `context` field from `AnalysisIssue` MUST NOT be included in the v1 JSON
  contract.

#### Values and nulls

- **FR-017**: Fields that are part of the stable contract but unavailable MUST use `null`, not
  `undefined` or omission. Fields may only be absent when the contract explicitly declares them
  optional.
- **FR-018**: The JSON MUST NOT contain `undefined` values at any nesting level.

#### stdout / stderr

- **FR-019**: For all expected outcomes with `--json`, stdout MUST contain exactly one JSON
  document followed by a newline (`\n`). No other bytes may appear on stdout.
- **FR-020**: For all expected outcomes with `--json`, stderr MUST be empty.
- **FR-021**: For internal errors (exit 70) with `--json`, stdout MUST be empty and stderr
  MUST contain the internal-error JSON envelope followed by a newline.

#### Serialization

- **FR-022**: JSON MUST be serialized with 2-space indentation and a trailing newline character.
- **FR-023**: JSON serialization MUST be deterministic: the same input MUST produce
  byte-identical output. No timestamps, UUIDs, durations, hostnames, or environment data.
- **FR-024**: Field order, array order (documents, issues, tokens, paths, limit hits), and
  numeric values MUST be preserved from the domain model without reordering.

#### Exit codes

- **FR-025**: Exit codes with `--json` MUST be identical to exit codes without `--json` for
  the same outcome. The `--json` flag changes only the representation, never the exit code.

#### DTO separation

- **FR-026**: Domain objects (`ValidationReport`, `DesignSystemInspection`, `AnalysisIssue`,
  `InspectedValue`, etc.) MUST NOT be serialized directly via `JSON.stringify`. Explicit
  public DTO types and mapper functions MUST translate domain objects to the JSON contract.
- **FR-027**: DTO types and mapper functions MUST be pure (no side effects, no I/O, no
  framework dependencies) and independently testable.

#### Compatibility

- **FR-028**: Commands without `--json` MUST produce identical output and behavior to
  pre-003 versions. No change to textual reporters, exit codes, or stdout/stderr separation.
- **FR-029**: The existing 589 test suite (001 + 002) MUST pass without modification.

#### Read-only / no second analysis

- **FR-030**: `--json` MUST NOT trigger a second analysis pass. The JSON output MUST be
  derived from the same headless use-case result that the textual reporter consumes.
- **FR-031**: `--json` MUST NOT modify any file in the host project.

#### Security

- **FR-032**: The JSON output MUST NOT expose stack traces, raw library error objects,
  complete configuration objects, or file contents. Only information already present in the
  public domain model may appear.

#### Internal error

- **FR-033**: When `--json` is active and an unexpected exception occurs, the CLI MUST
  produce a JSON envelope on stderr with `outcome: "internal-error"` and an `error` object
  containing `code: "internal-cli-error"` and a safe `message`. stdout MUST be empty.
  Exit code MUST be `70`.
- **FR-034**: `"internal-error"` is NOT a domain outcome; it exists only at the CLI adapter
  layer and MUST NOT appear in headless use-case result types.

#### Usage errors

- **FR-035**: Commander argument-parsing errors (e.g. unknown flags) continue using the
  existing CLI error policy. `--json` takes effect only after arguments have been accepted.

### Key Entities

- **JSON Envelope v1**: Top-level wrapper with `formatVersion`, `command`, `outcome`, `result`.
- **Validate Result DTO v1**: Public projection of `ValidationReport` for JSON serialization.
- **Inspect Result DTO v1**: Public projection of `DesignSystemInspection` for JSON
  serialization.
- **Issue DTO v1**: Public projection of `AnalysisIssue` (severity, code, message, document,
  path).
- **InspectedValue DTO v1**: Generic `{value, trust}` pair for identity and schema fields.
- **Internal Error Envelope v1**: CLI-only envelope for unexpected exceptions (outcome
  `"internal-error"`, error `{code, message}`).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every expected outcome (`valid`, `complete-invalid`, `partial`, `not-found`,
  `read-error`) produces a parseable JSON document on stdout when `--json` is used.
- **SC-002**: stdout contains exactly one JSON document and no additional text, for every
  outcome.
- **SC-003**: Exit codes with `--json` match exit codes without `--json` for the same state,
  across all 5 expected outcomes.
- **SC-004**: `inspect --json` on a DS with >200 tokens includes all token paths in the
  JSON (no visual cap).
- **SC-005**: Running the same command twice on the same DS produces byte-identical JSON.
- **SC-006**: No additional file reads, parsing, or traversal occur when `--json` is active
  beyond what the existing headless use case already performs.
- **SC-007**: All 589 existing tests (001 + 002) pass without modification after
  implementing 003.
- **SC-008**: `--json` commands function correctly without TTY and with stdout redirected
  to a file.
- **SC-009**: No JSON output contains stack traces, raw library errors, or internal
  framework objects.
- **SC-010**: The complete test suite (001 + 002 + 003) passes with typecheck, lint/guard,
  and build all green.

---

## Scope

### In scope

- `--json` flag for `validate` and `inspect` commands.
- Versioned JSON envelope (`formatVersion: "1.0.0"`).
- Public DTO types and pure mapper functions for validate and inspect results.
- Issue DTO (severity, code, message, document, path).
- InspectedValue representation (`{value, trust}`).
- Internal error envelope for CLI-layer exceptions.
- Policy for `null` vs. field omission.
- 2-space indented JSON with trailing newline.
- Deterministic serialization.
- Compatibility with existing human output.
- Regression tests for 001 and 002.

### Out of scope

- `init --json`.
- `--compact`, `--pretty`, or any formatting flags.
- Field selection, filtering, or pagination.
- JSONL, NDJSON, or streaming JSON.
- Output to file (`--output`).
- Published JSON Schema for the contract.
- API HTTP, MCP, TUI, viewer, or Studio.
- Editing, repairing, or migrating the DS.
- Foundations, presets, themes, or multiple token files.
- Style Dictionary integration.
- New deeply-supported DTCG types.

---

## Assumptions

- The existing headless use-case results (`ValidateDesignSystemResult`,
  `InspectDesignSystemResult`) contain all data needed for the JSON DTOs. No new domain
  analysis is required.
- Commander supports adding a `--json` boolean option to existing commands without breaking
  argument parsing.
- The existing `IO` abstraction (`{out, err}`) is sufficient to direct JSON output to the
  correct stream.
- `JSON.stringify(obj, null, 2)` with explicit DTO objects produces deterministic output for
  the data types used (strings, numbers, booleans, null, arrays, plain objects).
- `"internal-error"` outcome is strictly a CLI-adapter concept and will never propagate to
  headless use-case types.

---

## Compatibility

### Compatibility policy for `formatVersion`

The `formatVersion` field uses semantic versioning independently of the npm package version:

- **Patch** (`1.0.x`): Bug fixes in serialization without changing field names, types, or
  semantics.
- **Minor** (`1.x.0`): New optional fields added; existing fields unchanged.
- **Major** (`x.0.0`): Removing fields, changing field types/names/semantics, changing
  enum values, changing cardinality.

Consumers SHOULD tolerate unknown fields (forward-compatible with minor bumps). Consumers
MUST check `formatVersion` before assuming a specific field structure.

This policy is documented but not enforced programmatically in v1. No multi-version routing
or negotiation is implemented in this feature.
