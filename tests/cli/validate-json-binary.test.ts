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

describe("T030 — binario validate --json", () => {
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
    const result = await runBinary(["validate", "--json"], root);
    const json = parseJsonStdout(result.stdout);

    expect(result.code).toBe(code);
    expect(result.stderr).toBe("");
    expect(json.formatVersion).toBe("1.0.0");
    expect(json.command).toBe("validate");
    expect(json.outcome).toBe(outcome);
    expect(result.stdout.endsWith("\n")).toBe(true);
    expect(result.stdout).not.toMatch(/\u001b\[/u);
    expect(result.stdout + result.stderr).not.toContain("Plan de inicialización");
    expect(await snapshotProject(root)).toEqual(before);
  });

  it("complete-invalid conserva JSON parseable aunque exit sea 3", async () => {
    const root = await makeProject(projects, {
      tokens: { color: { bad: { $type: "color", $value: "#fff", $description: "d" }, ok: { $type: "color", $value: COLOR, $description: "d" } } },
    });
    const result = await runBinary(["validate", "--json"], root);
    const json = parseJsonStdout(result.stdout);
    expect(result.code).toBe(3);
    expect((json.result as { errors: unknown[] }).errors.length).toBeGreaterThan(0);
  });
});
