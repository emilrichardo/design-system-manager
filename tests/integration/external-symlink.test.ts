import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import {
  createTmpProject,
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

// NOTA (desviación documentada de T055): el texto de la tarea sugiere exit 5 (host) para "ruta que
// escapa". El comportamiento REAL y seguro del producto es: un symlink en una ruta administrada se
// clasifica como `partial` → conflict (4); un directorio administrado que es un symlink externo se
// rechaza en la promoción → failed/filesystem (6). En ambos casos NO se sigue el symlink, NO se
// escribe y NO se modifica el destino externo. TransactionResult no puede expresar la categoría
// "host" (solo el resolver lo hace, vía "sin package.json" → exit 5, cubierto por T050).
describe("T055 — symlinks y escapes (seguridad de rutas)", () => {
  it.skipIf(!HAS_SYMLINK)("symlink externo en ruta administrada → conflict, no lo sigue ni modifica el destino", async () => {
    const host = await createTmpProject({ packageJson: { name: "host" } });
    projects.push(host);
    const outside = await createTmpProject({ packageJson: false });
    projects.push(outside);
    const externalTarget = await writeFileIn(outside.dir, "victim.json", '{"keep":true}\n');
    await symlinkIn(host.dir, MANAGED_FILES.config, externalTarget);

    const { result, exitCode } = await runRealInit(host.dir);

    expect(result.status).toBe("conflict");
    expect(exitCode).toBe(4);
    // El destino externo permanece intacto y no se crearon los otros archivos.
    expect(readFileSync(externalTarget, "utf8")).toBe('{"keep":true}\n');
    expect(existsSync(join(host.dir, MANAGED_FILES.manifest))).toBe(false);
  });

  it.skipIf(!HAS_SYMLINK)("design-system es un symlink externo → rechazo sin escribir en el exterior", async () => {
    const host = await createTmpProject({ packageJson: { name: "host" } });
    projects.push(host);
    const outside = await createTmpProject({ packageJson: false });
    projects.push(outside);
    await symlinkIn(host.dir, "design-system", outside.dir); // dir administrado = symlink externo

    const { result, exitCode } = await runRealInit(host.dir);

    expect(result.status).toBe("failed");
    if (result.status === "failed") expect(result.category).toBe("filesystem");
    expect(exitCode).toBe(6);
    // No se escribió nada a través del symlink (el directorio externo sigue vacío).
    expect(readdirSync(outside.dir)).toEqual([]);
    // Sin staging remanente en el host.
    expect(readdirSync(host.dir).filter((n) => n.startsWith(".neuraz-ds-staging-"))).toEqual([]);
  });
});
