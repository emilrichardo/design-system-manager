// runVerify: estado de tareas, git (staged prohibido, .agents staged), gates (inyectados), scope drift.
import { describe, expect, it, afterEach } from "vitest";
import { runVerify } from "../../scripts/agent/lib/verify.mjs";
import { loadConfig } from "../../scripts/agent/lib/config.mjs";
import { makeTempRepo, type TempRepo } from "./fixtures.js";

let repos: TempRepo[] = [];
afterEach(() => repos.splice(0).forEach((r) => r.cleanup()));
function repo(opts = {}): TempRepo {
  const r = makeTempRepo(opts);
  repos.push(r);
  return r;
}

// gateRunner que no ejecuta npm: todos pasan salvo los marcados como fallidos.
const passingGates = (keys: string[]) => keys.map((key) => ({ key, passed: true, tail: "" }));
const failingGate = (failKey: string) => (keys: string[]) => keys.map((key) => ({ key, passed: key !== failKey, tail: "" }));

function verify(r: TempRepo, extra: Record<string, unknown> = {}) {
  return runVerify({ feature: r.feature, repoRoot: r.dir, config: loadConfig(r.dir), gateRunner: passingGates, ...extra });
}

describe("runVerify", () => {
  it("PASS en árbol limpio con gates en verde", () => {
    const v = verify(repo());
    expect(v.passed).toBe(true);
    expect(v.failures).toEqual([]);
  });

  it("FAIL si .agents está staged", () => {
    const r = repo();
    r.write(".agents/skills/speckit-agent-context-update/x", "x");
    r.git(["add", "-f", "--", ".agents/skills/speckit-agent-context-update/x"]);
    const v = verify(r);
    expect(v.passed).toBe(false);
    expect(v.failures.some((f) => f.includes(".agents/"))).toBe(true);
  });

  it("sin scope configurado, untracked productivo no bloquea (no hay política rígida)", () => {
    const r = repo();
    r.write("src/new-work.ts", "x");
    expect(verify(r).passed).toBe(true);
  });

  it("con scope configurado, archivo fuera de alcance bloquea", () => {
    const r = repo();
    r.write("out/stray.ts", "x");
    r.git(["add", "--", "out/stray.ts"]); // staged → path preciso en porcelain
    expect(verify(r, { explicitPaths: ["src/**"] }).failures.some((f) => f.includes("out/stray.ts"))).toBe(true);
  });

  it("FAIL ante marcado inconsistente", () => {
    const r = repo({ tasks: "## Checkpoint A — X\n- [ ] T001 a\n- [X] T002 b\n" });
    const v = verify(r);
    expect(v.passed).toBe(false);
    expect(v.failures.some((f) => f.includes("T002") && f.includes("T001"))).toBe(true);
  });

  it("FAIL cuando un gate falla (inyectado, sin ejecutar npm)", () => {
    const v = runVerify({ feature: repo().feature, repoRoot: repos[0].dir, config: loadConfig(repos[0].dir), gateRunner: failingGate("lint") });
    expect(v.passed).toBe(false);
    expect(v.failures.some((f) => f.includes("lint"))).toBe(true);
  });

  it("reporta gates omitidos con --quick sin marcarlos como ejecutados", () => {
    const v = verify(repo(), { quick: true });
    expect(v.gatesSkipped.map((g) => g.key).sort()).toEqual(["build", "test"]);
    expect(v.gatesRun).not.toContain("test");
  });

  it("FAIL ante deriva de alcance cuando hay paths configurados", () => {
    const r = repo();
    r.write("out-of-scope.ts", "x");
    r.git(["add", "--", "out-of-scope.ts"]);
    const v = verify(r, { explicitPaths: ["src/**"] });
    expect(v.failures.some((f) => f.includes("out-of-scope.ts"))).toBe(true);
  });
});
