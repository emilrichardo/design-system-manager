// Manejo de features completamente cerradas: status (humano/JSON), brief rechazado, finalize rechazado
// (dry-run y --commit) sin mutar nada, y handoff con status completed.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { buildStatus } from "../../scripts/agent/lib/status.mjs";
import { statusPublic } from "../../scripts/agent/lib/output.mjs";
import { runVerify } from "../../scripts/agent/lib/verify.mjs";
import { runFinalize } from "../../scripts/agent/lib/finalize.mjs";
import { buildHandoff } from "../../scripts/agent/lib/handoff.mjs";
import { loadConfig } from "../../scripts/agent/lib/config.mjs";
import { makeTempRepo, type TempRepo } from "./fixtures.js";

const DONE = `## Checkpoint A — X
- [X] T001 a
- [X] T002 b
## Checkpoint B — Y
- [X] T003 c
`;

const scriptOf = (name: string) => fileURLToPath(new URL(`../../scripts/agent/${name}`, import.meta.url));

let repos: TempRepo[] = [];
afterEach(() => repos.splice(0).forEach((r) => r.cleanup()));
function repo(): TempRepo {
  const r = makeTempRepo({ tasks: DONE });
  repos.push(r);
  return r;
}

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}
function runScript(name: string, args: string[], root: string): Run {
  try {
    const stdout = execFileSync(process.execPath, [scriptOf(name), ...args], {
      env: { ...process.env, AGENT_SUPERVISOR_ROOT: root },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout, stderr: "" };
  } catch (e) {
    return { code: typeof e.status === "number" ? e.status : 1, stdout: String(e.stdout ?? ""), stderr: String(e.stderr ?? "") };
  }
}

const cfg = (r: TempRepo) => loadConfig(r.dir);
const statusOf = (r: TempRepo) => buildStatus({ feature: r.feature, repoRoot: r.dir, config: cfg(r) });
const tasksText = (r: TempRepo) => readFileSync(join(r.dir, `specs/${r.feature}/tasks.md`), "utf8");

describe("completed feature — status", () => {
  it("buildStatus marca completed con checkpoint/range nulos", () => {
    const s = statusOf(repo());
    expect(s.status).toBe("completed");
    expect(s.completed).toBe(true);
    expect(s.firstPendingTask).toBeNull();
    expect(s.activeCheckpoint).toBeNull();
    expect(s.checkpointRange).toBeNull();
  });

  it("status JSON refleja completed + HEAD actual", () => {
    const r = repo();
    const head = r.git(["rev-parse", "--short", "HEAD"]);
    const out = runScript("status.mjs", ["--feature", r.feature, "--json"], r.dir);
    expect(out.code).toBe(0);
    const json = JSON.parse(out.stdout);
    expect(json).toMatchObject({ status: "completed", firstPendingTask: null, activeCheckpoint: null, checkpointRange: null });
    expect(json.head).toBe(head);
  });

  it("status humano muestra Status/Checkpoint/Range = completed/none", () => {
    const r = repo();
    const out = runScript("status.mjs", ["--feature", r.feature], r.dir);
    expect(out.code).toBe(0);
    expect(out.stdout).toContain("Status: completed");
    expect(out.stdout).toContain("First pending: none");
    expect(out.stdout).toContain("Checkpoint: none");
    expect(out.stdout).toContain("Range: none");
  });
});

describe("completed feature — brief rechazado", () => {
  it("brief sin checkpoint termina con error accionable", () => {
    const r = repo();
    const out = runScript("brief.mjs", ["--feature", r.feature], r.dir);
    expect(out.code).toBe(1);
    expect(out.stderr).toContain(`Feature ${r.feature} is already complete; no implementation brief can be generated.`);
  });

  it("brief con --checkpoint también se rechaza (sin flag de inspección histórica)", () => {
    const r = repo();
    const out = runScript("brief.mjs", ["--feature", r.feature, "--checkpoint", "B"], r.dir);
    expect(out.code).toBe(1);
    expect(out.stderr).toContain("is already complete");
  });
});

describe("completed feature — finalize rechazado sin mutar", () => {
  it("dry-run lanza y no modifica tasks.md ni HEAD", () => {
    const r = repo();
    const before = tasksText(r);
    const head = r.git(["rev-parse", "HEAD"]);
    expect(() => runFinalize({ feature: r.feature, repoRoot: r.dir, config: cfg(r) })).toThrow(/already complete/i);
    expect(tasksText(r)).toBe(before);
    expect(r.git(["rev-parse", "HEAD"])).toBe(head);
    expect(r.git(["status", "--porcelain"])).toBe("");
  });

  it("--commit lanza antes de cualquier gate/commit y no muta", () => {
    const r = repo();
    const before = tasksText(r);
    const head = r.git(["rev-parse", "HEAD"]);
    expect(() =>
      runFinalize({ feature: r.feature, repoRoot: r.dir, config: cfg(r), commit: true, message: "x", gateRunner: () => [] }),
    ).toThrow(/already complete/i);
    expect(tasksText(r)).toBe(before);
    expect(r.git(["rev-parse", "HEAD"])).toBe(head);
    expect(r.git(["status", "--porcelain"])).toBe("");
  });
});

describe("completed feature — handoff", () => {
  it("se genera con status completed, firstPendingTask null y nextRecommendedCommand null", () => {
    const r = repo();
    const result = runVerify({ feature: r.feature, repoRoot: r.dir, config: cfg(r), gateRunner: (keys) => keys.map((key) => ({ key, passed: true, tail: "" })) });
    const h = buildHandoff(result, "2026-01-01T00:00:00.000Z");
    expect(h.status).toBe("completed");
    expect(h.firstPendingTask).toBeNull();
    expect(h.nextRecommendedCommand).toBeNull();
  });
});
