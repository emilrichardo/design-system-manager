// T021 (006) — Proyección normalizada: campos, orden asignado, lookup, inmutabilidad/copia defensiva e
// independencia del insertion order.
import { afterEach, describe, expect, it } from "vitest";
import { createBuildSnapshotReader } from "../../../src/infrastructure/build-export/snapshot-reader.js";
import { createBuildProjection } from "../../../src/application/build-export/create-build-projection.js";
import { COLOR, makeProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";

const COLOR2 = { colorSpace: "srgb", components: [0.1, 0.1, 0.1], alpha: 1, hex: "#1a1a1a" } as const;
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

describe("createBuildProjection (T016/T018/T019)", () => {
  it("produce un set con campos completos, order asignado y lookup byPath", async () => {
    const result = await project({ color: { alpha: { $type: "color", $value: COLOR }, beta: { $type: "color", $value: COLOR2 } } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { set } = result;
    expect(set.tokens.map((t) => t.path)).toEqual(["color.alpha", "color.beta"]);
    expect(set.tokens.map((t) => t.order)).toEqual([0, 1]);
    const alpha = set.byPath.get("color.alpha")!;
    expect(alpha.category).toBe("color");
    expect(alpha.foundationLevel).toBe("unclassified");
    expect(alpha.effectiveType).toBe("color");
    expect(alpha.aliasOf).toBeNull();
    expect(alpha.aliasChain).toEqual([]);
    expect(alpha.resolvedValue).toEqual(COLOR);
    expect(alpha.compatibility.map((c) => c.format)).toEqual(["css", "json", "typescript"]);
  });

  it("congela los tokens y sus valores (copia defensiva)", async () => {
    const result = await project({ color: { alpha: { $type: "color", $value: COLOR } } });
    if (!result.ok) throw new Error("esperado ok");
    const alpha = result.set.byPath.get("color.alpha")!;
    expect(Object.isFrozen(alpha)).toBe(true);
    expect(Object.isFrozen(alpha.sourceValue)).toBe(true);
    expect(Object.isFrozen(result.set.tokens)).toBe(true);
    // El valor es una copia independiente, no la referencia del documento parseado.
    expect(alpha.resolvedValue).toEqual(COLOR);
  });

  it("es independiente del insertion order (mismo orden y valores)", async () => {
    const a = await project({ color: { alpha: { $type: "color", $value: COLOR }, beta: { $type: "color", $value: COLOR2 } } });
    const b = await project({ color: { beta: { $type: "color", $value: COLOR2 }, alpha: { $type: "color", $value: COLOR } } });
    if (!a.ok || !b.ok) throw new Error("esperado ok");
    expect(a.set.tokens.map((t) => t.path)).toEqual(b.set.tokens.map((t) => t.path));
    expect(a.set.byPath.get("color.alpha")!.resolvedValue).toEqual(b.set.byPath.get("color.alpha")!.resolvedValue);
  });
});
