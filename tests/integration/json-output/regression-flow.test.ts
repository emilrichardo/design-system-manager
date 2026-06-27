import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { runInspect } from "../../../src/cli/commands/inspect.js";
import { runValidate } from "../../../src/cli/commands/validate.js";
import {
  createBoundAnalyze,
  createInspectDependencies,
  createInspectJsonDependencies,
  createValidateDependencies,
  createValidateJsonDependencies,
} from "../../../src/cli/composition.js";
import { exitCodeForOutcome } from "../../../src/cli/exit-codes.js";
import { COLOR, makeProject } from "../../helpers/ds-fixtures.js";
import { runRealInit } from "../../helpers/real-init.js";
import { createTmpProject, type TmpProject } from "../../helpers/tmp-project.js";
import { MANAGED_FILES } from "../../../src/domain/plan/managed-files.js";
import { captureIO, parseJsonStdout, snapshotProject } from "./json-output-helpers.js";

const projects: TmpProject[] = [];

afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

function readManaged(root: string): readonly string[] {
  return [
    readFileSync(`${root}/${MANAGED_FILES.config}`, "utf8"),
    readFileSync(`${root}/${MANAGED_FILES.manifest}`, "utf8"),
    readFileSync(`${root}/${MANAGED_FILES.tokens}`, "utf8"),
  ];
}

describe("T035 — flujo cruzado init → human → JSON → unchanged", () => {
  it("mantiene los tres documentos byte-identicos y cierra en unchanged/2", async () => {
    const project = await createTmpProject();
    projects.push(project);

    const init = await runRealInit(project.dir);
    expect(init.result.status).toBe("created");
    expect(init.exitCode).toBe(0);

    const afterInitSnapshot = await snapshotProject(project.dir);
    const afterInitDocs = readManaged(project.dir);

    const validateHumanIO = captureIO();
    const validateHuman = await runValidate(project.dir, createValidateDependencies(validateHumanIO.io, createBoundAnalyze()));
    expect(validateHuman.outcome).toBe("valid");
    expect(exitCodeForOutcome(validateHuman.outcome)).toBe(0);
    expect(await snapshotProject(project.dir)).toEqual(afterInitSnapshot);
    expect(readManaged(project.dir)).toEqual(afterInitDocs);

    const inspectHumanIO = captureIO();
    const inspectHuman = await runInspect(project.dir, createInspectDependencies(inspectHumanIO.io, createBoundAnalyze()));
    expect(inspectHuman.outcome).toBe("valid");
    expect(exitCodeForOutcome(inspectHuman.outcome)).toBe(0);
    expect(await snapshotProject(project.dir)).toEqual(afterInitSnapshot);
    expect(readManaged(project.dir)).toEqual(afterInitDocs);

    const validateJsonIO = captureIO();
    const validateJson = await runValidate(project.dir, createValidateJsonDependencies(validateJsonIO.io, createBoundAnalyze()));
    const validateEnvelope = parseJsonStdout(validateJsonIO.stdout());
    expect(validateJson.outcome).toBe("valid");
    expect(exitCodeForOutcome(validateJson.outcome)).toBe(0);
    expect(validateJsonIO.stderr()).toBe("");
    expect(validateEnvelope).toMatchObject({ formatVersion: "1.0.0", command: "validate", outcome: "valid" });
    expect(await snapshotProject(project.dir)).toEqual(afterInitSnapshot);

    const inspectJsonIO = captureIO();
    const inspectJson = await runInspect(project.dir, createInspectJsonDependencies(inspectJsonIO.io, createBoundAnalyze()));
    const inspectEnvelope = parseJsonStdout(inspectJsonIO.stdout()) as {
      result: {
        identity: { name: { value: string; trust: string } };
        files: { present: Array<{ relativePath: string }> };
        tokens: { total: number; aliases: number; byType: Record<string, number>; paths: Array<{ path: string; aliasTarget: string | null }> };
      };
    };
    expect(inspectJson.outcome).toBe("valid");
    expect(exitCodeForOutcome(inspectJson.outcome)).toBe(0);
    expect(inspectJsonIO.stderr()).toBe("");
    expect(inspectEnvelope).toMatchObject({ formatVersion: "1.0.0", command: "inspect", outcome: "valid" });
    expect(inspectEnvelope.result.identity.name).toEqual({ value: "Acme Design System", trust: "valid" });
    expect(inspectEnvelope.result.files.present.map((file) => file.relativePath)).toEqual([
      MANAGED_FILES.config,
      MANAGED_FILES.manifest,
      MANAGED_FILES.tokens,
    ]);
    expect(inspectEnvelope.result.tokens.total).toBe(2);
    expect(inspectEnvelope.result.tokens.aliases).toBe(1);
    expect(inspectEnvelope.result.tokens.byType).toEqual({ color: 2 });
    expect(inspectEnvelope.result.tokens.paths).toContainEqual(expect.objectContaining({
      path: "color.brand.primary",
      aliasTarget: "color.base.blue-500",
    }));
    expect(await snapshotProject(project.dir)).toEqual(afterInitSnapshot);
    expect(readManaged(project.dir)).toEqual(afterInitDocs);

    const initAgain = await runRealInit(project.dir);
    expect(initAgain.result.status).toBe("unchanged");
    expect(initAgain.exitCode).toBe(2);
    expect(await snapshotProject(project.dir)).toEqual(afterInitSnapshot);
    expect(afterInitSnapshot.some((entry) => entry.includes(".neuraz-ds-staging-"))).toBe(false);
  });

  it("mantiene la salida humana de inspect con cota visual de 200", async () => {
    const color: Record<string, unknown> = { $type: "color" };
    for (let i = 0; i < 250; i += 1) color[`t${i}`] = { $value: COLOR, $description: "d" };
    const root = await makeProject(projects, { tokens: { color } });
    const io = captureIO();

    const result = await runInspect(root, createInspectDependencies(io.io, createBoundAnalyze()));

    expect(result.outcome).toBe("valid");
    expect(io.stdout()).toContain("Mostrando 200 de 250 tokens.");
    expect(io.stdout()).toContain("50 tokens no se muestran en la salida textual.");
    expect(io.stdout()).toContain("Total: 250");
  });
});
