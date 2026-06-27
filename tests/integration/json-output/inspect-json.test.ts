import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MANAGED_FILES } from "../../../src/domain/plan/managed-files.js";
import { emptyProject, makeProject, validProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import {
  expectEnvelope,
  runInspectJson,
  snapshotProject,
} from "./json-output-helpers.js";

const projects: TmpProject[] = [];

afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

async function readErrorProject(): Promise<string> {
  const root = await makeProject(projects, { tokens: false });
  await mkdir(join(root, "design-system", "tokens"), { recursive: true });
  await writeFile(join(root, MANAGED_FILES.tokens), Buffer.from([0x7b, 0xff, 0xfe, 0x7d]));
  return root;
}

describe("T026 — inspect --json con filesystem real", () => {
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
  ] as const)("%s → JSON parseable, outcome/exit correctos y DS intacto", async (outcome, build, code) => {
    const root = await build();
    const before = await snapshotProject(root);
    const result = await runInspectJson(root);

    expect(result.code).toBe(code);
    expect(result.result.outcome).toBe(outcome);
    expect(result.stderr).toBe("");
    expectEnvelope(result.json, "inspect", outcome);
    expect(await snapshotProject(root)).toEqual(before);

    if (outcome !== "not-found") {
      const body = result.json.result as Record<string, unknown>;
      expect(body.identity).toBeDefined();
      expect(body.schemaVersions).toBeDefined();
      expect(body.files).toEqual(expect.objectContaining({ expected: expect.any(Array), present: expect.any(Array), missing: expect.any(Array) }));
      expect(body.validation).toEqual(expect.objectContaining({ valid: expect.any(Boolean), summary: expect.any(Object) }));
      expect(body.limits).toEqual(expect.objectContaining({ reached: expect.any(Boolean), partial: expect.any(Boolean), hits: expect.any(Array) }));
    }
  });

  it("partial recupera identidad y archivos aunque tokens sea null", async () => {
    const result = await runInspectJson(await makeProject(projects, { tokens: false }));
    const body = result.json.result as {
      identity: { name: { value: string | null; trust: string } };
      files: { missing: string[] };
      tokens: null;
    };
    expect(result.result.outcome).toBe("partial");
    expect(body.identity.name).toEqual({ value: "Acme", trust: "valid" });
    expect(body.files.missing).toContain(MANAGED_FILES.tokens);
    expect(body.tokens).toBeNull();
  });
});
