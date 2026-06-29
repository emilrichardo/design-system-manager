// T101 (005) — Aplicación real contra el filesystem: create + applied, segunda aplicación unchanged
// (bytes/mtime idénticos, sin temporales/backups), preservación de categorías host-only, write-error
// ante directorio de solo lectura (original intacto). El caso verification-error/backup-retenido se
// cubre con el seam de I (`preset-verification-error.test.ts`); aquí se verifica la limpieza de backup
// tras éxito.
import { chmod, readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyPreset } from "../../../src/application/presets/apply-preset.js";
import { makeProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import { TOKENS_REL, presetId, realApplyDeps } from "./preset-e2e-harness.js";

const TOKENS_DIR = "design-system/tokens";
const bag: TmpProject[] = [];
afterEach(async () => {
  for (const p of bag.splice(0)) {
    await chmod(join(p.dir, TOKENS_DIR), 0o755).catch(() => undefined);
    await p.cleanup();
  }
});

const apply = (dir: string) => applyPreset({ id: presetId("neutral-base"), executionDir: dir }, realApplyDeps());

describe("preset filesystem apply (T101)", () => {
  it("first apply creates tokens and groups, applied with wrote:true, preserving host-only content", async () => {
    const dir = await makeProject(bag, { tokens: { typography: { $type: "fontFamily", body: { $value: ["Inter"] } } } });
    const r = await apply(dir);
    expect(r.outcome).toBe("applied");
    expect(r.wrote).toBe(true);
    expect(r.targetFile).toBe(TOKENS_REL);

    const written = JSON.parse(await readFile(join(dir, TOKENS_REL), "utf8"));
    expect(written.color.gray["100"].$value.hex).toBe("#f5f5f5");
    expect(written.spacing["200"].$value).toEqual({ value: 8, unit: "px" });
    expect(written.typography.body.$value).toEqual(["Inter"]); // host-only preserved
    // No quedan temporales ni backups tras éxito.
    expect((await readdir(join(dir, TOKENS_DIR))).filter((n) => n !== "base.tokens.json")).toEqual([]);
  });

  it("second apply is unchanged: same bytes, same mtime, zero writes, no residue", async () => {
    const dir = await makeProject(bag);
    const first = await apply(dir);
    expect(first.outcome).toBe("applied");
    const bytes = await readFile(join(dir, TOKENS_REL));
    const mtime = (await stat(join(dir, TOKENS_REL))).mtimeMs;

    const second = await apply(dir);
    expect(second.outcome).toBe("unchanged");
    expect(second.wrote).toBe(false);
    expect(await readFile(join(dir, TOKENS_REL))).toEqual(bytes);
    expect((await stat(join(dir, TOKENS_REL))).mtimeMs).toBe(mtime);
    expect((await readdir(join(dir, TOKENS_DIR))).filter((n) => n !== "base.tokens.json")).toEqual([]);
  });

  it("write-error when the tokens directory is read-only; the original file stays intact", async () => {
    const dir = await makeProject(bag);
    const original = await readFile(join(dir, TOKENS_REL));
    await chmod(join(dir, TOKENS_DIR), 0o555);
    const r = await apply(dir);
    await chmod(join(dir, TOKENS_DIR), 0o755);
    expect(r.outcome).toBe("write-error");
    expect(r.wrote).toBe(false);
    expect(await readFile(join(dir, TOKENS_REL))).toEqual(original);
  });
});
