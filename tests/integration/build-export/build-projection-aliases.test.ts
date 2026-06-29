// T022 (006) — La proyección preserva los errores de alias del análisis 002 y los rechaza de forma
// tipada (sin conjunto parcial). El alias válido conserva el aliasOf inmediato y el valor resuelto.
import { afterEach, describe, expect, it } from "vitest";
import { createBuildSnapshotReader } from "../../../src/infrastructure/build-export/snapshot-reader.js";
import { createBuildProjection } from "../../../src/application/build-export/create-build-projection.js";
import { COLOR, makeProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";

const bag: TmpProject[] = [];
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

async function project(tokens: Record<string, unknown>) {
  const dir = await makeProject(bag, { tokens });
  const r = await createBuildSnapshotReader().read({ executionDir: dir });
  if (r.outcome !== "ready") throw new Error(`snapshot ${r.outcome}`);
  return createBuildProjection(r.snapshot);
}

describe("build projection — aliases (T022)", () => {
  it("alias válido: aliasOf inmediato y valor resuelto", async () => {
    const result = await project({
      color: { base: { $type: "color", $value: COLOR }, brand: { $value: "{color.base}" } },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const brand = result.set.byPath.get("color.brand")!;
    expect(brand.aliasOf).toBe("color.base");
    expect(brand.resolvedValue).toEqual(COLOR);
  });

  it("alias missing → rechazo tipado (sin set parcial)", async () => {
    const result = await project({ color: { base: { $type: "color", $value: COLOR }, x: { $value: "{color.nope}" } } });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("alias-missing");
    expect(result.error.path).toBe("color.x");
  });

  it("alias cycle → rechazo tipado", async () => {
    const result = await project({ color: { a: { $value: "{color.b}" }, b: { $value: "{color.a}" } } });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("alias-cyclic");
  });

  it("alias-to-group → rechazo tipado", async () => {
    const result = await project({
      color: { grp: { inner: { $type: "color", $value: COLOR } }, ref: { $value: "{color.grp}" } },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("alias-to-group");
  });
});
