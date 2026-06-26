import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { EXPECTED_FILES, MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import { documentValidators } from "../../src/infrastructure/initialize-adapters.js";
import { prepareFiles } from "../../src/infrastructure/serialization/prepare-files.js";
import { createIdentity } from "../../src/domain/identity/design-system-identity.js";
import { createTmpProject, type TmpProject } from "../helpers/tmp-project.js";
import { runRealInit } from "../helpers/real-init.js";
import { sampleAnswers } from "../helpers/in-memory-adapters.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});
const staging = (dir: string) => readdirSync(dir).filter((n) => n.startsWith(".neuraz-ds-staging-"));

describe("T047 — creación exitosa desde la raíz", () => {
  it("estado none → created (exit 0), estructura ADR-0004 válida y determinista", async () => {
    const p = await createTmpProject({ packageJson: { name: "host", version: "1.0.0" } });
    projects.push(p);
    const pkgBefore = readFileSync(join(p.dir, "package.json"), "utf8");

    const { result, exitCode, prompter, reporter } = await runRealInit(p.dir);

    expect(result.status).toBe("created");
    expect(exitCode).toBe(0);
    expect(prompter.requestIdentityCalls).toBe(1);
    expect(prompter.confirmCalls).toBe(1);
    expect(reporter.result?.status).toBe("created");

    // Exactamente los tres archivos administrados, y nada más bajo design-system.
    for (const rel of EXPECTED_FILES) expect(existsSync(join(p.dir, rel))).toBe(true);
    expect(readdirSync(join(p.dir, "design-system")).sort()).toEqual(["design-system.json", "tokens"]);

    // Contenido válido y conforme.
    const cfg = JSON.parse(readFileSync(join(p.dir, MANAGED_FILES.config), "utf8"));
    const man = JSON.parse(readFileSync(join(p.dir, MANAGED_FILES.manifest), "utf8"));
    const tokensRaw = readFileSync(join(p.dir, MANAGED_FILES.tokens), "utf8");
    const tokens = JSON.parse(tokensRaw);
    expect(documentValidators.validateConfig(cfg)).toEqual([]);
    expect(documentValidators.validateManifest(man)).toEqual([]);
    expect(documentValidators.validateDtcg(tokens)).toEqual([]);
    expect(tokens.color.base["blue-500"].$value.colorSpace).toBe("srgb");
    expect(tokens.color.brand.primary.$value).toBe("{color.base.blue-500}");
    expect(man.slug).toBe(sampleAnswers.slug);
    expect(tokensRaw.endsWith("\n")).toBe(true);

    // Determinismo: el contenido persistido coincide con el preparado.
    const id = createIdentity({ name: sampleAnswers.name, slug: sampleAnswers.slug, description: sampleAnswers.description, version: sampleAnswers.version });
    if (!id.ok) throw new Error("identidad fixture");
    for (const f of prepareFiles(id.value)) {
      expect(readFileSync(join(p.dir, f.relativePath), "utf8")).toBe(f.content);
    }

    // Sin staging, package.json intacto, sin .git creado.
    expect(staging(p.dir)).toEqual([]);
    expect(readFileSync(join(p.dir, "package.json"), "utf8")).toBe(pkgBefore);
    expect(existsSync(join(p.dir, ".git"))).toBe(false);
  });
});
