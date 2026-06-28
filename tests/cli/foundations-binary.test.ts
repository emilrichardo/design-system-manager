// T047 (004) - Binario real foundations --json, sin TTY.
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildConfig } from "../../src/domain/builders/build-config.js";
import { MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import { COLOR, VALID_MANIFEST, emptyProject, makeProject } from "../helpers/ds-fixtures.js";
import { ensureBuilt, runBinary } from "../helpers/run-binary.js";
import { createTmpProject, writeFileIn, type TmpProject } from "../helpers/tmp-project.js";
import { foundation } from "../integration/foundations/foundations-test-helpers.js";
import { parseJsonStdout, snapshotProject } from "../integration/json-output/json-output-helpers.js";

const projects: TmpProject[] = [];
beforeAll(() => {
  ensureBuilt();
}, 120000);
afterAll(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

async function valid(): Promise<string> {
  return makeProject(projects, { tokens: { color: { base: { $type: "color", $value: COLOR, $description: "d", ...foundation("primitive") } } } });
}
async function invalid(): Promise<string> {
  return makeProject(projects, { tokens: { spacing: { bad: { $type: "color", $value: COLOR, $description: "d", ...foundation("primitive") } } } });
}
async function partial(): Promise<string> {
  return makeProject(projects, { tokens: false });
}
async function notFound(): Promise<string> {
  return emptyProject(projects);
}
async function readError(): Promise<string> {
  const root = await makeProject(projects, { tokens: false });
  await mkdir(join(root, "design-system", "tokens"), { recursive: true });
  await writeFile(join(root, MANAGED_FILES.tokens), Buffer.from([0x7b, 0xff, 0xfe, 0x7d]));
  return root;
}

describe("foundations binary --json (T047)", () => {
  it.each([
    ["valid", valid, 0],
    ["complete-invalid", invalid, 3],
    ["partial", partial, 4],
    ["not-found", notFound, 5],
    ["read-error", readError, 6],
  ] as const)("%s -> stdout JSON unico, stderr vacio, exit correcto", async (outcome, build, code) => {
    const root = await build();
    const before = await snapshotProject(root);
    const r = await runBinary(["foundations", "--json"], root);
    const json = parseJsonStdout(r.stdout);

    expect(r.code).toBe(code);
    expect(r.stderr).toBe("");
    expect(json).toMatchObject({ formatVersion: "1.0.0", command: "foundations", outcome });
    expect(r.stdout).not.toMatch(/\u001b\[/u);
    expect(await snapshotProject(root)).toEqual(before);
  });

  it("help y usage errors", async () => {
    const root = await valid();
    const help = await runBinary(["foundations", "--help"], root);
    expect(help.code).toBe(0);
    expect(help.stdout).toContain("--json");
    expect(help.stdout).toContain("foundations");
    expect((await runBinary(["foundations", "--unknown"], root)).code).toBe(3);
    expect((await runBinary(["--json", "foundations"], root)).code).toBe(3);
    expect((await runBinary(["init", "--json"], root)).code).toBe(3);
  });

  it("no crea archivos nuevos", async () => {
    const p = await createTmpProject();
    projects.push(p);
    await writeFileIn(p.dir, MANAGED_FILES.config, `${JSON.stringify(buildConfig(), null, 2)}\n`);
    await writeFileIn(p.dir, MANAGED_FILES.manifest, `${JSON.stringify(VALID_MANIFEST, null, 2)}\n`);
    await writeFileIn(p.dir, MANAGED_FILES.tokens, `${JSON.stringify({ color: { base: { $type: "color", $value: COLOR, ...foundation("primitive") } } }, null, 2)}\n`);
    const before = await snapshotProject(p.dir);
    await runBinary(["foundations", "--json"], p.dir);
    expect(await snapshotProject(p.dir)).toEqual(before);
  });
});
