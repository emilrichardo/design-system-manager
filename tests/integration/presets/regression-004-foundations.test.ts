// T111 (005) — Regresión de 004-foundations: `foundations` (humano y `--json`) conserva su contrato y su
// semántica (categorías canónicas, niveles desde `$extensions`), y una aplicación de preset es observable
// a través de foundations sin cambiar el contrato. Se ejecuta el binario real antes de aplicar, después
// de aplicar `neutral-base` y tras la segunda aplicación (unchanged), comprobando idempotencia observable.
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { applyPreset } from "../../../src/application/presets/apply-preset.js";
import { ensureBuilt, runBinary } from "../../helpers/run-binary.js";
import { makeProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import { presetId, realApplyDeps } from "./preset-e2e-harness.js";

interface FoundationsJson {
  readonly formatVersion: string;
  readonly command: string;
  readonly outcome: string;
  readonly result: {
    readonly categories: ReadonlyArray<{ readonly id: string }>;
    readonly summary: { readonly tokens: { readonly primitive: number; readonly semantic: number } };
  };
}

const KNOWN_OUTCOMES = ["valid", "complete-invalid", "partial", "not-found", "read-error"];
const CANONICAL_CATEGORIES = ["color", "spacing", "typography", "radius", "border", "shadow", "opacity", "sizing", "motion"];

const bag: TmpProject[] = [];
beforeAll(() => {
  ensureBuilt();
}, 180000);
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

async function foundationsJson(dir: string): Promise<{ code: number; json: FoundationsJson; stdout: string; stderr: string }> {
  const r = await runBinary(["foundations", "--json"], dir);
  return { code: r.code, json: JSON.parse(r.stdout) as FoundationsJson, stdout: r.stdout, stderr: r.stderr };
}

describe("regression 004 — foundations contract and observability (T111)", () => {
  it("keeps the JSON contract (format version, command, canonical categories) before and after apply", async () => {
    const dir = await makeProject(bag);

    const before = await foundationsJson(dir);
    expect(before.json).toMatchObject({ formatVersion: "1.0.0", command: "foundations" });
    expect(KNOWN_OUTCOMES).toContain(before.json.outcome);
    expect(before.json.result.categories.map((c) => c.id)).toEqual(CANONICAL_CATEGORIES);
    expect(before.stderr).toBe("");

    const applied = await applyPreset({ id: presetId("neutral-base"), executionDir: dir }, realApplyDeps());
    expect(applied.outcome).toBe("applied");

    const after = await foundationsJson(dir);
    expect(after.json).toMatchObject({ formatVersion: "1.0.0", command: "foundations" });
    expect(KNOWN_OUTCOMES).toContain(after.json.outcome);
    // Mismas nueve categorías canónicas, mismo orden: el contrato 004 no cambia.
    expect(after.json.result.categories.map((c) => c.id)).toEqual(CANONICAL_CATEGORIES);
  });

  it("makes a successful apply observable: classified token counts increase", async () => {
    const dir = await makeProject(bag);
    const before = (await foundationsJson(dir)).json.result.summary.tokens;

    await applyPreset({ id: presetId("neutral-base"), executionDir: dir }, realApplyDeps());

    const after = (await foundationsJson(dir)).json.result.summary.tokens;
    // neutral-base aporta primitives (gray/spacing) y un semantic (surface) clasificados por `$extensions`.
    expect(after.primitive).toBeGreaterThan(before.primitive);
    expect(after.semantic).toBeGreaterThan(before.semantic);
  });

  it("is idempotent through foundations: second apply leaves foundations --json byte-identical", async () => {
    const dir = await makeProject(bag);
    await applyPreset({ id: presetId("neutral-base"), executionDir: dir }, realApplyDeps());
    const first = await foundationsJson(dir);

    const second = await applyPreset({ id: presetId("neutral-base"), executionDir: dir }, realApplyDeps());
    expect(second.outcome).toBe("unchanged");

    const afterSecond = await foundationsJson(dir);
    expect(afterSecond.stdout).toBe(first.stdout);
  });

  it("the human reporter still works without --json (deterministic)", async () => {
    const dir = await makeProject(bag);
    const r = await runBinary(["foundations"], dir);
    // El DS canónico de init es `partial` (tokens iniciales unclassified) → exit 4 (semántica 004 intacta).
    expect(r.code).toBe(4);
    // El reporter humano emite el informe (los outcomes no-success van por stderr, como en 004).
    expect((r.stdout + r.stderr)).toContain("Foundations");
    const again = await runBinary(["foundations"], dir);
    expect(again.stdout + again.stderr).toBe(r.stdout + r.stderr); // determinista
  });
});
