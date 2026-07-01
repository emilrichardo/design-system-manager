// T045 (010) — `npm pack --dry-run --json`: incluye `dist/application/editor/**`,
// `dist/infrastructure/viewer/ui/main.js` (bundle único, Viewer+Editor) y el `dist/cli/**` actualizado;
// excluye `src/`, `tests/`, `specs/`, `.agents/`.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { ensureBuilt } from "../../helpers/run-binary.js";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

function packedFiles(): string[] {
  const out = execFileSync("npm", ["pack", "--dry-run", "--json"], { cwd: REPO_ROOT }).toString();
  return (JSON.parse(out)[0]?.files ?? []).map((f: { path: string }) => f.path);
}

beforeAll(() => {
  ensureBuilt();
}, 180000);

describe("npm pack — editor packaging (T045)", () => {
  it("incluye dist/application/editor/** completo", () => {
    const files = packedFiles();
    const applicationEditorFiles = files.filter((p) => p.startsWith("dist/application/editor/"));
    expect(applicationEditorFiles.length).toBeGreaterThan(0);
    for (const rel of [
      "dist/application/editor/session.js",
      "dist/application/editor/command-draft.js",
      "dist/application/editor/review.js",
      "dist/application/editor/apply-result.js",
      "dist/application/editor/apply-editor-command.js",
      "dist/application/editor/state-machine.js",
      "dist/application/editor/editor-session.js",
      "dist/application/editor/plan-editor-command.js",
      "dist/application/editor/value-controls.js",
      "dist/application/editor/json/dto.js",
      "dist/application/editor/json/map-editor.js",
    ]) {
      expect(files).toContain(rel);
    }
  }, 120000);

  it("incluye el bundle estático actualizado (Viewer+Editor en un solo main.js) y el adapter HTTP extendido", () => {
    const files = packedFiles();
    expect(files).toContain("dist/infrastructure/viewer/ui/main.js");
    expect(files).toContain("dist/infrastructure/viewer/http-server.js");
  }, 120000);

  it("incluye el CLI actualizado (composition/index/program) que conecta el modo Editor de view", () => {
    const files = packedFiles();
    expect(files).toContain("dist/cli/composition.js");
    expect(files).toContain("dist/cli/index.js");
    expect(files).toContain("dist/cli/program.js");
    expect(files).toContain("dist/cli/commands/view.js");
  }, 120000);

  it("excluye src/, tests/, specs/ y .agents/", () => {
    const files = packedFiles();
    for (const prefix of ["src/", "tests/", "specs/", ".agents/"]) {
      expect(files.some((p) => p.startsWith(prefix))).toBe(false);
    }
  }, 120000);
});
