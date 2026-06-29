// T109 (005) — Regresión de 002-ds-validate-inspect: presets reutiliza el análisis DTCG sin cambiar su
// semántica. `validate` e `inspect` conservan outcomes, aliases, tipos y conteos sobre el DS canónico
// de init; y tras aplicar un preset (add-only) el análisis sigue siendo válido y observa los tokens
// añadidos sin alterar el contrato.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runValidate } from "../../../src/cli/commands/validate.js";
import { runInspect } from "../../../src/cli/commands/inspect.js";
import { applyPreset } from "../../../src/application/presets/apply-preset.js";
import { createBoundAnalyze, createInspectDependencies, createValidateDependencies } from "../../../src/cli/composition.js";
import { exitCodeForOutcome } from "../../../src/cli/exit-codes.js";
import { makeProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import { TOKENS_REL, presetId, realApplyDeps } from "./preset-e2e-harness.js";

const sink = { out: () => {}, err: () => {} };
const bag: TmpProject[] = [];
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

describe("regression 002 — validate/inspect unchanged after presets (T109)", () => {
  it("validate stays valid/0 and inspect reports the canonical init analysis", async () => {
    const dir = await makeProject(bag); // DS canónico de init
    const analyze = createBoundAnalyze();

    const v = await runValidate(dir, createValidateDependencies(sink, analyze));
    expect(v.outcome).toBe("valid");
    expect(exitCodeForOutcome(v.outcome)).toBe(0);

    const i = await runInspect(dir, createInspectDependencies(sink, analyze));
    expect(i.outcome).toBe("valid");
    if (i.outcome === "valid") {
      expect(i.inspection.tokens?.total).toBe(2); // base + alias
      expect(i.inspection.tokens?.aliases).toBe(1);
      expect(i.inspection.tokens?.byType).toEqual({ color: 2 });
      expect(i.inspection.validation.errors).toEqual([]);
    }
  });

  it("after an add-only preset apply, the analysis remains valid and observes new tokens", async () => {
    const dir = await makeProject(bag);
    const analyze = createBoundAnalyze();

    const before = await runInspect(dir, createInspectDependencies(sink, analyze));
    const beforeTotal = before.outcome === "valid" ? (before.inspection.tokens?.total ?? 0) : 0;

    const applied = await applyPreset({ id: presetId("neutral-base"), executionDir: dir }, realApplyDeps());
    expect(applied.outcome).toBe("applied");

    const v = await runValidate(dir, createValidateDependencies(sink, analyze));
    expect(v.outcome).toBe("valid");
    expect(exitCodeForOutcome(v.outcome)).toBe(0);

    const after = await runInspect(dir, createInspectDependencies(sink, analyze));
    expect(after.outcome).toBe("valid");
    if (after.outcome === "valid") {
      // El preset agrega tokens (gray/surface/spacing); el conteo crece y el contrato no cambia.
      expect(after.inspection.tokens?.total ?? 0).toBeGreaterThan(beforeTotal);
      expect(after.inspection.validation.errors).toEqual([]);
      // El alias original de init sigue presente y resuelto.
      expect(after.inspection.tokens?.aliases ?? 0).toBeGreaterThanOrEqual(1);
    }

    // El target sigue siendo el documento de tokens administrado.
    const tokens = JSON.parse(await readFile(join(dir, TOKENS_REL), "utf8")) as { color: Record<string, unknown> };
    expect(tokens.color.base).toBeDefined(); // contenido de init preservado
    expect(tokens.color.gray).toBeDefined(); // contenido del preset añadido
  });
});
