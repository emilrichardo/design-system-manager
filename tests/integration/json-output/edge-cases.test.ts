import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MANAGED_FILES } from "../../../src/domain/plan/managed-files.js";
import { COLOR, makeProject } from "../../helpers/ds-fixtures.js";
import { createTmpProject, writeFileIn, type TmpProject } from "../../helpers/tmp-project.js";
import { buildConfig } from "../../../src/domain/builders/build-config.js";
import { runInspectJson, runValidateJson } from "./json-output-helpers.js";

const projects: TmpProject[] = [];

afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

describe("T028 — edge cases JSON", () => {
  it("UTF-8 invalido → read-error con JSON valido", async () => {
    const root = await makeProject(projects, { tokens: false });
    await mkdir(join(root, "design-system", "tokens"), { recursive: true });
    await writeFile(join(root, MANAGED_FILES.tokens), Buffer.from([0x7b, 0xff, 0xfe, 0x7d]));
    const result = await runValidateJson(root);
    expect(result.result.outcome).toBe("read-error");
    expect(result.json.outcome).toBe("read-error");
    expect(result.stderr).toBe("");
  });

  it.each([
    ["tipo desconocido", { x: { $type: "elevation", $value: "v", $description: "d" } }, "complete-invalid"],
    ["tipo reconocido superficial", { t: { $type: "dimension", $value: "16px", $description: "d" } }, "valid"],
    ["alias roto", { color: { $type: "color", ref: { $value: "{color.missing}", $description: "d" } } }, "complete-invalid"],
    ["ciclo", { color: { $type: "color", a: { $value: "{color.a}", $description: "d" } } }, "complete-invalid"],
  ] as const)("%s → outcome correcto y JSON valido", async (_name, tokens, outcome) => {
    const result = await runInspectJson(await makeProject(projects, { tokens }));
    expect(result.result.outcome).toBe(outcome);
    expect(result.json.outcome).toBe(outcome);
    expect(result.stderr).toBe("");
  });

  it("paths con espacios y Unicode se preservan en JSON", async () => {
    const root = await makeProject(projects, {
      tokens: { "color espacio": { $type: "color", "azul ñ": { $value: COLOR, $description: "día" } } },
    });
    const result = await runInspectJson(root);
    const body = result.json.result as { tokens: { paths: Array<{ path: string; description: string | null }> } };
    expect(result.result.outcome).toBe("valid");
    expect(body.tokens.paths).toEqual([
      expect.objectContaining({ path: "color espacio.azul ñ", description: "día" }),
    ]);
  });

  it("ruta de proyecto con espacios y Unicode produce JSON valido", async () => {
    const parent = await createTmpProject({ packageJson: false });
    projects.push(parent);
    const root = join(parent.dir, "host con espacios ñ");
    await writeFileIn(root, "package.json", "{}\n");
    await writeFileIn(root, MANAGED_FILES.config, `${JSON.stringify(buildConfig(), null, 2)}\n`);
    await writeFileIn(root, MANAGED_FILES.manifest, `${JSON.stringify({
      manifestSchemaVersion: "0.1.0",
      name: "Acme Ñ",
      slug: "acme-n",
      version: "0.1.0",
      tokensDir: "tokens",
    }, null, 2)}\n`);
    await writeFileIn(root, MANAGED_FILES.tokens, `${JSON.stringify({ color: { $type: "color", primary: { $value: COLOR, $description: "d" } } }, null, 2)}\n`);

    const result = await runValidateJson(root);
    expect(result.result.outcome).toBe("valid");
    expect(result.json.command).toBe("validate");
    expect(result.stderr).toBe("");
  });
});
