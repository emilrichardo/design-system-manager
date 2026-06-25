import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// T001 + T007: valida campos clave del manifiesto y las dependencias declaradas (ADR-0005).
const pkgUrl = new URL("../../package.json", import.meta.url);

async function readPkg(): Promise<Record<string, any>> {
  return JSON.parse(await readFile(fileURLToPath(pkgUrl), "utf8"));
}

describe("package.json (bootstrap)", () => {
  it("declara nombre, ESM, bin y engines correctos", async () => {
    const pkg = await readPkg();
    expect(pkg.name).toBe("@neuraz/design-system-manager");
    expect(pkg.type).toBe("module");
    expect(pkg.bin["neuraz-ds"]).toBe("dist/cli/index.js");
    expect(pkg.engines.node).toBe(">=22");
  });

  it("expone los scripts de desarrollo y validación", async () => {
    const pkg = await readPkg();
    for (const script of ["build", "typecheck", "test", "lint"]) {
      expect(pkg.scripts[script], `falta script ${script}`).toBeTypeOf("string");
    }
  });

  it("declara las dependencias de producción aprobadas en ADR-0005", async () => {
    const pkg = await readPkg();
    for (const dep of ["commander", "@clack/prompts", "zod", "ajv", "semver"]) {
      expect(pkg.dependencies[dep], `falta dependency ${dep}`).toBeTypeOf("string");
    }
  });

  it("declara las dependencias de desarrollo del toolchain", async () => {
    const pkg = await readPkg();
    for (const dep of ["typescript", "vitest", "@types/node"]) {
      expect(pkg.devDependencies[dep], `falta devDependency ${dep}`).toBeTypeOf("string");
    }
  });
});
