// T022 (003) — validate/inspect --json vía runCli (IO falso, sin TTY): selección de modo, streams,
// exit codes intactos, flag local. El modo humano y el JSON comparten outcome y código.
import { describe, expect, it, vi } from "vitest";
import { runCli } from "../../src/cli/program.js";
import type { CliRuntime } from "../../src/cli/program.js";
import { ValidateTerminalReporter } from "../../src/infrastructure/reporter/validate-terminal-reporter.js";
import { InspectTerminalReporter } from "../../src/infrastructure/reporter/inspect-terminal-reporter.js";
import { ValidateJsonReporter } from "../../src/infrastructure/reporter/validate-json-reporter.js";
import { InspectJsonReporter } from "../../src/infrastructure/reporter/inspect-json-reporter.js";
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
  const a = vi.fn(analyze);
  return {
    argv: ["node", "neuraz-ds", ...argv.split(" ").filter(Boolean)],
    cwd: "/host",
    io,
    deps: buildDeps().deps,
    validateDeps: { analyze: a, reporter: new ValidateTerminalReporter(io) },
    inspectDeps: { analyze: a, reporter: new InspectTerminalReporter(io) },
    validateJsonDeps: { analyze: a, reporter: new ValidateJsonReporter(io) },
    inspectJsonDeps: { analyze: a, reporter: new InspectJsonReporter(io) },
    version: VERSION,
  };
}

const OUTCOMES: ReadonlyArray<[string, () => DesignSystemAnalysis, number, string]> = [
  ["valid", analysisValid, 0, "valid"],
  ["complete-invalid", analysisCompleteInvalid, 3, "complete-invalid"],
  ["partial", analysisPartial, 4, "partial"],
  ["not-found", analysisHostFailure, 5, "not-found"],
  ["read-error", analysisReadError, 6, "read-error"],
];

describe("validate --json (T022)", () => {
  it.each(OUTCOMES)("%s → exit %d, un JSON en stdout, stderr vacío", async (_l, build, code, outcome) => {
    const c = nullIO();
    expect(await runCli(runtime(c.io, async () => build(), "validate --json"))).toBe(code);
    expect(c.out).toHaveLength(1);
    expect(c.err).toHaveLength(0);
    const parsed = JSON.parse(c.out[0]!);
    expect(parsed.formatVersion).toBe("1.0.0");
    expect(parsed.command).toBe("validate");
    expect(parsed.outcome).toBe(outcome);
    if (outcome === "not-found") expect(parsed.error).toBeNull();
  });
});

describe("inspect --json (T022)", () => {
  it.each(OUTCOMES)("%s → exit %d, un JSON en stdout", async (_l, build, code, outcome) => {
    const c = nullIO();
    expect(await runCli(runtime(c.io, async () => build(), "inspect --json"))).toBe(code);
    expect(c.out).toHaveLength(1);
    expect(c.err).toHaveLength(0);
    const parsed = JSON.parse(c.out[0]!);
    expect(parsed.command).toBe("inspect");
    expect(parsed.outcome).toBe(outcome);
  });
});

describe("selección de modo y exit codes coincidentes (T022)", () => {
  it("sin --json: salida humana (no JSON) en stdout", async () => {
    const c = nullIO();
    expect(await runCli(runtime(c.io, async () => analysisValid(), "validate"))).toBe(0);
    expect(() => JSON.parse(c.out.join(""))).toThrow();
    expect(c.out.join("")).toContain("Validación del Design System");
  });

  it("humano y JSON producen el mismo exit code por outcome", async () => {
    for (const [, build, code] of OUTCOMES) {
      const human = nullIO();
      const json = nullIO();
      const h = await runCli(runtime(human.io, async () => build(), "validate"));
      const j = await runCli(runtime(json.io, async () => build(), "validate --json"));
      expect(h).toBe(code);
      expect(j).toBe(code);
    }
  });

  it("una sola ejecución del caso de uso en modo JSON", async () => {
    const c = nullIO();
    const analyze = vi.fn(async () => analysisValid());
    const rt: CliRuntime = {
      ...runtime(c.io, analyze, "validate --json"),
      validateJsonDeps: { analyze, reporter: new ValidateJsonReporter(c.io) },
    };
    await runCli(rt);
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(analyze).toHaveBeenCalledWith({ executionDir: "/host" });
  });
});

describe("flag local --json (T022)", () => {
  it("init --json es error de uso (exit 3)", async () => {
    const c = nullIO();
    expect(await runCli(runtime(c.io, async () => analysisValid(), "init --json"))).toBe(3);
  });

  it("--json antes del subcomando (global) es error de uso (exit 3)", async () => {
    const c = nullIO();
    expect(await runCli(runtime(c.io, async () => analysisValid(), "--json validate"))).toBe(3);
  });

  it("opción desconocida sigue rechazada (exit 3)", async () => {
    const c = nullIO();
    expect(await runCli(runtime(c.io, async () => analysisValid(), "validate --unknown"))).toBe(3);
  });

  it("la ayuda de validate/inspect menciona --json", async () => {
    const c = nullIO();
    await runCli(runtime(c.io, async () => analysisValid(), "validate --help"));
    expect(c.out.join("")).toContain("--json");
  });
});
