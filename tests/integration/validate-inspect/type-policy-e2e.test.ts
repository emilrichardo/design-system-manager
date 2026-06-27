// T041 + §9 — Política de $type y tipos reconocidos, mediante composición real → inspect.
import { afterEach, describe, expect, it } from "vitest";
import { createBoundAnalyze, createInspectDependencies } from "../../../src/cli/composition.js";
import { runInspect } from "../../../src/cli/commands/inspect.js";
import { makeProject, COLOR } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import type { DesignSystemInspection } from "../../../src/domain/analysis/design-system-inspection.js";
import type { TokenNodeSummary } from "../../../src/domain/analysis/token-node-summary.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});
const sink = { out: () => {}, err: () => {} };

async function inspectTokens(tokens: unknown): Promise<{ outcome: string; inspection: DesignSystemInspection | null }> {
  const root = await makeProject(projects, { tokens });
  const r = await runInspect(root, createInspectDependencies(sink, createBoundAnalyze()));
  return { outcome: r.outcome, inspection: r.outcome === "not-found" ? null : (r.inspection as DesignSystemInspection) };
}
function node(insp: DesignSystemInspection | null, path: string): TokenNodeSummary | undefined {
  return insp?.tokens?.paths.find((n) => n.path === path);
}
const desc = { $description: "d" } as const;

describe("T041 — política de $type (integración)", () => {
  it("tipo propio → own", async () => {
    const { inspection } = await inspectTokens({ c: { $type: "color", $value: COLOR, ...desc } });
    expect(node(inspection, "c")).toMatchObject({ effectiveType: "color", typeOrigin: "own", typeSourcePath: null });
  });

  it("heredado de grupo → group + typeSourcePath", async () => {
    const { inspection } = await inspectTokens({ color: { $type: "color", blue: { $value: COLOR, ...desc } } });
    expect(node(inspection, "color.blue")).toMatchObject({ effectiveType: "color", typeOrigin: "group", typeSourcePath: "color" });
  });

  it("por alias → alias; cadena propaga el tipo final", async () => {
    const { inspection } = await inspectTokens({
      color: { base: { $type: "color", $value: COLOR, ...desc }, a: { $value: "{color.base}", ...desc }, b: { $value: "{color.a}", ...desc } },
    });
    expect(node(inspection, "color.a")).toMatchObject({ effectiveType: "color", typeOrigin: "alias" });
    expect(node(inspection, "color.b")?.effectiveType).toBe("color");
  });

  it("alias dentro de grupo tipado: gana el tipo del destino", async () => {
    const { inspection } = await inspectTokens({
      color: { base: { $type: "color", $value: COLOR, ...desc } },
      g: { $type: "dimension", ref: { $value: "{color.base}", ...desc } },
    });
    expect(node(inspection, "g.ref")).toMatchObject({ effectiveType: "color", typeOrigin: "alias" });
  });

  it("tipo propio en alias prevalece sobre destino y grupo", async () => {
    const { inspection } = await inspectTokens({
      color: { $type: "color", base: { $value: COLOR, ...desc }, p: { $type: "dimension", $value: "{color.base}", ...desc } },
    });
    expect(node(inspection, "color.p")).toMatchObject({ effectiveType: "dimension", typeOrigin: "own" });
  });

  it("token sin tipo disponible → dtcg-type-undeterminable, effectiveType null", async () => {
    const { outcome, inspection } = await inspectTokens({ g: { t: { $value: "v", ...desc } } });
    expect(outcome).toBe("complete-invalid");
    expect(node(inspection, "g.t")?.effectiveType).toBeNull();
    expect(inspection?.validation.errors.some((e) => e.code === "dtcg-type-undeterminable")).toBe(true);
  });

  it("alias roto/cíclico NO cae al tipo del grupo (effectiveType null)", async () => {
    const broken = await inspectTokens({ g: { $type: "color", r: { $value: "{g.nope}", ...desc } } });
    expect(node(broken.inspection, "g.r")?.effectiveType).toBeNull();
    const cyclic = await inspectTokens({ g: { $type: "color", a: { $value: "{g.a}", ...desc } } });
    expect(node(cyclic.inspection, "g.a")?.effectiveType).toBeNull();
  });

  it("$extensions no legitima un tipo desconocido", async () => {
    const { outcome, inspection } = await inspectTokens({ x: { $type: "weird", $value: "v", $extensions: { v: 1 }, ...desc } });
    expect(outcome).toBe("complete-invalid");
    expect(inspection?.validation.errors.some((e) => e.code === "dtcg-type-unrecognized")).toBe(true);
  });
});

describe("§9 — tipos DTCG reconocidos", () => {
  it("color válido → valid; byType color", async () => {
    const { outcome, inspection } = await inspectTokens({ c: { $type: "color", $value: COLOR, ...desc } });
    expect(outcome).toBe("valid");
    expect(inspection?.tokens?.byType).toMatchObject({ color: 1 });
    expect(node(inspection, "c")?.trust).toBe("valid");
  });

  it("color inválido (hex plano) → complete-invalid, untrusted", async () => {
    const { outcome, inspection } = await inspectTokens({ c: { $type: "color", $value: "#fff", ...desc } });
    expect(outcome).toBe("complete-invalid");
    expect(node(inspection, "c")?.trust).toBe("untrusted");
  });

  it.each(["dimension", "fontFamily", "fontWeight", "duration", "cubicBezier", "number", "strokeStyle", "border", "transition", "shadow", "gradient", "typography"])(
    "reconocido no profundo (%s) → valid + warning, cuenta en byType",
    async (type) => {
      const { outcome, inspection } = await inspectTokens({ t: { $type: type, $value: "v", ...desc } });
      expect(outcome).toBe("valid");
      expect(inspection?.tokens?.byType).toMatchObject({ [type]: 1 });
      expect(inspection?.validation.warnings.some((w) => w.code === "dtcg-type-not-deeply-inspected")).toBe(true);
    },
  );

  it("tipo desconocido conserva literal en byType, untrusted, complete-invalid", async () => {
    const { outcome, inspection } = await inspectTokens({ x: { $type: "elevation", $value: "v", ...desc } });
    expect(outcome).toBe("complete-invalid");
    expect(inspection?.tokens?.byType).toMatchObject({ elevation: 1 });
    expect(node(inspection, "x")?.trust).toBe("untrusted");
  });
});
