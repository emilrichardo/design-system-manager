import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import { documentValidators } from "../../src/infrastructure/initialize-adapters.js";
import { createTmpProject, type TmpProject } from "../helpers/tmp-project.js";
import { runRealInit } from "../helpers/real-init.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

describe("T060 — portabilidad (legible y válido sin el gestor)", () => {
  it("los archivos creados son JSON plano, válidos y autosuficientes", async () => {
    const p = await createTmpProject({ packageJson: { name: "host" } });
    projects.push(p);
    await runRealInit(p.dir);

    // Re-leídos y validados de forma independiente (sin ejecutar el flujo de init).
    const cfg = JSON.parse(readFileSync(join(p.dir, MANAGED_FILES.config), "utf8"));
    const man = JSON.parse(readFileSync(join(p.dir, MANAGED_FILES.manifest), "utf8"));
    const tokens = JSON.parse(readFileSync(join(p.dir, MANAGED_FILES.tokens), "utf8"));

    expect(documentValidators.validateConfig(cfg)).toEqual([]);
    expect(documentValidators.validateManifest(man)).toEqual([]);
    expect(documentValidators.validateDtcg(tokens)).toEqual([]);

    // El manifiesto no contiene valores visuales (independiente del gestor / DTCG en su archivo).
    expect(man).not.toHaveProperty("color");
    // La fuente de tokens es DTCG estándar (objeto sRGB), legible por cualquier herramienta DTCG.
    expect(tokens.color.base["blue-500"].$value.colorSpace).toBe("srgb");
    // La config solo apunta al DS (sin lógica ejecutable embebida).
    expect(cfg.designSystemDir).toBe("design-system");
  });
});
