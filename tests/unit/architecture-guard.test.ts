import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { findViolations } from "../../scripts/arch-guard.mjs";
import { createTmpProject, type TmpProject } from "../helpers/tmp-project.js";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

async function syntheticGuard(layer: string, file: string, content: string): Promise<string[]> {
  const p = await createTmpProject({ packageJson: false });
  projects.push(p);
  const dir = join(p.dir, "src", layer);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, file), content, "utf8");
  return (await findViolations(p.dir)).map((v) => v.msg);
}

describe("T065 — auditoría arquitectónica (Constitución V/XIV/XV)", () => {
  it("el código real del repositorio no tiene violaciones", async () => {
    expect(await findViolations(REPO_ROOT)).toEqual([]);
  });

  it("domain: rechaza node/fs/zod/ajv/commander/clack/console/process.exit", async () => {
    const msgs = await syntheticGuard(
      "domain",
      "bad.ts",
      [
        'import fs from "node:fs";',
        'import path from "node:path";',
        'import { z } from "zod";',
        'import Ajv from "ajv";',
        'import { Command } from "commander";',
        'import { text } from "@clack/prompts";',
        "console.log(fs, path, z, Ajv, Command, text);",
        "process.exit(1);",
        "export {};",
      ].join("\n"),
    );
    expect(msgs).toContain("domain no debe importar filesystem");
    expect(msgs).toContain("domain no debe importar node:path");
    expect(msgs).toContain("console.* no permitido en domain");
    expect(msgs).toContain("process.exit() no permitido en domain");
  });

  it("application: rechaza commander/clack/fs/path/infra/console/process.exit", async () => {
    const msgs = await syntheticGuard(
      "application",
      "bad.ts",
      [
        'import { Command } from "commander";',
        'import { text } from "@clack/prompts";',
        'import fs from "node:fs";',
        'import { x } from "../infrastructure/y.js";',
        "console.log(Command, text, fs, x);",
        "process.exit(1);",
        "export {};",
      ].join("\n"),
    );
    expect(msgs).toContain("application no debe importar commander");
    expect(msgs).toContain("application no debe importar @clack/prompts");
    expect(msgs).toContain("application no debe importar filesystem");
    expect(msgs).toContain("application no debe importar infraestructura concreta");
    expect(msgs).toContain("console.* no permitido en application");
    expect(msgs).toContain("process.exit() no permitido en application");
  });

  it("infrastructure: rechaza commander y process.exit (Commander solo en CLI)", async () => {
    const msgs = await syntheticGuard(
      "infrastructure",
      "bad.ts",
      ['import { Command } from "commander";', "process.exit(1);", "export { Command };"].join("\n"),
    );
    expect(msgs).toContain("infrastructure no debe importar commander (solo CLI)");
    expect(msgs).toContain("process.exit() no permitido en infrastructure");
  });
});
