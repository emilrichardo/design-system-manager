// runFinalize: dry-run no muta; bloqueo por gate fallido; commit con staging quirúrgico marca solo el
// rango y nunca stagea .agents.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { runFinalize } from "../../scripts/agent/lib/finalize.mjs";
import { loadConfig } from "../../scripts/agent/lib/config.mjs";
import { makeTempRepo, type TempRepo } from "./fixtures.js";

let repos: TempRepo[] = [];
afterEach(() => repos.splice(0).forEach((r) => r.cleanup()));
function repo(opts = {}): TempRepo {
  const r = makeTempRepo(opts);
  repos.push(r);
  return r;
}
const passing = (keys: string[]) => keys.map((key) => ({ key, passed: true, tail: "" }));
const failing = (keys: string[]) => keys.map((key) => ({ key, passed: key !== "test", tail: "" }));
const cfg = (r: TempRepo) => loadConfig(r.dir);
const tasksOf = (r: TempRepo) => readFileSync(join(r.dir, `specs/${r.feature}/tasks.md`), "utf8");

describe("runFinalize", () => {
  it("dry-run por defecto: no marca, no stagea, no commitea", () => {
    const r = repo();
    const before = tasksOf(r);
    const head = r.git(["rev-parse", "HEAD"]);
    const result = runFinalize({ feature: r.feature, repoRoot: r.dir, config: cfg(r) });
    expect(result.mode).toBe("dry-run");
    expect(result.wouldMark).toEqual(["T003", "T004", "T005"]);
    expect(tasksOf(r)).toBe(before); // sin cambios
    expect(r.git(["rev-parse", "HEAD"])).toBe(head); // sin commit nuevo
    expect(r.git(["status", "--porcelain"])).toBe(""); // sin staging
  });

  it("--commit requiere --message", () => {
    const r = repo();
    expect(() => runFinalize({ feature: r.feature, repoRoot: r.dir, config: cfg(r), commit: true, gateRunner: passing })).toThrow(/--message/);
  });

  it("--commit no permite gates omitidos", () => {
    const r = repo();
    expect(() => runFinalize({ feature: r.feature, repoRoot: r.dir, config: cfg(r), commit: true, message: "x", quick: true, gateRunner: passing })).toThrow(/no permite gates omitidos/);
  });

  it("bloquea el commit si un gate falla; no marca ni commitea", () => {
    const r = repo();
    r.write("src/work.ts", "export const x = 1;\n");
    const before = tasksOf(r);
    const head = r.git(["rev-parse", "HEAD"]);
    const result = runFinalize({ feature: r.feature, repoRoot: r.dir, config: cfg(r), commit: true, message: "feat: x", gateRunner: failing });
    expect(result.committed).toBe(false);
    expect(result.blocked).toBe("pre-verify");
    expect(tasksOf(r)).toBe(before);
    expect(r.git(["rev-parse", "HEAD"])).toBe(head);
  });

  it("commit exitoso: marca SOLO el rango, staging quirúrgico, excluye .agents", () => {
    const r = repo();
    r.write("src/work.ts", "export const x = 1;\n");
    r.write(".agents/skills/speckit-agent-context-update/note.txt", "x");
    const result = runFinalize({ feature: r.feature, repoRoot: r.dir, config: cfg(r), commit: true, message: "feat: checkpoint B", gateRunner: passing });
    expect(result.committed).toBe(true);
    expect(result.markedTasks).toBe(3); // T003–T005
    // Rango marcado, T006 (checkpoint C) intacto.
    const tasks = tasksOf(r);
    expect(tasks).toContain("- [X] T003");
    expect(tasks).toContain("- [X] T005");
    expect(tasks).toContain("- [ ] T006");
    // El commit incluye src/work.ts y tasks.md, NO .agents.
    const committed = r.git(["show", "--name-only", "--pretty=format:", "HEAD"]).split("\n").filter(Boolean);
    expect(committed).toContain("src/work.ts");
    expect(committed.some((f) => f.includes(`specs/${r.feature}/tasks.md`))).toBe(true);
    expect(committed.some((f) => f.startsWith(".agents/"))).toBe(false);
    // .agents sigue untracked.
    expect(r.git(["status", "--porcelain"])).toContain("?? .agents/");
  });

  it("informa primera pendiente y siguiente checkpoint tras cerrar", () => {
    const r = repo();
    r.write("src/work.ts", "x\n");
    const result = runFinalize({ feature: r.feature, repoRoot: r.dir, config: cfg(r), commit: true, message: "feat: B", gateRunner: passing });
    expect(result.firstPendingTask).toBe("T006");
    expect(result.nextCheckpoint).toBe("C");
  });
});
