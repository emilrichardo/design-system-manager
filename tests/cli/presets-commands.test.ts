// T090 (005) — Comandos `presets` via runCli con IO falso: registro, help, errores de uso, flag local
// `--json`, `--json` global rechazado, `plan` read-only y `apply` explícito. Sin TTY ni stdin (runCli
// es una función pura: no lee stdin ni depende de TTY).
import { describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/program.js";
import {
  emptyHost,
  fakeTargetReader,
  fakeWriter,
  hostAnalysis,
  nullIO,
  runtime,
} from "./presets-cli-fakes.js";

describe("presets CLI commands (T090)", () => {
  it("registers the four subcommands and runs list", async () => {
    const io = nullIO();
    const code = await runCli(runtime(io.io, "presets list"));
    expect(code).toBe(0);
    expect(io.out.join("")).toContain("neutral-base");
    expect(io.err.join("")).toBe("");
  });

  it("shows help for the group and each subcommand with exit 0", async () => {
    for (const argv of ["presets --help", "presets list --help", "presets inspect --help", "presets plan --help", "presets apply --help"]) {
      const io = nullIO();
      expect(await runCli(runtime(io.io, argv))).toBe(0);
    }
  });

  it("rejects a missing id with a usage error (exit 3)", async () => {
    const io = nullIO();
    expect(await runCli(runtime(io.io, "presets inspect"))).toBe(3);
  });

  it("rejects an unknown option with a usage error (exit 3)", async () => {
    const io = nullIO();
    expect(await runCli(runtime(io.io, "presets list --bogus"))).toBe(3);
  });

  it("rejects extra arguments with a usage error (exit 3)", async () => {
    const io = nullIO();
    expect(await runCli(runtime(io.io, "presets list extra"))).toBe(3);
  });

  it("rejects a global --json before the group (exit 3)", async () => {
    const io = nullIO();
    expect(await runCli(runtime(io.io, "--json presets list"))).toBe(3);
  });

  it("accepts a local --json on each subcommand", async () => {
    const io = nullIO();
    expect(await runCli(runtime(io.io, "presets list --json"))).toBe(0);
    expect(io.out.join("")).toContain('"command": "preset-list"');
  });

  it("plan is read-only: it never invokes the writer", async () => {
    const io = nullIO();
    const writer = fakeWriter("written");
    await runCli(runtime(io.io, "presets plan neutral-base", { analyzeHost: async () => emptyHost("partial"), writer }));
    expect(writer.write).not.toHaveBeenCalled();
  });

  it("apply is explicit: it invokes the atomic writer", async () => {
    const io = nullIO();
    const writer = fakeWriter("written");
    await runCli(
      runtime(io.io, "presets apply neutral-base", {
        analyzeHost: async () => hostAnalysis({}),
        targetReader: fakeTargetReader("{}\n"),
        writer,
      }),
    );
    expect(writer.write).toHaveBeenCalledTimes(1);
  });

  it("inspecting an unknown preset is not-found, not a crash", async () => {
    const io = nullIO();
    expect(await runCli(runtime(io.io, "presets inspect ghost"))).toBe(5);
    expect(io.err.join("")).toBe("");
  });
});
