import { afterEach, describe, expect, it } from "vitest";
import { emptyProject, makeProject, validProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import {
  runInspectHuman,
  runInspectJson,
  runValidateHuman,
  runValidateJson,
} from "./json-output-helpers.js";

const projects: TmpProject[] = [];

afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

describe("T029 — modo humano vs JSON", () => {
  it.each([
    ["valid", async () => validProject(projects)],
    ["complete-invalid", async () => makeProject(projects, { tokens: { x: { $type: "weird", $value: "v", $description: "d" } } })],
    ["partial", async () => makeProject(projects, { tokens: false })],
    ["not-found", async () => emptyProject(projects)],
  ] as const)("validate %s: formato distinto, outcome y exit code iguales", async (_name, build) => {
    const root = await build();
    const human = await runValidateHuman(root);
    const json = await runValidateJson(root);

    expect(json.result.outcome).toBe(human.result.outcome);
    expect(json.code).toBe(human.code);
    expect(json.json.outcome).toBe(human.result.outcome);
    expect(() => JSON.parse(human.text)).toThrow();
  });

  it.each([
    ["valid", async () => validProject(projects)],
    ["complete-invalid", async () => makeProject(projects, { tokens: { x: { $type: "weird", $value: "v", $description: "d" } } })],
    ["partial", async () => makeProject(projects, { tokens: false })],
    ["not-found", async () => emptyProject(projects)],
  ] as const)("inspect %s: formato distinto, outcome y exit code iguales", async (_name, build) => {
    const root = await build();
    const human = await runInspectHuman(root);
    const json = await runInspectJson(root);

    expect(json.result.outcome).toBe(human.result.outcome);
    expect(json.code).toBe(human.code);
    expect(json.json.outcome).toBe(human.result.outcome);
    expect(() => JSON.parse(human.text)).toThrow();
  });
});
