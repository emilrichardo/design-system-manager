// T039/T040/T042 — Integración real: estados estructurales, lectura/JSON, portabilidad. Recorre
// composición real → use cases → reporters → exit code, sobre filesystem temporal.
import { lstatSync, readdirSync, statSync } from "node:fs";
import { mkdir, symlink, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createBoundAnalyze,
  createInspectDependencies,
  createValidateDependencies,
} from "../../../src/cli/composition.js";
import { runValidate } from "../../../src/cli/commands/validate.js";
import { runInspect } from "../../../src/cli/commands/inspect.js";
import { exitCodeForOutcome } from "../../../src/cli/exit-codes.js";
import { buildConfig } from "../../../src/domain/builders/build-config.js";
import { MANAGED_FILES } from "../../../src/domain/plan/managed-files.js";
import { makeProject, validProject, emptyProject, VALID_MANIFEST } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import { createTmpProject } from "../../helpers/tmp-project.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});
const sink = { out: () => {}, err: () => {} };

interface Captured {
  out: string;
  err: string;
}
function capturing(): { io: { out: (t: string) => void; err: (t: string) => void } } & Captured {
  const o: string[] = [];
  const e: string[] = [];
  return {
    io: { out: (t) => o.push(t), err: (t) => e.push(t) },
    get out() {
      return o.join("");
    },
    get err() {
      return e.join("");
    },
  };
}

function snapshot(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      const st = lstatSync(abs);
      if (st.isDirectory()) {
        out.push(`${relative(root, abs)}/`);
        walk(abs);
      } else {
        out.push(`${relative(root, abs)}:${statSync(abs).size}:${statSync(abs).mtimeMs}`);
      }
    }
  };
  walk(root);
  return out.sort();
}

async function bothOutcomes(root: string): Promise<{ validate: string; inspect: string; vExit: number; iExit: number }> {
  const analyze = createBoundAnalyze();
  const v = await runValidate(root, createValidateDependencies(sink, analyze));
  const i = await runInspect(root, createInspectDependencies(sink, analyze));
  return { validate: v.outcome, inspect: i.outcome, vExit: exitCodeForOutcome(v.outcome), iExit: exitCodeForOutcome(i.outcome) };
}

describe("T039/T040 — estados estructurales (integración real)", () => {
  it("ningún documento → not-found / exit 5", async () => {
    const r = await bothOutcomes(await emptyProject(projects));
    expect(r).toMatchObject({ validate: "not-found", inspect: "not-found", vExit: 5, iExit: 5 });
  });

  it("solo config → partial / exit 4", async () => {
    const r = await bothOutcomes(await makeProject(projects, { manifest: false, tokens: false }));
    expect(r).toMatchObject({ validate: "partial", inspect: "partial", vExit: 4, iExit: 4 });
  });

  it("config + manifest → partial / exit 4", async () => {
    const r = await bothOutcomes(await makeProject(projects, { tokens: false }));
    expect(r.vExit).toBe(4);
  });

  it("solo tokens → partial / exit 4", async () => {
    const r = await bothOutcomes(await makeProject(projects, { config: false, manifest: false }));
    expect(r.vExit).toBe(4);
  });

  it("tres válidos → valid / exit 0", async () => {
    const r = await bothOutcomes(await validProject(projects));
    expect(r).toMatchObject({ validate: "valid", inspect: "valid", vExit: 0, iExit: 0 });
  });

  it("config inválida → complete-invalid / exit 3", async () => {
    const r = await bothOutcomes(await makeProject(projects, { config: { configSchemaVersion: "0.1.0" } })); // falta designSystemDir
    expect(r).toMatchObject({ validate: "complete-invalid", inspect: "complete-invalid", vExit: 3, iExit: 3 });
  });

  it("manifest inválido (slug) → complete-invalid / exit 3", async () => {
    const r = await bothOutcomes(await makeProject(projects, { manifest: { ...VALID_MANIFEST, slug: "Bad Slug!" } }));
    expect(r.vExit).toBe(3);
  });

  it("tokens inválidos (tipo desconocido) → complete-invalid / exit 3", async () => {
    const r = await bothOutcomes(await makeProject(projects, { tokens: { g: { t: { $type: "weird", $value: "v", $description: "d" } } } }));
    expect(r.vExit).toBe(3);
  });
});

describe("T040 — lectura / JSON (clasificación por outcome, no por texto)", () => {
  it("config JSON roto → complete-invalid / exit 3", async () => {
    const r = await bothOutcomes(await makeProject(projects, { config: "{ broken" }));
    expect(r.validate).toBe("complete-invalid");
  });

  it("tokens UTF-8 inválido → read-error / exit 6", async () => {
    const root = await makeProject(projects, { tokens: false });
    await mkdir(join(root, "design-system", "tokens"), { recursive: true });
    await writeFile(join(root, MANAGED_FILES.tokens), Buffer.from([0x7b, 0xff, 0xfe, 0x7d]));
    const r = await bothOutcomes(root);
    expect(r).toMatchObject({ validate: "read-error", vExit: 6 });
  });

  it("directorio ocupando la ruta de tokens → partial / exit 4 (tipo incompatible, estructural)", async () => {
    const root = await makeProject(projects, { tokens: false });
    await mkdir(join(root, MANAGED_FILES.tokens), { recursive: true }); // dir, no archivo regular
    const r = await bothOutcomes(root);
    // Un nodo administrado no-regular es incompatibilidad ESTRUCTURAL → partial (data-model).
    expect(r).toMatchObject({ validate: "partial", vExit: 4 });
  });

  it("design-system es symlink externo (a dir con archivos reales) → read-error / exit 6", async () => {
    // config local + design-system → dir externo con manifest y tokens reales (lstat los ve regulares,
    // pero el path-guard del reader detecta el escape al leer).
    const root = await makeProject(projects, { manifest: false, tokens: false });
    const outside = await emptyProject(projects);
    await mkdir(join(outside, "design-system", "tokens"), { recursive: true });
    await writeFile(join(outside, "design-system", "design-system.json"), `${JSON.stringify(VALID_MANIFEST)}\n`);
    const { buildTokens } = await import("../../../src/domain/builders/build-tokens.js");
    await writeFile(join(outside, "design-system", "tokens", "base.tokens.json"), `${JSON.stringify(buildTokens())}\n`);
    await symlink(join(outside, "design-system"), join(root, "design-system"), "dir");
    const r = await bothOutcomes(root);
    expect(r.vExit).toBe(6); // read-error operativo (symlink-external)
  });
});

describe("T044 (parcial) — ninguna modificación del proyecto", () => {
  it("validate+inspect no alteran un DS válido", async () => {
    const root = await validProject(projects);
    const before = snapshot(root);
    await bothOutcomes(root);
    expect(snapshot(root)).toEqual(before);
  });
});

describe("T042 — portabilidad (rutas con APIs portables)", () => {
  it("ejecución desde subcarpeta resuelve la raíz; nombre con espacios", async () => {
    const p = await createTmpProject();
    projects.push(p);
    await writeFile(join(p.dir, MANAGED_FILES.config), `${JSON.stringify(buildConfig())}\n`);
    await mkdir(join(p.dir, "design-system", "tokens"), { recursive: true });
    await writeFile(join(p.dir, MANAGED_FILES.manifest), `${JSON.stringify(VALID_MANIFEST)}\n`);
    const { buildTokens } = await import("../../../src/domain/builders/build-tokens.js");
    await writeFile(join(p.dir, MANAGED_FILES.tokens), `${JSON.stringify(buildTokens())}\n`);
    const sub = join(p.dir, "packages", "app sub", "src");
    await mkdir(sub, { recursive: true });
    const analyze = createBoundAnalyze();
    const v = await runValidate(sub, createValidateDependencies(sink, analyze));
    expect(v.outcome).toBe("valid");
  });

  it("proyecto sin Git valida igual", async () => {
    const root = await validProject(projects); // createTmpProject no crea .git por defecto
    const r = await bothOutcomes(root);
    expect(r.validate).toBe("valid");
  });
});
