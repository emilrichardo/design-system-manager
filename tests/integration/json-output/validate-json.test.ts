import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MANAGED_FILES } from "../../../src/domain/plan/managed-files.js";
import { COLOR, emptyProject, makeProject, validProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import {
  expectEnvelope,
  runValidateJson,
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

describe("T025 — validate --json con filesystem real", () => {
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
    const result = await runValidateJson(root);

    expect(result.code).toBe(code);
    expect(result.result.outcome).toBe(outcome);
    expect(result.stderr).toBe("");
    expectEnvelope(result.json, "validate", outcome);
    expect(await snapshotProject(root)).toEqual(before);

    if (outcome !== "not-found") {
      const body = result.json.result as Record<string, unknown>;
      expect(body.structuralState).toEqual(expect.any(String));
      expect(body.summary).toEqual(expect.objectContaining({ errors: expect.any(Number), warnings: expect.any(Number) }));
      expect(Array.isArray(body.errors)).toBe(true);
      expect(Array.isArray(body.warnings)).toBe(true);
    }
  });

  it("complete-invalid conserva issues estructurados", async () => {
    const root = await makeProject(projects, {
      tokens: { color: { bad: { $type: "color", $value: "#fff", $description: "d" }, ok: { $type: "color", $value: COLOR, $description: "d" } } },
    });
    const result = await runValidateJson(root);
    const body = result.json.result as { errors: Array<{ code: string; document: string | null; path: string | null }> };
    expect(result.result.outcome).toBe("complete-invalid");
    expect(body.errors.some((issue) => issue.code.length > 0 && issue.document === "tokens" && issue.path !== null)).toBe(true);
  });
});
