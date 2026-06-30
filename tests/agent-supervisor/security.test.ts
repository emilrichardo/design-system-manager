// Seguridad: lista cerrada de gates, rechazo de config inválida/symlink, anti-traversal y anti-inyección.
import { symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { GATE_DEFS, GATE_ORDER } from "../../scripts/agent/lib/gates.mjs";
import { loadConfig } from "../../scripts/agent/lib/config.mjs";
import { resolveFeature, resolveInsideRepo } from "../../scripts/agent/lib/feature.mjs";
import { parseArgs } from "../../scripts/agent/lib/args.mjs";
import { makeTempRepo, type TempRepo } from "./fixtures.js";

let repos: TempRepo[] = [];
afterEach(() => repos.splice(0).forEach((r) => r.cleanup()));
function repo(opts = {}): TempRepo {
  const r = makeTempRepo(opts);
  repos.push(r);
  return r;
}

describe("gates allowlist (cerrada)", () => {
  it("solo contiene comandos conocidos y seguros (sin shell)", () => {
    expect(Object.keys(GATE_DEFS).sort()).toEqual(["build", "diffcheck", "lint", "test", "typecheck"]);
    for (const argv of Object.values(GATE_DEFS)) {
      expect(Array.isArray(argv)).toBe(true);
      expect(argv[0] === "npm" || argv[0] === "git").toBe(true);
      // Ningún argumento contiene metacaracteres de shell.
      for (const a of argv) expect(/[;&|`$()<>]/.test(a)).toBe(false);
    }
    expect(GATE_ORDER).toEqual(["typecheck", "lint", "test", "build", "diffcheck"]);
  });
});

describe("config segura", () => {
  it("rechaza claves desconocidas (no permite inyectar comandos)", () => {
    const r = repo({ config: { command: "rm -rf /" } as object });
    expect(() => loadConfig(r.dir)).toThrow(/no permitida/i);
  });

  it("rechaza gate desconocido", () => {
    const r = repo({ config: { gates: { evil: true } } as object });
    expect(() => loadConfig(r.dir)).toThrow(/Gate desconocido/i);
  });

  it("rechaza .agent-supervisor.json como symlink", () => {
    const r = repo();
    writeFileSync(join(r.dir, "real.json"), "{}\n");
    symlinkSync(join(r.dir, "real.json"), join(r.dir, ".agent-supervisor.json"));
    expect(() => loadConfig(r.dir)).toThrow(/symlink/i);
  });
});

describe("anti-traversal / anti-inyección", () => {
  it("resolveFeature rechaza traversal", () => {
    const r = repo();
    expect(() => resolveFeature("../../etc", r.dir)).toThrow();
  });

  it("resolveInsideRepo rechaza paths fuera del repo", () => {
    const r = repo();
    expect(() => resolveInsideRepo("../escape.md", r.dir)).toThrow(/fuera del repositorio/i);
  });

  it("parseArgs rechaza tokens tipo inyección de comando", () => {
    expect(() => parseArgs(["$(touch pwned)"])).toThrow(/no reconocido/i);
    expect(() => parseArgs(["&&", "rm"])).toThrow(/no reconocido/i);
  });
});
