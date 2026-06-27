// T037/T038 — Comandos validate/inspect vía runCli con dependencias inyectadas (IO falso, sin TTY).
import { describe, expect, it, vi } from "vitest";
import { runCli } from "../../src/cli/program.js";
import type { CliRuntime } from "../../src/cli/program.js";
import { ValidateTerminalReporter } from "../../src/infrastructure/reporter/validate-terminal-reporter.js";
import { InspectTerminalReporter } from "../../src/infrastructure/reporter/inspect-terminal-reporter.js";
import { buildDeps } from "../helpers/in-memory-adapters.js";
import {
  analysisCompleteInvalid,
  analysisHostFailure,
  analysisPartial,
  analysisReadError,
  analysisValid,
} from "../helpers/analysis-fixtures.js";
import type { DesignSystemAnalysis } from "../../src/domain/analysis/design-system-analysis.js";

const VERSION = "9.9.9";
function nullIO() {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (t: string) => out.push(t), err: (t: string) => err.push(t) }, out, err };
}

function runtime(io: CliRuntime["io"], analyze: () => Promise<DesignSystemAnalysis>, argv: string): CliRuntime {
  return {
    argv: ["node", "neuraz-ds", ...argv.split(" ").filter(Boolean)],
    cwd: "/host",
    io,
    deps: buildDeps().deps,
    validateDeps: { analyze: vi.fn(analyze), reporter: new ValidateTerminalReporter(io) },
    inspectDeps: { analyze: vi.fn(analyze), reporter: new InspectTerminalReporter(io) },
    version: VERSION,
  };
}

describe("comando validate (T037)", () => {
  const cases: ReadonlyArray<[string, () => DesignSystemAnalysis, number]> = [
    ["valid", analysisValid, 0],
    ["complete-invalid", analysisCompleteInvalid, 3],
    ["partial", analysisPartial, 4],
    ["host-failure", analysisHostFailure, 5],
    ["read-error", analysisReadError, 6],
  ];
  it.each(cases)("%s → exit %d", async (_l, build, code) => {
    const c = nullIO();
    expect(await runCli(runtime(c.io, async () => build(), "validate"))).toBe(code);
  });

  it("llama al análisis exactamente una vez", async () => {
    const c = nullIO();
    const analyze = vi.fn(async () => analysisValid());
    const rt: CliRuntime = { ...runtime(c.io, analyze, "validate"), validateDeps: { analyze, reporter: new ValidateTerminalReporter(c.io) } };
    await runCli(rt);
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(analyze).toHaveBeenCalledWith({ executionDir: "/host" });
  });
});

describe("comando inspect (T037)", () => {
  const cases: ReadonlyArray<[string, () => DesignSystemAnalysis, number]> = [
    ["valid", analysisValid, 0],
    ["complete-invalid", analysisCompleteInvalid, 3],
    ["partial", analysisPartial, 4],
    ["host-failure", analysisHostFailure, 5],
    ["read-error", analysisReadError, 6],
  ];
  it.each(cases)("%s → exit %d", async (_l, build, code) => {
    const c = nullIO();
    expect(await runCli(runtime(c.io, async () => build(), "inspect"))).toBe(code);
  });

  it("ayuda de validate/inspect disponible (exit 0)", async () => {
    const c = nullIO();
    expect(await runCli(runtime(c.io, async () => analysisValid(), "validate --help"))).toBe(0);
    expect(await runCli(runtime(c.io, async () => analysisValid(), "inspect --help"))).toBe(0);
  });

  it("--help del programa lista validate e inspect", async () => {
    const c = nullIO();
    await runCli(runtime(c.io, async () => analysisValid(), "--help"));
    const help = c.out.join("");
    expect(help).toContain("validate");
    expect(help).toContain("inspect");
  });
});
