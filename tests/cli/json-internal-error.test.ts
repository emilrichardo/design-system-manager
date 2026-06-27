// T024 (003) — Error interno en modo JSON: stdout vacío, un envelope seguro en stderr, exit 70.
// El modo humano conserva la propagación previa; los errores de uso de Commander no se convierten.
import { describe, expect, it, vi } from "vitest";
import { runCli } from "../../src/cli/program.js";
import type { CliRuntime } from "../../src/cli/program.js";
import { ValidateTerminalReporter } from "../../src/infrastructure/reporter/validate-terminal-reporter.js";
import { InspectTerminalReporter } from "../../src/infrastructure/reporter/inspect-terminal-reporter.js";
import { ValidateJsonReporter } from "../../src/infrastructure/reporter/validate-json-reporter.js";
import { InspectJsonReporter } from "../../src/infrastructure/reporter/inspect-json-reporter.js";
import { buildDeps } from "../helpers/in-memory-adapters.js";
import { analysisValid } from "../helpers/analysis-fixtures.js";

const VERSION = "9.9.9";
function nullIO() {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (t: string) => out.push(t), err: (t: string) => err.push(t) }, out, err };
}

const boom = async (): Promise<never> => {
  throw new Error("/secret/path EACCES en boom\n  at module (/internal/node.js:1)");
};

function runtime(io: CliRuntime["io"], argv: string): CliRuntime {
  return {
    argv: ["node", "neuraz-ds", ...argv.split(" ").filter(Boolean)],
    cwd: "/host",
    io,
    deps: buildDeps().deps,
    validateDeps: { analyze: vi.fn(boom), reporter: new ValidateTerminalReporter(io) },
    inspectDeps: { analyze: vi.fn(boom), reporter: new InspectTerminalReporter(io) },
    validateJsonDeps: { analyze: vi.fn(boom), reporter: new ValidateJsonReporter(io) },
    inspectJsonDeps: { analyze: vi.fn(boom), reporter: new InspectJsonReporter(io) },
    version: VERSION,
  };
}

describe("error interno JSON (T023)", () => {
  it.each(["validate", "inspect"])("%s --json: stdout vacío, stderr un JSON internal-error, exit 70", async (cmd) => {
    const c = nullIO();
    const code = await runCli(runtime(c.io, `${cmd} --json`));
    expect(code).toBe(70);
    expect(c.out).toHaveLength(0);
    expect(c.err).toHaveLength(1);
    const parsed = JSON.parse(c.err[0]!);
    expect(parsed).toEqual({
      formatVersion: "1.0.0",
      command: cmd,
      outcome: "internal-error",
      result: null,
      error: { code: "internal-cli-error", message: "Ocurrió un error interno." },
    });
  });

  it("no expone el mensaje original ni el stack", async () => {
    const c = nullIO();
    await runCli(runtime(c.io, "validate --json"));
    const text = c.err.join("");
    expect(text).not.toContain("/secret/path");
    expect(text).not.toContain("EACCES");
    expect(text).not.toContain("at module");
  });
});

describe("error interno humano y errores de uso (T023)", () => {
  it("validate (humano): la excepción se propaga al entrypoint (runCli rechaza)", async () => {
    const c = nullIO();
    await expect(runCli(runtime(c.io, "validate"))).rejects.toThrow();
    expect(c.out).toHaveLength(0); // sin JSON en modo humano
  });

  it("error de uso de Commander no se convierte en internal-error JSON", async () => {
    const c = nullIO();
    // `--unknown` se rechaza antes de ejecutar el caso de uso: exit 3, sin envelope JSON.
    expect(await runCli(runtime(c.io, "validate --json --unknown"))).toBe(3);
    expect(c.out).toHaveLength(0);
    expect(c.err.join("")).not.toContain("internal-error");
  });
});
