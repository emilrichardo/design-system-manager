// T006 (008) — Modelos de dominio de mutaciones: uniones cerradas, inmutabilidad, diff determinista,
// invariantes outcome/recovery (prohibición de partial/success/blocked), y paths lógicos seguros.
import { describe, expect, it } from "vitest";
import {
  EMPTY_DIFF,
  TOKEN_MUTATION_DIFF_KINDS,
  TOKEN_MUTATION_OPERATION_KINDS,
  TOKEN_MUTATION_OUTCOMES,
  buildDiff,
  createTokenMutationCommand,
  isSafeTokenPath,
  isTokenMutationOperationKind,
  isWithin,
  issue,
  joinPath,
  lastSegment,
  parentPath,
  recoveryInvariantHolds,
  rewritePrefix,
  summarizeDiff,
  wroteInvariantHolds,
  type TokenMutationDiffEntry,
} from "../../../src/domain/token-mutations/index.js";

describe("operations & command", () => {
  it("hay exactamente 15 operaciones cerradas (11 token + 4 grupo)", () => {
    expect(TOKEN_MUTATION_OPERATION_KINDS).toHaveLength(15);
    expect(isTokenMutationOperationKind("create-token")).toBe(true);
    expect(isTokenMutationOperationKind("remove-empty-group")).toBe(true);
    expect(isTokenMutationOperationKind("force-remove")).toBe(false);
  });

  it("createTokenMutationCommand es inmutable y fija formatVersion", () => {
    const c = createTokenMutationCommand([{ kind: "remove-token", path: "color.x" }]);
    expect(c.formatVersion).toBe("1.0.0");
    expect(Object.isFrozen(c)).toBe(true);
    expect(c.operations).toHaveLength(1);
  });
});

describe("outcomes & recovery", () => {
  it("outcomes cerrados sin partial/success/blocked; incluye invalid-command", () => {
    expect(TOKEN_MUTATION_OUTCOMES).toContain("invalid-command");
    for (const forbidden of ["partial", "success", "blocked"]) {
      expect((TOKEN_MUTATION_OUTCOMES as readonly string[]).includes(forbidden)).toBe(false);
    }
  });

  it("wrote invariant: solo applied escribe", () => {
    expect(wroteInvariantHolds("applied", true)).toBe(true);
    expect(wroteInvariantHolds("planned", false)).toBe(true);
    expect(wroteInvariantHolds("planned", true)).toBe(false);
    expect(wroteInvariantHolds("unchanged", false)).toBe(true);
  });

  it("recovery invariant: write-error antes de mover vs verification-error post-write", () => {
    expect(recoveryInvariantHolds("write-error", { sourceAvailable: true, backupRelativePath: null, recoveryRequired: false })).toBe(true);
    expect(recoveryInvariantHolds("write-error", { sourceAvailable: false, backupRelativePath: "design-system/tokens/base.tokens.json.backup", recoveryRequired: true })).toBe(true);
    expect(recoveryInvariantHolds("verification-error", { sourceAvailable: true, backupRelativePath: "x", recoveryRequired: true })).toBe(true);
    expect(recoveryInvariantHolds("verification-error", { sourceAvailable: true, backupRelativePath: null, recoveryRequired: false })).toBe(false);
  });

  it("issue marca blocksApply según severity y conserva dependents", () => {
    const e = issue("removal-with-dependents", "color.base", "blocked", { dependents: ["color.accent"] });
    expect(e.blocksApply).toBe(true);
    expect(e.dependents).toEqual(["color.accent"]);
    expect(issue("license-required" as never, null, "x", { severity: "warning" }).blocksApply).toBe(false);
  });
});

describe("diff", () => {
  const entries: TokenMutationDiffEntry[] = [
    { kind: "removed", path: "z.token", previousPath: null, before: 1, after: null, references: [] },
    { kind: "added", path: "a.token", previousPath: null, before: null, after: 2, references: [] },
    { kind: "alias-changed", path: "a.token", previousPath: null, before: null, after: "{b}", references: ["c.alias"] },
  ];

  it("8 kinds cerrados", () => {
    expect(TOKEN_MUTATION_DIFF_KINDS).toHaveLength(8);
  });

  it("orden determinista por path luego kind; summary correcto; inmutable", () => {
    const diff = buildDiff(entries);
    expect(diff.entries.map((e) => `${e.path}:${e.kind}`)).toEqual(["a.token:added", "a.token:alias-changed", "z.token:removed"]);
    expect(diff.summary).toMatchObject({ added: 1, removed: 1, aliasChanged: 1 });
    expect(Object.isFrozen(diff)).toBe(true);
    expect(buildDiff(entries)).toEqual(diff); // determinista
    expect(EMPTY_DIFF.entries).toEqual([]);
  });

  it("summarizeDiff cuenta cada kind", () => {
    const s = summarizeDiff([{ kind: "moved", path: "x", previousPath: "y", before: null, after: null, references: [] }]);
    expect(s.moved).toBe(1);
    expect(s.added).toBe(0);
  });
});

describe("paths", () => {
  it("acepta paths lógicos y rechaza traversal/clave reservada/separadores", () => {
    expect(isSafeTokenPath("color.brand.500")).toBe(true);
    expect(isSafeTokenPath("")).toBe(false);
    expect(isSafeTokenPath("a..b")).toBe(false);
    expect(isSafeTokenPath("a.$type")).toBe(false);
    expect(isSafeTokenPath("a/b")).toBe(false);
    expect(isSafeTokenPath("../x")).toBe(false);
  });

  it("helpers de segment/parent/join/within/rewrite", () => {
    expect(lastSegment("a.b.c")).toBe("c");
    expect(parentPath("a.b.c")).toBe("a.b");
    expect(parentPath("a")).toBeNull();
    expect(joinPath("a.b", "c")).toBe("a.b.c");
    expect(joinPath(null, "c")).toBe("c");
    expect(isWithin("a.b", "a.b.c")).toBe(true);
    expect(isWithin("a.b", "a.bc")).toBe(false); // por segmentos, no prefijo de string
    expect(rewritePrefix("a.b.c", "a.b", "x.y")).toBe("x.y.c");
    expect(rewritePrefix("a.b", "a.b", "x.y")).toBe("x.y");
    expect(rewritePrefix("a.bc", "a.b", "x.y")).toBe("a.bc");
  });
});
