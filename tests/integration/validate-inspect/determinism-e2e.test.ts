// T045 — Determinismo: el mismo proyecto produce resultados idénticos (report/inspection/reporter/exit).
import { afterEach, describe, expect, it } from "vitest";
import { createBoundAnalyze, createInspectDependencies, createValidateDependencies } from "../../../src/cli/composition.js";
import { runValidate } from "../../../src/cli/commands/validate.js";
import { runInspect } from "../../../src/cli/commands/inspect.js";
import { ValidateTerminalReporter } from "../../../src/infrastructure/reporter/validate-terminal-reporter.js";
import { exitCodeForOutcome } from "../../../src/cli/exit-codes.js";
import { makeProject, validProject, COLOR } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});
const sink = { out: () => {}, err: () => {} };

function reporterText(): { io: { out: (t: string) => void; err: (t: string) => void }; text: () => string } {
  const buf: string[] = [];
  return { io: { out: (t) => buf.push(t), err: (t) => buf.push(t) }, text: () => buf.join("") };
}

async function twice(root: string) {
  const analyze = createBoundAnalyze();
  const v1 = await runValidate(root, createValidateDependencies(sink, analyze));
  const v2 = await runValidate(root, createValidateDependencies(sink, analyze));
  const i1 = await runInspect(root, createInspectDependencies(sink, analyze));
  const i2 = await runInspect(root, createInspectDependencies(sink, analyze));
  return { v1, v2, i1, i2 };
}

describe("T045 — determinismo (mismo proyecto)", () => {
  it("DS válido: validate e inspect idénticos en repeticiones", async () => {
    const root = await validProject(projects);
    const { v1, v2, i1, i2 } = await twice(root);
    expect(v1).toEqual(v2);
    expect(i1).toEqual(i2);
    expect(exitCodeForOutcome(v1.outcome)).toBe(exitCodeForOutcome(v2.outcome));
  });

  it("DS inválido (varios errores): resultados e issues idénticos y en mismo orden", async () => {
    const root = await makeProject(projects, {
      tokens: { color: { ok: { $type: "color", $value: COLOR, $description: "d" }, bad: { $type: "weird", $value: "v", $description: "d" }, broken: { $value: "{color.nope}", $description: "d" } } },
    });
    const { v1, v2, i1, i2 } = await twice(root);
    expect(v1).toEqual(v2);
    expect(i1).toEqual(i2);
    if (v1.outcome === "complete-invalid") {
      expect(v1.report.errors.map((e) => e.code)).toEqual(v2.outcome === "complete-invalid" ? v2.report.errors.map((e) => e.code) : []);
    }
  });

  it("la salida textual del reporter es estable", async () => {
    const root = await validProject(projects);
    const analyze = createBoundAnalyze();
    const r1 = reporterText();
    const r2 = reporterText();
    await runValidate(root, { analyze, reporter: new ValidateTerminalReporter(r1.io) });
    await runValidate(root, { analyze, reporter: new ValidateTerminalReporter(r2.io) });
    expect(r1.text()).toBe(r2.text());
    // host.root es absoluto pero estable dentro del mismo proyecto temporal
    expect(r1.text()).toContain("Estado: complete-valid");
  });
});
