import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/program.js";
import type { CliIO } from "../../src/cli/io.js";
import type { FileSystem, IdentityAnswers, InitializeDependencies, PromptOutcome } from "../../src/application/ports.js";
import {
  documentPreparer,
  documentValidators,
  hostRootResolver,
  stateClassifier,
  transactionalWriter,
} from "../../src/infrastructure/initialize-adapters.js";
import { commitTransaction } from "../../src/infrastructure/fs/transactional-writer.js";
import { nodeFileSystem } from "../../src/infrastructure/fs/node-file-system.js";
import { MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import { RecordingReporter, ScriptedPrompter, sampleAnswers } from "../helpers/in-memory-adapters.js";
import { samplePrepared } from "../helpers/real-init.js";
import { faultyFs } from "../helpers/faulty-fs.js";
import { createTmpProject, writeFileIn, type TmpProject } from "../helpers/tmp-project.js";
import { ensureBuilt, runBinary } from "../helpers/run-binary.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});
const nullIO: CliIO = { out: () => {}, err: () => {} };

async function host(pkg: Record<string, unknown> | false = { name: "host" }): Promise<string> {
  const p = await createTmpProject({ packageJson: pkg });
  projects.push(p);
  return p.dir;
}

function deps(opts: {
  identity?: PromptOutcome<IdentityAnswers>;
  confirm?: PromptOutcome<boolean>;
  writerFs?: FileSystem;
}): InitializeDependencies {
  const writer = opts.writerFs
    ? { commit: (root: string, prepared: readonly { relativePath: string; content: string }[]) => commitTransaction(opts.writerFs!, root, prepared) }
    : transactionalWriter;
  return {
    resolver: hostRootResolver,
    classifier: stateClassifier,
    preparer: documentPreparer,
    validators: documentValidators,
    writer,
    prompter: new ScriptedPrompter(opts.identity ?? { kind: "answered", value: sampleAnswers }, opts.confirm ?? { kind: "answered", value: true }),
    reporter: new RecordingReporter(),
  };
}

const run = (cwd: string, d: InitializeDependencies) =>
  runCli({ argv: ["node", "neuraz-ds", "init"], cwd, io: nullIO, deps: d, version: "9.9.9" });

describe("T061 — matriz de exit codes vía runCli (Nivel B)", () => {
  it("0 created", async () => {
    expect(await run(await host(), deps({}))).toBe(0);
  });
  it("1 cancelled", async () => {
    expect(await run(await host(), deps({ confirm: { kind: "answered", value: false } }))).toBe(1);
  });
  it("2 unchanged", async () => {
    const dir = await host();
    for (const f of samplePrepared()) await writeFileIn(dir, f.relativePath, f.content);
    expect(await run(dir, deps({}))).toBe(2);
  });
  it("3 failed/validation (slug inválido)", async () => {
    expect(await run(await host(), deps({ identity: { kind: "answered", value: { name: "Acme", slug: "Bad Slug", version: "0.1.0" } } }))).toBe(3);
  });
  it("4 conflict (destino preexistente)", async () => {
    const dir = await host();
    await writeFileIn(dir, MANAGED_FILES.config, "{}\n");
    expect(await run(dir, deps({}))).toBe(4);
  });
  it("5 failed/host (sin package.json)", async () => {
    expect(await run(await host(false), deps({}))).toBe(5);
  });
  it("6 failed/filesystem", async () => {
    expect(await run(await host(), deps({ writerFs: faultyFs(nodeFileSystem, { op: "rename", afterCalls: 1 }) }))).toBe(6);
  });
  it("7 failed/post-verify", async () => {
    const dir = await host();
    const isTokens = (path: string) => path.endsWith(MANAGED_FILES.tokens) && !path.includes(".neuraz-ds-staging-");
    let promoted = false;
    const fs: FileSystem = {
      ...nodeFileSystem,
      rename: async (from, to) => {
        const out = await nodeFileSystem.rename(from, to);
        if (isTokens(to)) promoted = true;
        return out;
      },
      readFile: async (path) => (promoted && isTokens(path) ? "{}\n" : nodeFileSystem.readFile(path)),
    };
    expect(await run(dir, deps({ writerFs: fs }))).toBe(7);
  });
  it("uso inválido (comando desconocido) → 3", async () => {
    expect(await runCli({ argv: ["node", "neuraz-ds", "frob"], cwd: await host(), io: nullIO, deps: deps({}), version: "9.9.9" })).toBe(3);
  });
});

describe("T061 — verificación por proceso hijo del binario compilado (Nivel C)", () => {
  beforeAll(() => {
    ensureBuilt();
  }, 120000);
  afterAll(async () => {
    while (projects.length) await projects.pop()!.cleanup();
  });

  it("--help → 0; --version → 0; comando desconocido → 3", async () => {
    const dir = await host();
    expect((await runBinary(["--help"], dir)).code).toBe(0);
    expect((await runBinary(["--version"], dir)).code).toBe(0);
    expect((await runBinary(["frob"], dir)).code).toBe(3);
  });

  it("init sin package.json → 5 (sin prompts)", async () => {
    expect((await runBinary(["init"], await host(false))).code).toBe(5);
  });

  it("init con complete-valid → 2 (sin prompts)", async () => {
    const dir = await host();
    for (const f of samplePrepared()) await writeFileIn(dir, f.relativePath, f.content);
    expect((await runBinary(["init"], dir)).code).toBe(2);
  });

  it("init con partial → 4 (sin prompts)", async () => {
    const dir = await host();
    await writeFileIn(dir, MANAGED_FILES.config, "{}\n");
    expect((await runBinary(["init"], dir)).code).toBe(4);
  });

  it("init con complete-invalid → 3 (sin prompts)", async () => {
    const dir = await host();
    for (const f of samplePrepared()) await writeFileIn(dir, f.relativePath, f.content);
    await writeFileIn(dir, MANAGED_FILES.tokens, "{ roto ");
    expect((await runBinary(["init"], dir)).code).toBe(3);
  });
});
