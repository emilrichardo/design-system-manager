// T043/T044 (004) - Comando foundations via runCli con IO falso, flag local --json y streams.
import { describe, expect, it, vi } from "vitest";
import { runCli, type CliRuntime } from "../../src/cli/program.js";
import { FoundationsTerminalReporter } from "../../src/infrastructure/reporter/foundations-terminal-reporter.js";
import { FoundationsJsonReporter } from "../../src/infrastructure/reporter/foundations-json-reporter.js";
import { buildDeps } from "../helpers/in-memory-adapters.js";
import {
  analysisHostFailure,
  analysisPartial,
  analysisReadError,
  analysisValid,
  designSystemAnalysis,
  FIXTURE_PATHS,
} from "../helpers/analysis-fixtures.js";
import type { DesignSystemAnalysis } from "../../src/domain/analysis/design-system-analysis.js";
import { emptyStatistics } from "../../src/domain/analysis/inspection-statistics.js";
import { NEURAZ_EXTENSION_NAMESPACE } from "../../src/domain/foundations/parse-foundation-extension.js";

const VERSION = "9.9.9";

function nullIO() {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (text: string) => out.push(text), err: (text: string) => err.push(text) }, out, err };
}

function runtime(io: CliRuntime["io"], analyze: () => Promise<DesignSystemAnalysis>, argv: string): CliRuntime {
  const a = vi.fn(analyze);
  return {
    argv: ["node", "neuraz-ds", ...argv.split(" ").filter(Boolean)],
    cwd: "/host",
    io,
    deps: buildDeps().deps,
    foundationsDeps: { analyze: a, reporter: new FoundationsTerminalReporter(io) },
    foundationsJsonDeps: { analyze: a, reporter: new FoundationsJsonReporter(io) },
    version: VERSION,
  };
}

const OUTCOMES: ReadonlyArray<[string, () => DesignSystemAnalysis, number, string]> = [
  ["valid", analysisValid, 0, "valid"],
  ["complete-invalid", analysisFoundationInvalid, 3, "complete-invalid"],
  ["partial", analysisPartial, 4, "partial"],
  ["not-found", analysisHostFailure, 5, "not-found"],
  ["read-error", analysisReadError, 6, "read-error"],
];

function analysisFoundationInvalid(): DesignSystemAnalysis {
  return designSystemAnalysis({
    presence: { present: [FIXTURE_PATHS.CONFIG, FIXTURE_PATHS.MANIFEST, FIXTURE_PATHS.TOKENS], missing: [] },
    documents: {
      [FIXTURE_PATHS.TOKENS]: {
        relativePath: FIXTURE_PATHS.TOKENS,
        exists: true,
        kind: "file",
        trust: "valid",
        parsed: {
          spacing: {
            bad: {
              $type: "color",
              $value: "#fff",
              $extensions: { [NEURAZ_EXTENSION_NAMESPACE]: { foundation: { level: "primitive" } } },
            },
          },
        },
        issues: [],
      },
    },
    nodes: [{
      path: "spacing.bad",
      declaredType: "color",
      effectiveType: "color",
      typeOrigin: "own",
      typeSourcePath: null,
      kind: "concrete",
      aliasTarget: null,
      aliasState: "n/a",
      description: null,
      depth: 2,
      trust: "valid",
    }],
    statistics: { ...emptyStatistics, total: 1, concreteValues: 1, byType: { color: 1 }, maxDepth: 2 },
  });
}

describe("foundations comando humano (T040/T043)", () => {
  it("default sin --json usa salida humana y delega al caso de uso", async () => {
    const c = nullIO();
    expect(await runCli(runtime(c.io, async () => analysisValid(), "foundations"))).toBe(0);
    expect(c.out.join("")).toContain("Foundations: valid");
    expect(() => JSON.parse(c.out.join(""))).toThrow();
  });

  it("llama al analyzer exactamente una vez con executionDir", async () => {
    const c = nullIO();
    const analyze = vi.fn(async () => analysisValid());
    await runCli(runtime(c.io, analyze, "foundations"));
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(analyze).toHaveBeenCalledWith({ executionDir: "/host" });
  });
});

describe("foundations --json outcomes y streams (T043/T044)", () => {
  it.each(OUTCOMES)("%s -> exit %d, stdout 1 JSON, stderr vacio", async (_label, build, code, outcome) => {
    const c = nullIO();
    expect(await runCli(runtime(c.io, async () => build(), "foundations --json"))).toBe(code);
    expect(c.out).toHaveLength(1);
    expect(c.err).toHaveLength(0);
    const parsed = JSON.parse(c.out[0]!);
    expect(parsed.formatVersion).toBe("1.0.0");
    expect(parsed.command).toBe("foundations");
    expect(parsed.outcome).toBe(outcome);
    if (outcome === "not-found") expect(parsed.error).toBeNull();
  });

  it("humano y JSON comparten exit code por outcome", async () => {
    for (const [, build, code] of OUTCOMES) {
      const human = nullIO();
      const json = nullIO();
      expect(await runCli(runtime(human.io, async () => build(), "foundations"))).toBe(code);
      expect(await runCli(runtime(json.io, async () => build(), "foundations --json"))).toBe(code);
    }
  });
});

describe("foundations flag local y help (T043)", () => {
  it("help del programa lista foundations y el help del comando menciona --json", async () => {
    const root = nullIO();
    expect(await runCli(runtime(root.io, async () => analysisValid(), "--help"))).toBe(0);
    expect(root.out.join("")).toContain("foundations");

    const command = nullIO();
    expect(await runCli(runtime(command.io, async () => analysisValid(), "foundations --help"))).toBe(0);
    expect(command.out.join("")).toContain("--json");
  });

  it("init --json, --json foundations y opcion desconocida son error de uso 3", async () => {
    const init = nullIO();
    expect(await runCli(runtime(init.io, async () => analysisValid(), "init --json"))).toBe(3);

    const global = nullIO();
    expect(await runCli(runtime(global.io, async () => analysisValid(), "--json foundations"))).toBe(3);

    const unknown = nullIO();
    expect(await runCli(runtime(unknown.io, async () => analysisValid(), "foundations --unknown"))).toBe(3);
  });

  it("runtime sin foundationsDeps no rompe tests/comandos de init", async () => {
    const c = nullIO();
    const built = buildDeps();
    expect(await runCli({
      argv: ["node", "neuraz-ds", "init", "--help"],
      cwd: "/host",
      io: c.io,
      deps: built.deps,
      version: VERSION,
    })).toBe(0);
  });
});

describe("foundations internal-error JSON (T042/T043)", () => {
  const boom = async (): Promise<never> => {
    throw new Error("/secret/path EACCES\n  at module (/internal/node.js:1)");
  };

  it("foundations --json captura excepcion como JSON seguro en stderr y exit 70", async () => {
    const c = nullIO();
    const code = await runCli(runtime(c.io, boom, "foundations --json"));

    expect(code).toBe(70);
    expect(c.out).toHaveLength(0);
    expect(c.err).toHaveLength(1);
    expect(c.err.join("")).not.toContain("/secret/path");
    expect(c.err.join("")).not.toContain("EACCES");
    const parsed = JSON.parse(c.err[0]!);
    expect(parsed).toEqual({
      formatVersion: "1.0.0",
      command: "foundations",
      outcome: "internal-error",
      result: null,
      error: { code: "internal-cli-error", message: "Ocurrió un error interno." },
    });
  });

  it("foundations humano propaga la excepcion al entrypoint", async () => {
    const c = nullIO();
    await expect(runCli(runtime(c.io, boom, "foundations"))).rejects.toThrow();
    expect(c.out).toHaveLength(0);
  });
});
