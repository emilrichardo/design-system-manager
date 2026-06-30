// Brief breve (referencia paths, no copia specs) y handoff (JSON + Markdown sin secretos).
import { describe, expect, it, afterEach } from "vitest";
import { buildStatus } from "../../scripts/agent/lib/status.mjs";
import { runVerify } from "../../scripts/agent/lib/verify.mjs";
import { loadConfig } from "../../scripts/agent/lib/config.mjs";
import { buildBrief } from "../../scripts/agent/lib/brief.mjs";
import { buildHandoff, handoffMarkdown } from "../../scripts/agent/lib/handoff.mjs";
import { makeTempRepo, type TempRepo } from "./fixtures.js";

let repos: TempRepo[] = [];
afterEach(() => repos.splice(0).forEach((r) => r.cleanup()));
function repo(opts = {}): TempRepo {
  const r = makeTempRepo(opts);
  repos.push(r);
  return r;
}
const passing = (keys: string[]) => keys.map((key) => ({ key, passed: true, tail: "" }));

describe("brief", () => {
  it("es breve y referencia fuentes por path (no las copia)", () => {
    const r = repo();
    const brief = buildBrief(buildStatus({ feature: r.feature, repoRoot: r.dir, config: loadConfig(r.dir) }));
    expect(brief.length).toBeLessThan(4000); // suficientemente corto para pegar
    expect(brief).toContain(`specs/${r.feature}/tasks.md`);
    expect(brief).toContain("AGENTS.md");
    expect(brief).toContain(".specify/memory/constitution.md");
    // Incluye las tareas exactas del rango activo.
    expect(brief).toContain("T003");
    expect(brief).toContain("T005");
    // Marca la siguiente tarea como fuera de alcance.
    expect(brief).toContain("NO implementar la siguiente tarea: T006");
  });
});

describe("handoff", () => {
  function handoffFor(r: TempRepo) {
    const result = runVerify({ feature: r.feature, repoRoot: r.dir, config: loadConfig(r.dir), gateRunner: passing });
    return buildHandoff(result, "2026-01-01T00:00:00.000Z");
  }

  it("JSON incluye los campos requeridos y generatedAt", () => {
    const h = handoffFor(repo());
    for (const key of [
      "feature", "checkpoint", "range", "head", "lastValidCommit", "completedTasks", "firstPendingTask",
      "modifiedFiles", "stagedFiles", "untrackedFiles", "testsExecuted", "testsPassed", "testsFailed",
      "failedCommands", "scopeDrift", "nextRecommendedCommand", "generatedAt",
    ]) {
      expect(h).toHaveProperty(key);
    }
    expect(h.generatedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(h.nextRecommendedCommand).toContain("agent:finalize");
  });

  it("Markdown es legible y no incluye contenido fuente completo ni env", () => {
    const md = handoffMarkdown(handoffFor(repo()));
    expect(md).toContain("# Handoff");
    expect(md).toContain("Siguiente comando recomendado");
    expect(md).not.toMatch(/PATH=|SECRET|process\.env/);
  });

  it("recomienda corregir cuando verify falla", () => {
    const r = repo({ tasks: "## Checkpoint A — X\n- [ ] T001 a\n- [X] T002 b\n" });
    const result = runVerify({ feature: r.feature, repoRoot: r.dir, config: loadConfig(r.dir), gateRunner: passing });
    const h = buildHandoff(result, "2026-01-01T00:00:00.000Z");
    expect(h.nextRecommendedCommand).toContain("agent:verify");
  });
});
