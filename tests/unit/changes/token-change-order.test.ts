// T034 (005) — Orden canónico determinista e invariantes de `createTokenChangeSet`.
import { describe, expect, it } from "vitest";
import { createTokenChangeSet } from "../../../src/domain/changes/token-change-set.js";
import type { TokenChange } from "../../../src/domain/changes/token-change.js";

const ch = (path: string, over: Partial<TokenChange> = {}): TokenChange => ({
  path,
  nodeKind: "token",
  category: "color",
  level: "primitive",
  operation: "create",
  reason: "r",
  blocksWrite: false,
  conflict: null,
  proposedToken: null,
  ...over,
});

function paths(changes: readonly TokenChange[]): readonly string[] {
  return changes.map((c) => c.path);
}

describe("createTokenChangeSet ordering (T034)", () => {
  it("orders by canonical category then tree order (parents before children)", () => {
    const input = [
      ch("spacing.200", { category: "spacing" }),
      ch("color.gray.100"),
      ch("color.surface.default"),
      ch("color.gray", { nodeKind: "group" }),
      ch("color", { nodeKind: "group" }),
      ch("color.surface", { nodeKind: "group" }),
    ];
    const r = createTokenChangeSet(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(paths(r.changeSet.changes)).toEqual([
      "color",
      "color.gray",
      "color.gray.100",
      "color.surface",
      "color.surface.default",
      "spacing.200",
    ]);
  });

  it("produces the same set regardless of input order", () => {
    const a = [ch("color.gray.100"), ch("color", { nodeKind: "group" }), ch("color.gray", { nodeKind: "group" })];
    const b = [ch("color.gray", { nodeKind: "group" }), ch("color.gray.100"), ch("color", { nodeKind: "group" })];
    const ra = createTokenChangeSet(a);
    const rb = createTokenChangeSet(b);
    expect(ra.ok && rb.ok).toBe(true);
    if (ra.ok && rb.ok) expect(ra.changeSet.changes).toEqual(rb.changeSet.changes);
  });

  it("does not depend on locale (ASCII-stable comparison)", () => {
    const r = createTokenChangeSet([ch("color.b"), ch("color.A"), ch("color.a")]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(paths(r.changeSet.changes)).toEqual(["color.A", "color.a", "color.b"]);
  });

  it("rejects duplicate paths (no silent dedup)", () => {
    const r = createTokenChangeSet([ch("color.gray.100"), ch("color.gray.100", { operation: "unchanged" })]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.map((i) => i.code)).toContain("change-path-duplicate");
  });

  it("rejects an empty path", () => {
    const r = createTokenChangeSet([ch("")]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.map((i) => i.code)).toContain("change-path-empty");
  });
});

describe("createTokenChangeSet invariants (T034)", () => {
  const conflictMeta = { code: "x", path: "color.x", severity: "error" as const, message: "m", blocksWrite: true, proposedAction: "a" };

  it("requires conflict metadata on a conflict change", () => {
    const r = createTokenChangeSet([ch("color.x", { operation: "conflict", blocksWrite: true })]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.map((i) => i.code)).toContain("change-conflict-metadata-missing");
  });

  it("rejects conflict metadata on a non-conflict change", () => {
    const r = createTokenChangeSet([ch("color.x", { conflict: { ...conflictMeta, blocksWrite: false } })]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.map((i) => i.code)).toContain("change-conflict-metadata-unexpected");
  });

  it("rejects blocksWrite on a non-conflict change", () => {
    const r = createTokenChangeSet([ch("color.x", { operation: "create", blocksWrite: true })]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.map((i) => i.code)).toContain("change-blocks-write-invalid");
  });

  it("rejects a group change that proposes a $value (token-only data)", () => {
    const r = createTokenChangeSet([ch("color.grp", { nodeKind: "group", proposedToken: { $value: "#fff" } })]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.map((i) => i.code)).toContain("change-group-has-token-data");
  });

  it("rejects an update that proposes anything other than $description", () => {
    const ok = createTokenChangeSet([ch("color.x", { operation: "update", proposedToken: { $description: "d" } })]);
    expect(ok.ok).toBe(true);
    const bad = createTokenChangeSet([ch("color.x", { operation: "update", proposedToken: { $value: "#fff" } })]);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.issues.map((i) => i.code)).toContain("change-update-field-invalid");
  });

  it("accepts a valid conflict change with matching metadata", () => {
    const r = createTokenChangeSet([ch("color.x", { operation: "conflict", blocksWrite: true, conflict: conflictMeta })]);
    expect(r.ok).toBe(true);
  });
});
