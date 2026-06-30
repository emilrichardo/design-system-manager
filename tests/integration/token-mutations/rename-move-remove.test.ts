// T024 (008) — planTokenMutation read-only: reescritura de referencias en rename/move (token y grupo),
// colisiones, remove con/sin dependientes, grupo vacío/no vacío. Sin escritura.
import { describe, expect, it } from "vitest";
import { planTokenMutation } from "../../../src/application/token-mutations/plan-token-mutation.js";
import { aliasedDoc, command, fakeSnapshot, sourceFrom, stubSerialize } from "../../application/token-mutations/fixtures.js";
import type { TokenMutationOperationV1 } from "../../../src/domain/token-mutations/operation.js";

const plan = (doc: unknown, ...ops: TokenMutationOperationV1[]) =>
  planTokenMutation({ executionDir: "/x" }, command(...ops), { snapshot: fakeSnapshot(sourceFrom(doc)), serialize: stubSerialize });

describe("rename/move reference rewrite (T024)", () => {
  it("rename de un token referenciado → renamed + alias-changed, sin aliases rotos", async () => {
    const r = await plan(aliasedDoc(), { kind: "rename-token", path: "color.brand.500", newName: "primary" });
    expect(r.outcome).toBe("planned");
    const renamed = r.diff!.entries.find((e) => e.kind === "renamed");
    expect(renamed).toMatchObject({ path: "color.brand.primary", previousPath: "color.brand.500" });
    expect(renamed!.references).toEqual(["accent"]);
    const aliasChanged = r.diff!.entries.find((e) => e.kind === "alias-changed" && e.path === "accent");
    expect(aliasChanged).toMatchObject({ before: "color.brand.500", after: "color.brand.primary" });
  });

  it("move de un token referenciado → moved + alias-changed", async () => {
    const r = await plan(aliasedDoc(), { kind: "move-token", path: "color.brand.500", newParent: "color" });
    const moved = r.diff!.entries.find((e) => e.kind === "moved");
    expect(moved).toMatchObject({ path: "color.500", previousPath: "color.brand.500" });
    expect(moved!.references).toEqual(["accent"]);
  });

  it("rename de grupo reescribe referencias a descendientes", async () => {
    const r = await plan(aliasedDoc(), { kind: "rename-group", path: "color.brand", newName: "core" });
    const g = r.diff!.entries.find((e) => e.kind === "group-changed" && e.previousPath === "color.brand");
    expect(g!.references).toEqual(["accent"]);
    expect(r.diff!.entries.some((e) => e.kind === "alias-changed" && e.after === "color.core.500")).toBe(true);
  });

  it("rename-collision → conflict, sin plan", async () => {
    const r = await plan(aliasedDoc(), { kind: "create-token", path: "color.brand.x", value: "#fff", type: "color" }, { kind: "rename-token", path: "color.brand.500", newName: "x" });
    expect(r.outcome).toBe("conflict");
    expect(r.plan).toBeNull();
  });

  it("remove sin dependientes → planned removed entry", async () => {
    const r = await plan(aliasedDoc(), { kind: "remove-token", path: "accent" });
    expect(r.outcome).toBe("planned");
    expect(r.diff!.entries[0]).toMatchObject({ kind: "removed", path: "accent" });
  });

  it("remove con dependientes → conflict", async () => {
    const r = await plan(aliasedDoc(), { kind: "remove-token", path: "color.brand.500" });
    expect(r.outcome).toBe("conflict");
    expect(r.conflicts.some((c) => c.code === "removal-with-dependents")).toBe(true);
  });

  it("remove-empty-group vacío → planned; no vacío → conflict", async () => {
    const withEmpty = { spacing: {}, ...(aliasedDoc() as object) };
    expect((await plan(withEmpty, { kind: "remove-empty-group", path: "spacing" })).outcome).toBe("planned");
    expect((await plan(aliasedDoc(), { kind: "remove-empty-group", path: "color.brand" })).outcome).toBe("conflict");
  });

  it("plan es determinista", async () => {
    const ops: TokenMutationOperationV1[] = [{ kind: "rename-token", path: "color.brand.500", newName: "primary" }];
    const a = await plan(aliasedDoc(), ...ops);
    const b = await plan(aliasedDoc(), ...ops);
    expect(JSON.stringify(a.diff)).toBe(JSON.stringify(b.diff));
  });
});
