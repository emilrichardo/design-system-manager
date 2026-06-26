import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import {
  createTmpProject,
  ensureDir,
  symlinkIn,
  symlinksSupported,
  writeFileIn,
  type TmpProject,
} from "../helpers/tmp-project.js";
import { runRealInit } from "../helpers/real-init.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});
const HAS_SYMLINK = symlinksSupported();

async function host(): Promise<TmpProject> {
  const p = await createTmpProject({ packageJson: { name: "host" } });
  projects.push(p);
  return p;
}

describe("T053 — estado partial", () => {
  it("solo configuración → conflict (exit 4), enumera presentes/ausentes, no escribe", async () => {
    const p = await host();
    await writeFileIn(p.dir, MANAGED_FILES.config, "{}\n");
    const { result, exitCode, prompter, reporter } = await runRealInit(p.dir);
    expect(result.status).toBe("conflict");
    expect(exitCode).toBe(4);
    expect(prompter.requestIdentityCalls).toBe(0);
    expect(reporter.state?.kind).toBe("partial");
    if (reporter.state?.kind === "partial") {
      expect(reporter.state.present).toContain(MANAGED_FILES.config);
      expect(reporter.state.missing).toContain(MANAGED_FILES.manifest);
      expect(reporter.state.missing).toContain(MANAGED_FILES.tokens);
    }
    // No se crearon los faltantes ni se modificó el existente.
    expect(existsSync(join(p.dir, MANAGED_FILES.manifest))).toBe(false);
    expect(readFileSync(join(p.dir, MANAGED_FILES.config), "utf8")).toBe("{}\n");
  });

  it("configuración + manifiesto (faltan tokens) → conflict (exit 4)", async () => {
    const p = await host();
    await writeFileIn(p.dir, MANAGED_FILES.config, "{}\n");
    await writeFileIn(p.dir, MANAGED_FILES.manifest, "{}\n");
    const { result, exitCode } = await runRealInit(p.dir);
    expect(result.status).toBe("conflict");
    expect(exitCode).toBe(4);
    expect(existsSync(join(p.dir, MANAGED_FILES.tokens))).toBe(false);
  });

  it("solo tokens → conflict (exit 4)", async () => {
    const p = await host();
    await writeFileIn(p.dir, MANAGED_FILES.tokens, "{}\n");
    const { result, exitCode } = await runRealInit(p.dir);
    expect(result.status).toBe("conflict");
    expect(exitCode).toBe(4);
  });

  it("directorio ocupando una ruta de archivo → conflict (exit 4)", async () => {
    const p = await host();
    await writeFileIn(p.dir, MANAGED_FILES.config, "{}\n");
    await writeFileIn(p.dir, MANAGED_FILES.manifest, "{}\n");
    await ensureDir(p.dir, MANAGED_FILES.tokens); // ruta de archivo ocupada por un directorio
    const { result, exitCode } = await runRealInit(p.dir);
    expect(result.status).toBe("conflict");
    expect(exitCode).toBe(4);
  });

  it.skipIf(!HAS_SYMLINK)("symlink en una ruta administrada → conflict (exit 4), no lo sigue", async () => {
    const p = await host();
    const target = await writeFileIn(p.dir, "external-target.json", '{"x":1}\n');
    await symlinkIn(p.dir, MANAGED_FILES.config, target);
    const { result, exitCode } = await runRealInit(p.dir);
    expect(result.status).toBe("conflict");
    expect(exitCode).toBe(4);
    // El destino del symlink no se modificó.
    expect(readFileSync(target, "utf8")).toBe('{"x":1}\n');
  });
});
