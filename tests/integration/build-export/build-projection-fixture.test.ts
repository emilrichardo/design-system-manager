// T024 (006) — Fixture con color/dimension/number + alias: confirma que los grupos se excluyen (solo
// tokens leaf entran) y que un nodo inválido provoca rechazo tipado sin conjunto parcial.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { createBuildSnapshotReader } from "../../../src/infrastructure/build-export/snapshot-reader.js";
import { createBuildProjection } from "../../../src/application/build-export/create-build-projection.js";
import { COLOR, makeProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";

const FIXTURE_URL = new URL("../../fixtures/build-export/projection/source.tokens.json", import.meta.url);
const bag: TmpProject[] = [];
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

async function projectTokens(tokens: Record<string, unknown>) {
  const dir = await makeProject(bag, { tokens });
  const r = await createBuildSnapshotReader().read({ executionDir: dir });
  if (r.outcome !== "ready") throw new Error(`snapshot ${r.outcome}`);
  return createBuildProjection(r.snapshot);
}

describe("build projection fixture (T024)", () => {
  it("excluye grupos: solo entran tokens leaf, con categorías canónicas", async () => {
    const tokens = JSON.parse(await readFile(fileURLToPath(FIXTURE_URL), "utf8")) as Record<string, unknown>;
    const result = await projectTokens(tokens);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const paths = result.set.tokens.map((t) => t.path);
    expect(paths).toContain("color.gray.100");
    expect(paths).toContain("color.surface.default");
    expect(paths).toContain("spacing.100");
    expect(paths).toContain("opacity.low");
    // Los contenedores de grupo NO son tokens.
    for (const group of ["color", "color.gray", "color.surface", "spacing", "opacity"]) {
      expect(paths).not.toContain(group);
    }
    expect(result.set.byPath.get("spacing.100")!.category).toBe("spacing");
    expect(result.set.byPath.get("opacity.low")!.category).toBe("opacity");
    expect(result.set.byPath.get("color.surface.default")!.aliasOf).toBe("color.gray.100");
  });

  it("un nodo inválido (alias missing) produce rechazo tipado sin set parcial", async () => {
    const result = await projectTokens({ color: { base: { $type: "color", $value: COLOR }, broken: { $value: "{color.ghost}" } } });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("alias-missing");
  });
});
