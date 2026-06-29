// T091 (005) — Streams JSON de presets: un único documento en stdout y stderr vacío para outcomes
// esperados; error interno → stdout vacío, stderr un JSON seguro propio de presets, exit 70.
import { describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/program.js";
import { emptyHost, hostAnalysis, nullIO, runtime } from "./presets-cli-fakes.js";

function parseSingle(chunks: readonly string[]): { json: unknown; writes: number } {
  return { json: JSON.parse(chunks.join("")), writes: chunks.length };
}

describe("presets CLI JSON streams (T091)", () => {
  it("list --json writes one JSON to stdout and empty stderr", async () => {
    const io = nullIO();
    const code = await runCli(runtime(io.io, "presets list --json"));
    expect(code).toBe(0);
    const { json, writes } = parseSingle(io.out);
    expect(writes).toBe(1);
    expect(io.err.join("")).toBe("");
    expect(json).toMatchObject({ formatVersion: "1.0.0", command: "preset-list", outcome: "success" });
  });

  it("inspect --json emits the preset-inspect envelope", async () => {
    const io = nullIO();
    await runCli(runtime(io.io, "presets inspect neutral-base --json"));
    expect(JSON.parse(io.out.join(""))).toMatchObject({ command: "preset-inspect", outcome: "success" });
    expect(io.err.join("")).toBe("");
  });

  it("plan --json emits the preset-plan envelope (expected outcome on stdout, stderr empty)", async () => {
    const io = nullIO();
    const code = await runCli(runtime(io.io, "presets plan neutral-base --json", { analyzeHost: async () => emptyHost("partial") }));
    expect(code).toBe(0);
    expect(JSON.parse(io.out.join(""))).toMatchObject({ command: "preset-plan", outcome: "success" });
    expect(io.err.join("")).toBe("");
  });

  it("plan --json against an empty host returns not-found:design-system on stdout", async () => {
    const io = nullIO();
    const code = await runCli(runtime(io.io, "presets plan neutral-base --json", { analyzeHost: async () => emptyHost("not-initialized") }));
    expect(code).toBe(5);
    expect(JSON.parse(io.out.join(""))).toMatchObject({ command: "preset-plan", outcome: "not-found" });
    expect(io.err.join("")).toBe("");
  });

  it("an internal error in JSON mode writes one safe JSON to stderr, empty stdout, exit 70", async () => {
    const io = nullIO();
    const code = await runCli(
      runtime(io.io, "presets plan neutral-base --json", {
        analyzeHost: async () => {
          throw new Error("boom: /Users/secret/path");
        },
      }),
    );
    expect(code).toBe(70);
    expect(io.out.join("")).toBe("");
    const err = JSON.parse(io.err.join(""));
    expect(err).toMatchObject({ formatVersion: "1.0.0", command: "preset-plan", outcome: "internal-error" });
    expect(io.err.join("")).not.toContain("/Users/secret");
    expect(io.err.join("")).not.toContain("boom");
  });

  it("apply --json emits a single preset-apply envelope", async () => {
    const io = nullIO();
    await runCli(runtime(io.io, "presets apply neutral-base --json", { analyzeHost: async () => hostAnalysis({}) }));
    expect(JSON.parse(io.out.join(""))).toMatchObject({ command: "preset-apply" });
    expect(io.err.join("")).toBe("");
  });
});
