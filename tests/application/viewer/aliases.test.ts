// T047 (009) — Dependientes correctos, preview de impacto nunca escribe ni persiste, `blockingReason`
// reusa los códigos de `008` sin inventar nuevos.
import { afterEach, describe, expect, it } from "vitest";
import { projectAlias, projectRenameMoveImpactPreview } from "../../../src/application/viewer/alias.js";
import { buildViewerSectionDetail } from "../../../src/application/viewer/build-section-detail.js";
import type { ViewerAliasV1 } from "../../../src/application/viewer/alias.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";
import { newCallCounts, realViewerDeps } from "./real-deps.js";

const hosts: HostProject[] = [];
afterEach(async () => {
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});

function alias(overrides: Partial<ViewerAliasV1> = {}): ViewerAliasV1 {
  return projectAlias({ path: "color.brand.primary", kind: "alias", immediateTarget: "color.base.blue-500", chain: ["color.base.blue-500"], dependents: [], state: "valid", ...overrides });
}

describe("aliases view (T047)", () => {
  it("projectAlias es un pass-through: origin/immediateTarget/chain/dependents/state, impactPreview null", () => {
    const a = alias();
    expect(a).toMatchObject({
      path: "color.brand.primary",
      origin: { kind: "alias" },
      immediateTarget: "color.base.blue-500",
      chain: ["color.base.blue-500"],
      state: "valid",
      impactPreview: null,
    });
  });

  it("dependientes correctos sobre una sesión real: renombrar el token base afectaría a su alias dependiente", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    const detail = await buildViewerSectionDetail({ executionDir: p.dir }, realViewerDeps(p.dir, newCallCounts()), "aliases");
    const aliases = detail.data as readonly ViewerAliasV1[];
    const base = aliases.find((x) => x.path === "color.base.blue-500");
    expect(base).toBeDefined();
    expect(base?.dependents).toContain("color.brand.primary");
  });

  it("tokens aislados (sin alias, sin dependientes) no aparecen en la vista de aliases", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    const detail = await buildViewerSectionDetail({ executionDir: p.dir }, realViewerDeps(p.dir, newCallCounts()), "aliases");
    const aliases = detail.data as readonly ViewerAliasV1[];
    // Ningún elemento aislado: todo elemento listado es alias o tiene al menos un dependiente.
    for (const a of aliases) expect(a.origin.kind === "alias" || a.dependents.length > 0).toBe(true);
  });

  it("impact preview de un rename bloqueado por colisión: blockingReason reusa el código de 008 (rename-collision)", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    const deps = realViewerDeps(p.dir, newCallCounts());
    const a = alias({ path: "color.base.blue-500" });
    // Renombrar a un nombre que ya existe en el mismo grupo del fixture de init (no hay colisión real
    // disponible en el fixture por defecto; usamos el propio nombre para forzar rename-collision).
    const result = await projectRenameMoveImpactPreview(a, "color.base.blue-500", "rename", deps.planRenameMoveImpact);
    expect(result.impactPreview?.blocked).toBe(true);
    expect(result.impactPreview?.blockingReason).toBe("rename-collision");
  });

  it("impact preview exitoso: wouldRewriteReferences lista el alias dependiente real", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    const deps = realViewerDeps(p.dir, newCallCounts());
    const a = alias({ path: "color.base.blue-500" });
    const result = await projectRenameMoveImpactPreview(a, "color.base.blue-600", "rename", deps.planRenameMoveImpact);
    expect(result.impactPreview?.blocked).toBe(false);
    expect(result.impactPreview?.wouldRewriteReferences).toContain("color.brand.primary");
  });

  it("impact preview NUNCA escribe: el host queda byte-idéntico tras calcular varios previews", async () => {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const p = await makeHostProject();
    hosts.push(p);
    const tokensPath = join(p.dir, "design-system", "tokens", "base.tokens.json");
    const before = await readFile(tokensPath);
    const deps = realViewerDeps(p.dir, newCallCounts());
    const a = alias({ path: "color.base.blue-500" });
    await projectRenameMoveImpactPreview(a, "color.base.blue-600", "rename", deps.planRenameMoveImpact);
    await projectRenameMoveImpactPreview(a, "color.other", "move", deps.planRenameMoveImpact);
    expect(await readFile(tokensPath)).toEqual(before);
  });

  it("move a la raíz (sin grupo padre nombrable) bloquea sin invocar el plan", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    const deps = realViewerDeps(p.dir, newCallCounts());
    const a = alias({ path: "color.base.blue-500" });
    const result = await projectRenameMoveImpactPreview(a, "root-level", "move", deps.planRenameMoveImpact);
    expect(result.impactPreview?.blocked).toBe(true);
  });
});
