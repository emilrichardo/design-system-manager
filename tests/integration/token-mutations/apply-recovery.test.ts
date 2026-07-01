// T032 (008) — Fault injection sobre `createTokenSourceWriter`: fallo antes del commit point, fallo
// tras crear el backup, fallo de rename, restore exitoso, restore fallido (catastrófico), verificación
// post-write fallida, y cambio concurrente detectado antes de escribir. Reusa el seam `WriterFileSystem`
// inyectable de `006` (`failingFs`) — el writer real de tokens nunca toca `node:fs` directamente.
import { readFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyTokenMutation } from "../../../src/application/token-mutations/apply-token-mutation.js";
import { createTokenMutationCommand } from "../../../src/domain/token-mutations/command.js";
import { createTokenSourceWriter } from "../../../src/infrastructure/token-mutations/token-source-writer.js";
import { nodeWriterFileSystem } from "../../../src/infrastructure/build-export/artifact-set-writer.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import { failingFs } from "../../helpers/writer-fakes.js";
import { realPlanDeps, seedInitializedProject, TOKENS_REL, readTokens } from "./real-deps.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

const op = { kind: "update-value" as const, path: "color.base.blue-500", value: "#ffffff" };

async function applyWithFs(project: TmpProject, fs: ReturnType<typeof failingFs>) {
  return applyTokenMutation(
    { executionDir: project.dir },
    createTokenMutationCommand([op]),
    { ...realPlanDeps(), createWriter: (rootDir: string) => createTokenSourceWriter(rootDir, fs) },
  );
}

/** Path absoluto real del target, resolviendo symlinks (p.ej. `/var` → `/private/var` en macOS) igual
 * que `resolveHostRoot` para que los hooks de `failingFs` intercepten el path exacto que usa el writer. */
function realTargetAbs(project: TmpProject): string {
  return join(realpathSync(project.dir), TOKENS_REL);
}

describe("applyTokenMutation — recovery y fault injection (T032)", () => {
  it("fallo antes del commit point (escritura del temp falla): write-error, fuente disponible, sin backup, sin recovery", async () => {
    const project = await seedInitializedProject();
    projects.push(project);
    const before = await readTokens(project);
    const fs = failingFs(undefined, { writeFile: () => new Error("EACCES") });

    const r = await applyWithFs(project, fs);

    expect(r.outcome).toBe("write-error");
    expect(r.wrote).toBe(false);
    expect(r.recovery).toMatchObject({ sourceAvailable: true, backupRelativePath: null, recoveryRequired: false });
    expect(await readTokens(project)).toEqual(before);
  });

  it("fallo al crear el backup (tras temp-write/verify): write-error, fuente intacta, sin backup retenido", async () => {
    const project = await seedInitializedProject();
    projects.push(project);
    const before = await readTokens(project);
    const fs = failingFs(undefined, { copyFile: () => new Error("EACCES") });

    const r = await applyWithFs(project, fs);

    expect(r.outcome).toBe("write-error");
    expect(r.recovery).toMatchObject({ sourceAvailable: true, backupRelativePath: null, recoveryRequired: false });
    expect(await readTokens(project)).toEqual(before);
  });

  it("fallo de rename (commit point): write-error, fuente intacta, backup huérfano limpiado", async () => {
    const project = await seedInitializedProject();
    projects.push(project);
    const before = await readTokens(project);
    const fs = failingFs(undefined, { rename: () => new Error("EPERM") });

    const r = await applyWithFs(project, fs);

    expect(r.outcome).toBe("write-error");
    expect(r.recovery).toMatchObject({ sourceAvailable: true, backupRelativePath: null, recoveryRequired: false });
    expect(await readTokens(project)).toEqual(before);
  });

  it("verificación posterior falla, restore exitoso: verification-error, wrote false, fuente disponible y restaurada, backup retenido, recovery requerido", async () => {
    const project = await seedInitializedProject();
    projects.push(project);
    const before = await readTokens(project);
    const targetAbs = realTargetAbs(project);
    let readsOfTarget = 0;
    // El writer lee `targetAbs` dos veces: identity check (antes de escribir) y verificación post-write
    // (tras el commit point). Solo corrompemos la SEGUNDA lectura para que la identidad pase y el fallo
    // ocurra exclusivamente en la verificación posterior.
    const fs = failingFs(undefined, {
      readFile: (p) => (p === targetAbs && ++readsOfTarget === 2 ? new TextEncoder().encode("CORRUPTO") : undefined),
    });

    const r = await applyWithFs(project, fs);

    expect(r.outcome).toBe("verification-error");
    expect(r.wrote).toBe(false);
    expect(r.recovery).toMatchObject({ sourceAvailable: true, recoveryRequired: true });
    expect(r.recovery?.backupRelativePath).toBe(`${TOKENS_REL}.bak`);
    expect(r.recovery?.backupRelativePath?.startsWith("/")).toBe(false);
    // restore copió el backup de vuelta: la fuente quedó igual a la original (sin la mutación aplicada).
    expect(await readTokens(project)).toEqual(before);
    // el backup sigue presente en disco (sin cleanup automático tras restaurar).
    const backupContent = await readFile(join(realpathSync(project.dir), `${TOKENS_REL}.bak`), "utf8");
    expect(JSON.parse(backupContent)).toEqual(before);
  });

  it("verificación posterior falla, restore también falla: write-error catastrófico, fuente NO disponible, backup retenido, recovery requerido", async () => {
    const project = await seedInitializedProject();
    projects.push(project);
    const targetAbs = realTargetAbs(project);
    const backupAbs = join(realpathSync(project.dir), `${TOKENS_REL}.bak`);
    let readsOfTarget = 0;
    const fs = failingFs(undefined, {
      readFile: (p) => (p === targetAbs && ++readsOfTarget === 2 ? new TextEncoder().encode("CORRUPTO") : undefined),
      copyFile: (from, to) => (to === targetAbs && from === backupAbs ? new Error("EACCES") : undefined),
    });

    const r = await applyWithFs(project, fs);

    expect(r.outcome).toBe("write-error");
    expect(r.wrote).toBe(false);
    expect(r.recovery).toMatchObject({ sourceAvailable: false, recoveryRequired: true });
    expect(r.recovery?.backupRelativePath).toBe(`${TOKENS_REL}.bak`);
  });

  it("cambio concurrente detectado antes de escribir: conflict, sin escritura, sin backup", async () => {
    const project = await seedInitializedProject();
    projects.push(project);
    const before = await readTokens(project);
    const targetAbs = realTargetAbs(project);
    // Simula que otra escritura cambió la fuente justo antes de que el writer la lea (entre snapshot y apply).
    const fs = failingFs(undefined, { readFile: (p) => (p === targetAbs ? new TextEncoder().encode('{"changed":true}') : undefined) });

    const r = await applyWithFs(project, fs);

    expect(r.outcome).toBe("conflict");
    expect(r.wrote).toBe(false);
    expect(r.recovery).toBeNull();
    expect(r.conflicts.some((c) => c.code === "concurrent-source-change")).toBe(true);
    expect(await readTokens(project)).toEqual(before);
  });

  it("smoke del seam con fs real (sin hooks): el comportamiento es idéntico al writer por defecto", async () => {
    const project = await seedInitializedProject();
    projects.push(project);
    const r = await applyWithFs(project, failingFs(nodeWriterFileSystem));
    expect(r.outcome).toBe("applied");
  });
});
