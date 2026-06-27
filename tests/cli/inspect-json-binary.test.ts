import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import { COLOR, emptyProject, makeProject, validProject } from "../helpers/ds-fixtures.js";
import { ensureBuilt, runBinary } from "../helpers/run-binary.js";
import type { TmpProject } from "../helpers/tmp-project.js";
import { parseJsonStdout, snapshotProject } from "../integration/json-output/json-output-helpers.js";

const projects: TmpProject[] = [];

beforeAll(() => {
  ensureBuilt();
}, 120000);

afterAll(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

async function readErrorProject(): Promise<string> {
  const root = await makeProject(projects, { tokens: false });
  await mkdir(join(root, "design-system", "tokens"), { recursive: true });
  await writeFile(join(root, MANAGED_FILES.tokens), Buffer.from([0x7b, 0xff, 0xfe, 0x7d]));
  return root;
}

describe("T031 — binario inspect --json", () => {
  it.each([
    ["valid", async () => validProject(projects), 0],
    [
      "complete-invalid",
      async () => makeProject(projects, { tokens: { x: { $type: "weird", $value: "v", $description: "d" } } }),
      3,
    ],
    ["partial", async () => makeProject(projects, { tokens: false }), 4],
    ["not-found", async () => emptyProject(projects), 5],
    ["read-error", readErrorProject, 6],
  ] as const)("%s → stdout JSON unico, stderr vacio, exit correcto", async (outcome, build, code) => {
    const root = await build();
    const before = await snapshotProject(root);
    const result = await runBinary(["inspect", "--json"], root);
    const json = parseJsonStdout(result.stdout);

    expect(result.code).toBe(code);
    expect(result.stderr).toBe("");
    expect(json.formatVersion).toBe("1.0.0");
    expect(json.command).toBe("inspect");
    expect(json.outcome).toBe(outcome);
    expect(result.stdout).not.toMatch(/\u001b\[/u);
    expect(result.stdout + result.stderr).not.toContain("Plan de inicialización");
    expect(await snapshotProject(root)).toEqual(before);
  });

  it(">200 tokens conserva todos los paths y no imprime truncado", async () => {
    const color: Record<string, unknown> = { $type: "color" };
    for (let i = 0; i < 250; i += 1) color[`t${i}`] = { $value: COLOR, $description: "d" };
    const root = await makeProject(projects, { tokens: { color } });
    const result = await runBinary(["inspect", "--json"], root);
    const json = parseJsonStdout(result.stdout) as { result: { tokens: { total: number; paths: unknown[] } } };

    expect(result.code).toBe(0);
    expect(result.stderr).toBe("");
    expect(json.result.tokens.total).toBe(250);
    expect(json.result.tokens.paths).toHaveLength(250);
    expect(result.stdout).not.toContain("Mostrando");
    expect(result.stdout).not.toContain("tokens no se muestran");
  });

  it("politica Commander: --json no convierte errores de uso en JSON", async () => {
    const root = await validProject(projects);
    const validateUnknown = await runBinary(["validate", "--json", "--unknown"], root);
    const inspectUnknown = await runBinary(["inspect", "--json", "--unknown"], root);
    const initJson = await runBinary(["init", "--json"], root);
    const globalJson = await runBinary(["--json", "validate"], root);

    expect(validateUnknown.code).toBe(3);
    expect(inspectUnknown.code).toBe(3);
    expect(initJson.code).toBe(3);
    expect(globalJson.code).toBe(3);
    expect(() => JSON.parse(validateUnknown.stderr)).toThrow();
    expect(() => JSON.parse(inspectUnknown.stderr)).toThrow();
    expect(initJson.stdout + initJson.stderr).not.toContain("internal-error");
    expect(globalJson.stdout + globalJson.stderr).not.toContain("internal-error");
  });
});
