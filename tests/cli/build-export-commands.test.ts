// T144 (006) — Comandos build/export en proceso: un caso de uso por invocación, selección correcta de
// reporter (humano vs JSON), y export sin escritura (no toca el writer). Exit codes vía la tabla común.
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/program.js";
import { makeBuildExportCli } from "./build-export-cli-fakes.js";
import { readSnapshot } from "../application/build-export/build-export-fakes.js";
import { buildDeps as initDeps } from "../helpers/in-memory-adapters.js";
import type { TmpProject } from "../helpers/tmp-project.js";

const VERSION = "9.9.9";
const argv = (...args: string[]) => ["node", "neuraz-ds", ...args];
const bag: TmpProject[] = [];
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

describe("build/export commands (T144)", () => {
  it("`build` ejecuta un solo caso de uso, usa el reporter humano y publica (built/0)", async () => {
    const snapshot = await readSnapshot(bag);
    const h = makeBuildExportCli(snapshot);
    const code = await runCli({ argv: argv("build"), cwd: "/host", io: h.io, deps: initDeps().deps, buildExportDeps: h.deps, version: VERSION });
    expect(code).toBe(0);
    expect(h.writer.calls).toBe(1);
    expect(h.inspector.calls).toBe(1);
    expect(h.io.outText).toContain("Build: built");
    expect(h.io.errText).toBe("");
  });

  it("`build --json` usa el reporter JSON (un envelope a stdout)", async () => {
    const snapshot = await readSnapshot(bag);
    const h = makeBuildExportCli(snapshot);
    const code = await runCli({ argv: argv("build", "--json"), cwd: "/host", io: h.io, deps: initDeps().deps, buildExportDeps: h.deps, version: VERSION });
    expect(code).toBe(0);
    expect(h.writer.calls).toBe(1);
    expect(h.io.outText.trimStart().startsWith("{")).toBe(true);
    expect(h.io.outText).toContain('"command": "build"');
    expect(h.io.errText).toBe("");
  });

  it("`export css` emite bytes a stdout y NO toca el writer (read-only)", async () => {
    const snapshot = await readSnapshot(bag);
    const h = makeBuildExportCli(snapshot);
    const code = await runCli({ argv: argv("export", "css"), cwd: "/host", io: h.io, deps: initDeps().deps, buildExportDeps: h.deps, version: VERSION });
    expect(code).toBe(0);
    expect(h.exportOut.artifact).not.toBeNull();
    expect(h.exportOut.errText).toBe("");
    expect(h.writer.calls).toBe(0); // export jamás publica
    expect(h.io.outText).toBe(""); // los bytes van por el puerto de export, no por io.out
  });

  it("`export json` y `export typescript` seleccionan el renderer correspondiente", async () => {
    for (const format of ["json", "typescript"] as const) {
      const snapshot = await readSnapshot(bag);
      const h = makeBuildExportCli(snapshot);
      const code = await runCli({ argv: argv("export", format), cwd: "/host", io: h.io, deps: initDeps().deps, buildExportDeps: h.deps, version: VERSION });
      expect(code).toBe(0);
      expect(h.exportOut.artifact).not.toBeNull();
      expect(h.writer.calls).toBe(0);
    }
  });
});
