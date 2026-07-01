# Contract: ViewerJsonEnvelopeV1 (agent/MCP/HTTP JSON API)

- **Version**: 1.0.0
- **Status**: Planned
- **Producer**: viewer application layer's `json/` mappers, served by the local HTTP adapter
- **Consumers**: MCP-style/agent consumers, the UI bundle's own `fetch` calls, tests

## Shape

```text
ViewerJsonEnvelopeV1 {
  formatVersion: "1.0.0"     // first key
  section: ViewerSectionId | "session"
  state: ViewerStateV1
  data:
    | ViewerSessionV1 | ViewerOverviewV1 | ViewerNavigationV1
    | ViewerTokenV1 | ViewerFoundationV1 | ViewerColorV1 | ViewerTypographyV1
    | ViewerAliasV1 | ViewerAssetV1 | ViewerIssueV1[]
    | null
}
```

## Invariants

- Independent of `003`'s `JsonEnvelopeV1` — never extends or reuses that closed contract (mirrors `008`'s
  D9 decision for the same reason: consistency for consumers without touching a closed JSON contract).
- Exactly one envelope per HTTP JSON API response; `data: null` only when `state` is `not-found` or
  `read-error`.
- The local HTTP adapter MUST serve this envelope read-only: no HTTP method other than `GET` is defined
  for the Viewer's JSON API in v1 (no `POST`/`PUT`/`DELETE` — the read-only invariant extends to the wire
  protocol, not just the application layer).
- `formatVersion` is always the first key (matches the convention of `003`/`006`/`007`/`008`'s envelopes).

## Stream/transport routing (future local server, once implemented)

- Every response is served over `http://127.0.0.1:<port>/...` — never a remote host, never mixed with the
  static UI bundle's own asset responses (the API and the static assets use disjoint path prefixes).
- No response ever includes a stack trace; an unexpected internal failure maps to a safe generic body and
  HTTP `500`, mirroring the adapter-only `internal-error` pattern from `002`–`008` (never a domain state).

## Exclusions

No absolute paths, cwd, hostname, `Error`/stack, raw bytes, secrets — inherited from every nested
`ViewerXxxV1` contract.
