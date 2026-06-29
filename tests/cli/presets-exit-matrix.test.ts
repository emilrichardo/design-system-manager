// T092 (005) — Matriz outcome→exit por comando: success/applied 0, unchanged 2, invalid-preset 3,
// conflict 4, preset/design-system not-found 5, read-error/write-error 6, verification-error 7,
// internal-error 70. Discriminada por comando vía runCli con dependencias inyectadas.
import { describe, expect, it, vi } from "vitest";
import { runCli } from "../../src/cli/program.js";
import type { AnalyzeUseCase } from "../../src/application/analysis-ports.js";
import type { DesignSystemAnalysis } from "../../src/domain/analysis/design-system-analysis.js";
import {
  INVALID,
  VALID,
  cv,
  emptyHost,
  fakeCatalog,
  fakeTargetReader,
  fakeWriter,
  hostAnalysis,
  nullIO,
  readErrorHost,
  runtime,
} from "./presets-cli-fakes.js";

const run = (argv: string, parts = {}) => runCli(runtime(nullIO().io, argv, parts));

const conflicting = { color: { $type: "color", $extensions: { "ar.neuraz.design-system-manager": { foundation: { level: "primitive" } } }, gray: { "100": { $value: cv(0.5) } } } };
const statefulHost = (seq: readonly DesignSystemAnalysis[]): AnalyzeUseCase => {
  let i = 0;
  return vi.fn(async () => seq[Math.min(i++, seq.length - 1)] as DesignSystemAnalysis);
};

describe("presets exit matrix — list (T092)", () => {
  it("success → 0", async () => expect(await run("presets list")).toBe(0));
  it("invalid catalog → 3", async () => expect(await run("presets list", { catalog: fakeCatalog(null, { invalidLoad: true }) })).toBe(3));
});

describe("presets exit matrix — inspect (T092)", () => {
  it("success → 0", async () => expect(await run("presets inspect neutral-base")).toBe(0));
  it("unknown preset → not-found 5", async () => expect(await run("presets inspect ghost")).toBe(5));
  it("invalid preset → 3", async () => expect(await run("presets inspect x", { catalog: fakeCatalog(INVALID) })).toBe(3));
});

describe("presets exit matrix — plan (T092)", () => {
  it("success → 0", async () => expect(await run("presets plan neutral-base", { analyzeHost: async () => emptyHost("partial") })).toBe(0));
  it("unchanged → 2", async () => expect(await run("presets plan neutral-base", { catalog: fakeCatalog(VALID), analyzeHost: async () => hostAnalysis(VALID.tokens) })).toBe(2));
  it("conflict → 4", async () => expect(await run("presets plan neutral-base", { analyzeHost: async () => hostAnalysis(conflicting) })).toBe(4));
  it("invalid-preset → 3", async () => expect(await run("presets plan x", { catalog: fakeCatalog(INVALID), analyzeHost: async () => emptyHost("partial") })).toBe(3));
  it("read-error → 6", async () => expect(await run("presets plan neutral-base", { analyzeHost: async () => readErrorHost() })).toBe(6));
  it("preset not-found → 5", async () => expect(await run("presets plan ghost", { catalog: fakeCatalog(null), analyzeHost: async () => emptyHost("partial") })).toBe(5));
  it("design-system not-found → 5", async () => expect(await run("presets plan neutral-base", { analyzeHost: async () => emptyHost("not-initialized") })).toBe(5));
});

describe("presets exit matrix — apply (T092)", () => {
  it("applied → 0", async () =>
    expect(
      await run("presets apply neutral-base", {
        catalog: fakeCatalog(VALID),
        analyzeHost: statefulHost([hostAnalysis({}), hostAnalysis(VALID.tokens)]),
        targetReader: fakeTargetReader("{}\n"),
        writer: fakeWriter("written"),
      }),
    ).toBe(0));
  it("unchanged → 2", async () =>
    expect(await run("presets apply neutral-base", { catalog: fakeCatalog(VALID), analyzeHost: async () => hostAnalysis(VALID.tokens), targetReader: fakeTargetReader(JSON.stringify(VALID.tokens)) })).toBe(2));
  it("conflict → 4", async () =>
    expect(await run("presets apply neutral-base", { analyzeHost: async () => hostAnalysis(conflicting), targetReader: fakeTargetReader(JSON.stringify(conflicting)) })).toBe(4));
  it("invalid-preset → 3", async () => expect(await run("presets apply x", { catalog: fakeCatalog(INVALID) })).toBe(3));
  it("preset not-found → 5", async () => expect(await run("presets apply ghost", { catalog: fakeCatalog(null) })).toBe(5));
  it("design-system not-found → 5", async () => expect(await run("presets apply neutral-base", { analyzeHost: async () => emptyHost("not-initialized") })).toBe(5));
  it("read-error → 6", async () => expect(await run("presets apply neutral-base", { analyzeHost: async () => emptyHost("partial") })).toBe(6));
  it("write-error → 6", async () =>
    expect(await run("presets apply neutral-base", { analyzeHost: async () => hostAnalysis({}), targetReader: fakeTargetReader("{}\n"), writer: fakeWriter("write-error") })).toBe(6));
  it("verification-error → 7", async () =>
    expect(await run("presets apply neutral-base", { analyzeHost: async () => hostAnalysis({}), targetReader: fakeTargetReader("{}\n"), writer: fakeWriter("written") })).toBe(7));
  it("concurrent modification → conflict 4", async () =>
    expect(await run("presets apply neutral-base", { analyzeHost: async () => hostAnalysis({}), targetReader: fakeTargetReader("{}\n"), writer: fakeWriter("concurrent-modification") })).toBe(4));
});

describe("presets exit matrix — internal error (T092)", () => {
  it("internal error in JSON mode → 70", async () =>
    expect(
      await run("presets plan neutral-base --json", {
        analyzeHost: async () => {
          throw new Error("boom");
        },
      }),
    ).toBe(70));
});
