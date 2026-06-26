import { describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/program.js";
import { exitCodeForResult } from "../../src/cli/exit-codes.js";
import { TerminalReporter } from "../../src/infrastructure/reporter/terminal-reporter.js";
import { buildDeps } from "../helpers/in-memory-adapters.js";
import type { CliIO } from "../../src/cli/io.js";

function captured(): { io: CliIO; out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { out: (s) => out.push(s), err: (s) => err.push(s) }, out, err };
}

const VERSION = "9.9.9";
const argv = (...args: string[]) => ["node", "neuraz-ds", ...args];

describe("runCli — programa (T043/T046)", () => {
  it("--help → 0 y muestra el comando init", async () => {
    const c = captured();
    const built = buildDeps();
    const code = await runCli({ argv: argv("--help"), cwd: "/host", io: c.io, deps: built.deps, version: VERSION });
    expect(code).toBe(0);
    expect(c.out.join("")).toContain("init");
    expect(built.writer.commitCalls).toBe(0); // no ejecuta init accidentalmente
  });

  it("init --help → 0, sin ejecutar init", async () => {
    const c = captured();
    const built = buildDeps();
    const code = await runCli({ argv: argv("init", "--help"), cwd: "/host", io: c.io, deps: built.deps, version: VERSION });
    expect(code).toBe(0);
    expect(built.writer.commitCalls).toBe(0);
  });

  it("--version → 0 y muestra la versión", async () => {
    const c = captured();
    const code = await runCli({ argv: argv("--version"), cwd: "/host", io: c.io, deps: buildDeps().deps, version: VERSION });
    expect(code).toBe(0);
    expect(c.out.join("")).toContain("9.9.9");
  });

  it("sin comando → muestra ayuda y 0, sin ejecutar init", async () => {
    const c = captured();
    const built = buildDeps();
    const code = await runCli({ argv: argv(), cwd: "/host", io: c.io, deps: built.deps, version: VERSION });
    expect(code).toBe(0);
    expect(c.out.join("") + c.err.join("")).toContain("Usage");
    expect(built.writer.commitCalls).toBe(0);
  });

  it("comando desconocido → 3", async () => {
    const c = captured();
    const code = await runCli({ argv: argv("frobnicate"), cwd: "/host", io: c.io, deps: buildDeps().deps, version: VERSION });
    expect(code).toBe(3);
  });

  it("opción desconocida → 3", async () => {
    const c = captured();
    const code = await runCli({ argv: argv("--nope"), cwd: "/host", io: c.io, deps: buildDeps().deps, version: VERSION });
    expect(code).toBe(3);
  });

  it("init: ejecuta el caso de uso una vez, pasa executionDir y aplica el código (created→0)", async () => {
    const c = captured();
    const built = buildDeps({ tx: { status: "committed", files: ["neuraz-ds.config.json"] } });
    const code = await runCli({ argv: argv("init"), cwd: "/proyecto/host", io: c.io, deps: built.deps, version: VERSION });
    expect(code).toBe(0);
    expect(built.writer.commitCalls).toBe(1);
    expect(built.resolver.lastExecutionDir).toBe("/proyecto/host");
  });

  it("init: el reporter de terminal muestra la raíz anfitriona antes del resultado", async () => {
    const c = captured();
    const reporter = new TerminalReporter(c.io);
    const built = buildDeps({ reporter, tx: { status: "committed", files: ["neuraz-ds.config.json"] } });
    await runCli({ argv: argv("init"), cwd: "/host", io: c.io, deps: built.deps, version: VERSION });
    const text = c.out.join("");
    const rootIdx = text.indexOf("Raíz anfitriona");
    const createdIdx = text.indexOf("inicializado correctamente");
    expect(rootIdx).toBeGreaterThanOrEqual(0);
    expect(createdIdx).toBeGreaterThan(rootIdx);
  });

  it("init: mapea failed/host → 5", async () => {
    const c = captured();
    const built = buildDeps({ resolution: { ok: false, error: { code: "package-json-missing", message: "falta" } } });
    const code = await runCli({ argv: argv("init"), cwd: "/host", io: c.io, deps: built.deps, version: VERSION });
    expect(code).toBe(5);
    expect(built.writer.commitCalls).toBe(0);
  });
});

describe("exit code aplicado por el runner", () => {
  it("la traducción es la del contrato", () => {
    expect(exitCodeForResult({ status: "cancelled" })).toBe(1);
  });
});
