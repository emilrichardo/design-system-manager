// T014 (008) — Diff calculator: cada DiffKind, determinismo, valores públicos seguros (sin bytes/rutas
// absolutas). Orientado a operaciones, comparando documento previo vs candidato.
import { describe, expect, it } from "vitest";
import { buildCandidateDocument } from "../../../src/application/token-mutations/candidate-builder.js";
import { calculateDiff } from "../../../src/application/token-mutations/diff-calculator.js";
import type { PlainDoc } from "../../../src/application/token-mutations/document-model.js";
import type { TokenMutationOperationV1 } from "../../../src/domain/token-mutations/operation.js";

function doc(): PlainDoc {
  return { color: { brand: { 500: { $type: "color", $value: "#3b82f6" } } }, accent: { $type: "color", $value: "{color.brand.500}" } };
}
function diffOf(ops: TokenMutationOperationV1[], options = {}) {
  const before = doc();
  const after = buildCandidateDocument(before, ops, { resolveValue: () => "#3b82f6", ...options });
  return calculateDiff(before, after, ops);
}

describe("calculateDiff (T014)", () => {
  it("create → added", () => {
    const d = diffOf([{ kind: "create-token", path: "color.brand.600", value: "#1d4ed8", type: "color" }]);
    expect(d.entries[0]).toMatchObject({ kind: "added", path: "color.brand.600", after: "#1d4ed8" });
    expect(d.summary.added).toBe(1);
  });

  it("update-value → updated con before/after", () => {
    const d = diffOf([{ kind: "update-value", path: "color.brand.500", value: "#000000" }]);
    expect(d.entries[0]).toMatchObject({ kind: "updated", path: "color.brand.500", before: "#3b82f6", after: "#000000" });
  });

  it("set-alias → alias-changed; remove-alias → alias-changed + updated", () => {
    const set = diffOf([{ kind: "set-alias", path: "accent", target: "color.brand.500" }]);
    expect(set.entries.find((e) => e.kind === "alias-changed")).toMatchObject({ after: "color.brand.500" });
    const rem = diffOf([{ kind: "remove-alias", path: "accent" }]);
    expect(rem.summary.aliasChanged).toBe(1);
    expect(rem.summary.updated).toBe(1);
    expect(rem.entries.find((e) => e.kind === "alias-changed")).toMatchObject({ before: "color.brand.500", after: null });
  });

  it("rename → renamed con previousPath; move → moved; remove → removed", () => {
    expect(diffOf([{ kind: "rename-token", path: "color.brand.500", newName: "primary" }]).entries[0]).toMatchObject({ kind: "renamed", path: "color.brand.primary", previousPath: "color.brand.500" });
    expect(diffOf([{ kind: "move-token", path: "color.brand.500", newParent: "color" }]).entries[0]).toMatchObject({ kind: "moved", path: "color.500", previousPath: "color.brand.500" });
    expect(diffOf([{ kind: "remove-token", path: "color.brand.500" }]).entries[0]).toMatchObject({ kind: "removed", path: "color.brand.500", before: "#3b82f6" });
  });

  it("metadata-changed (description/category/foundation-level) y group-changed", () => {
    expect(diffOf([{ kind: "update-description", path: "color.brand.500", description: "x" }]).entries[0].kind).toBe("metadata-changed");
    expect(diffOf([{ kind: "update-category", path: "color.brand.500", category: "primitive" }]).entries[0].kind).toBe("metadata-changed");
    expect(diffOf([{ kind: "update-foundation-level", path: "color.brand.500", level: "primitive" }]).entries[0]).toMatchObject({
      kind: "metadata-changed",
      before: null,
      after: "primitive",
    });
    expect(diffOf([{ kind: "create-group", path: "spacing" }]).entries[0].kind).toBe("group-changed");
  });

  it("determinista y sin rutas absolutas/bytes", () => {
    const ops: TokenMutationOperationV1[] = [{ kind: "update-value", path: "color.brand.500", value: "#111111" }];
    expect(JSON.stringify(diffOf(ops))).toBe(JSON.stringify(diffOf(ops)));
    expect(JSON.stringify(diffOf(ops))).not.toMatch(/\/(Users|home|Volumes)\//);
  });
});
