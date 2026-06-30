// buildStatus sobre repos temporales: working tree limpio, untracked permitido vs prohibido, JSON.
import { describe, expect, it, afterEach } from "vitest";
import { buildStatus } from "../../scripts/agent/lib/status.mjs";
import { statusPublic } from "../../scripts/agent/lib/output.mjs";
import { loadConfig } from "../../scripts/agent/lib/config.mjs";
import { makeTempRepo, type TempRepo } from "./fixtures.js";

let repos: TempRepo[] = [];
afterEach(() => repos.splice(0).forEach((r) => r.cleanup()));
function repo(opts = {}): TempRepo {
  const r = makeTempRepo(opts);
  repos.push(r);
  return r;
}
const st = (r: TempRepo) => buildStatus({ feature: r.feature, repoRoot: r.dir, config: loadConfig(r.dir) });

describe("buildStatus", () => {
  it("reporta totales, primera pendiente, checkpoint y rango inferidos", () => {
    const s = st(repo());
    expect(s.totalTasks).toBe(6);
    expect(s.completedTasks).toBe(2);
    expect(s.firstPendingTask).toBe("T003");
    expect(s.activeCheckpoint).toBe("B");
    expect(s.checkpointRange).toBe("T003–T005");
  });

  it("working tree limpio tras el commit inicial", () => {
    expect(st(repo()).workingTree).toBe("clean");
  });

  it("untracked permitido (.agents/skills/...) no ensucia el árbol", () => {
    const r = repo();
    r.write(".agents/skills/speckit-agent-context-update/x.txt", "x");
    expect(st(r).workingTree).toBe("clean");
  });

  it("untracked prohibido ensucia el árbol", () => {
    const r = repo();
    r.write("stray.txt", "x");
    expect(st(r).workingTree).toBe("dirty");
  });

  it("statusPublic expone solo el contrato estable", () => {
    const pub = statusPublic(st(repo()));
    expect(Object.keys(pub).sort()).toEqual(
      ["activeCheckpoint", "allowedUntracked", "checkpointRange", "completedTasks", "feature", "firstPendingTask", "head", "status", "totalTasks", "workingTree"].sort(),
    );
  });

  it("expone hasIssues ante marcado inconsistente", () => {
    const r = repo({ tasks: "## Checkpoint A — X\n- [ ] T001 a\n- [X] T002 b\n" });
    expect(st(r).hasIssues).toBe(true);
  });
});
