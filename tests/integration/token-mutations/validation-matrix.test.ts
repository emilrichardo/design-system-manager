// T023 (008) — Matriz de validación: cada caso con su código estable; nunca resuelto en silencio.
import { describe, expect, it } from "vitest";
import { validateCommand } from "../../../src/application/token-mutations/validate-command.js";
import { aliasedDoc, command, sourceFrom } from "../../application/token-mutations/fixtures.js";
import type { MutationIssueCode } from "../../../src/domain/token-mutations/outcome.js";
import type { TokenMutationOperationV1 } from "../../../src/domain/token-mutations/operation.js";

const codes = (ops: TokenMutationOperationV1[]): MutationIssueCode[] => validateCommand(sourceFrom(aliasedDoc()), command(...ops)).map((i) => i.code);

describe("validateCommand matrix (T023)", () => {
  it("comando válido → sin issues", () => {
    expect(codes([{ kind: "update-value", path: "color.brand.500", value: "#000" }])).toEqual([]);
  });

  it("invalid-path", () => {
    expect(codes([{ kind: "create-token", path: "a.$type", value: 1, type: "number" }])).toContain("invalid-path");
  });

  it("token-exists / token-not-found", () => {
    expect(codes([{ kind: "create-token", path: "color.brand.500", value: "#fff", type: "color" }])).toContain("token-exists");
    expect(codes([{ kind: "update-value", path: "color.brand.999", value: "#fff" }])).toContain("token-not-found");
  });

  it("invalid-dtcg-value", () => {
    expect(codes([{ kind: "update-value", path: "color.brand.500", value: undefined as unknown }])).toContain("invalid-dtcg-value");
  });

  it("alias-not-found / alias-to-group / alias-cycle", () => {
    expect(codes([{ kind: "set-alias", path: "accent", target: "color.brand.999" }])).toContain("alias-not-found");
    expect(codes([{ kind: "set-alias", path: "accent", target: "color.brand" }])).toContain("alias-to-group");
    // ciclo: brand.500 → accent, y accent ya → brand.500
    expect(codes([{ kind: "set-alias", path: "color.brand.500", target: "accent" }])).toContain("alias-cycle");
  });

  it("type-mismatch", () => {
    expect(
      codes([
        { kind: "create-token", path: "spacing.1", value: { value: 4, unit: "px" }, type: "dimension" },
        { kind: "set-alias", path: "spacing.1", target: "color.brand.500" },
      ]),
    ).toContain("type-mismatch");
  });

  it("remove-alias en no-alias → alias-not-found", () => {
    expect(codes([{ kind: "remove-alias", path: "color.brand.500" }])).toContain("alias-not-found");
  });

  it("rename-collision / move-collision", () => {
    expect(
      codes([
        { kind: "create-token", path: "color.brand.600", value: "#111", type: "color" },
        { kind: "rename-token", path: "color.brand.500", newName: "600" },
      ]),
    ).toContain("rename-collision");
    expect(codes([{ kind: "move-token", path: "accent", newParent: "color.brand" }])).not.toContain("move-collision");
  });

  it("group-not-found en move-token", () => {
    expect(codes([{ kind: "move-token", path: "color.brand.500", newParent: "missing.group" }])).toContain("group-not-found");
  });

  it("parent-descendant-conflict en move-group", () => {
    expect(codes([{ kind: "move-group", path: "color", newParent: "color.brand" }])).toContain("parent-descendant-conflict");
  });

  it("removal-with-dependents (lista dependientes)", () => {
    const issues = validateCommand(sourceFrom(aliasedDoc()), command({ kind: "remove-token", path: "color.brand.500" }));
    const dep = issues.find((i) => i.code === "removal-with-dependents");
    expect(dep?.dependents).toEqual(["accent"]);
  });

  it("group-removal-non-empty", () => {
    expect(codes([{ kind: "remove-empty-group", path: "color.brand" }])).toContain("group-removal-non-empty");
  });

  it("operación posterior depende de una anterior (create luego alias) → válido", () => {
    expect(
      codes([
        { kind: "create-token", path: "color.brand.700", value: "#0a0a0a", type: "color" },
        { kind: "set-alias", path: "accent", target: "color.brand.700" },
      ]),
    ).toEqual([]);
  });
});
