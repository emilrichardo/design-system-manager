import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findViolations } from "../../scripts/arch-guard.mjs";

// T004: el guard arquitectónico no debe reportar violaciones en el código actual,
// y debe detectar `console.*`/imports prohibidos si se introdujeran en domain/application.
const ROOT = fileURLToPath(new URL("../..", import.meta.url));

describe("arch-guard (console + imports en domain/application)", () => {
  it("no encuentra violaciones en el código de bootstrap", async () => {
    const violations = await findViolations(ROOT);
    expect(violations).toEqual([]);
  });

  it("expone una función de detección reutilizable", () => {
    expect(findViolations).toBeTypeOf("function");
  });

  it("detecta console.* e imports prohibidos (node/infra) en una application sintética", async () => {
    const { createTmpProject } = await import("../helpers/tmp-project.js");
    const { mkdir, writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const p = await createTmpProject({ packageJson: false });
    try {
      const appDir = join(p.dir, "src", "application");
      await mkdir(appDir, { recursive: true });
      await writeFile(
        join(appDir, "bad.ts"),
        'import fs from "node:fs";\nimport { x } from "../infrastructure/y.js";\nconsole.log(fs, x);\n',
        "utf8",
      );
      const violations = await findViolations(p.dir);
      const msgs = violations.map((v) => v.msg);
      expect(msgs).toContain("console.* no permitido en application");
      expect(msgs).toContain("application no debe importar filesystem");
      expect(msgs).toContain("application no debe importar infraestructura concreta");
    } finally {
      await p.cleanup();
    }
  });
});
