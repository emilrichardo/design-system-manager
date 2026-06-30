// T147 (006) — Matriz de errores de `build` en proceso (runCli + fakes): invalid-design-system/3,
// unsupported CSS/4, conflict/4, read-error/6, write-error/6, verification-error/7. En JSON se verifica
// el estado de recuperación (wrote/outputAvailable/backupRelativePath/recoveryRequired).
import { afterEach, describe, expect, it } from "vitest";
import { runCli } from "../../src/cli/program.js";
import { makeBuildExportCli } from "./build-export-cli-fakes.js";
import { countingRenderer, fakeSnapshotReader, readSnapshot } from "../application/build-export/build-export-fakes.js";
import { buildDeps as initDeps } from "../helpers/in-memory-adapters.js";
import type { ArtifactSetWriteResult } from "../../src/application/build-export/build-ports.js";
import type { TmpProject } from "../helpers/tmp-project.js";

const VERSION = "9.9.9";
const argv = (...args: string[]) => ["node", "neuraz-ds", ...args];
const bag: TmpProject[] = [];
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

async function runJson(harness: ReturnType<typeof makeBuildExportCli>): Promise<{ code: number; envelope: Record<string, unknown> }> {
  const code = await runCli({ argv: argv("build", "--json"), cwd: "/host", io: harness.io, deps: initDeps().deps, buildExportDeps: harness.deps, version: VERSION });
  return { code, envelope: JSON.parse(harness.io.outText) as Record<string, unknown> };
}

const VERIFICATION_ERROR: ArtifactSetWriteResult = {
  outcome: "verification-error",
  wrote: true,
  outputAvailable: true,
  backupRelativePath: "design-system/build.backup",
  recoveryRequired: true,
  verification: { status: "failed", checks: [], artifacts: [] },
  conflicts: [],
  error: { code: "post-publication-verification-failed", message: "post verification failed" },
};

const WRITE_ERROR: ArtifactSetWriteResult = {
  outcome: "write-error",
  wrote: false,
  outputAvailable: true,
  backupRelativePath: null,
  recoveryRequired: false,
  verification: null,
  conflicts: [],
  error: { code: "staging-write-failed", message: "write failed" },
};

const CONFLICT: ArtifactSetWriteResult = {
  outcome: "conflict",
  wrote: false,
  outputAvailable: true,
  backupRelativePath: null,
  recoveryRequired: false,
  verification: null,
  conflicts: [{ code: "required-path-owned-by-unknown", path: "tokens.css", format: null, severity: "error", message: "owned by unknown", blocksWrite: true }],
  error: null,
};

describe("build error matrix (T147)", () => {
  it("invalid-design-system → exit 3", async () => {
    const snapshot = await readSnapshot(bag);
    const h = makeBuildExportCli(snapshot, {
      buildOverrides: { createProjection: () => ({ ok: false, error: { code: "ds-invalid", message: "invalid", path: null } }) },
    });
    const { code, envelope } = await runJson(h);
    expect(code).toBe(3);
    expect(envelope.outcome).toBe("invalid-design-system");
    expect(h.writer.calls).toBe(0); // no se renderiza ni publica
  });

  it("unsupported CSS → exit 4", async () => {
    const snapshot = await readSnapshot(bag);
    const h = makeBuildExportCli(snapshot, {
      buildOverrides: {
        renderers: [
          countingRenderer("css", () => ({ outcome: "unsupported-value", errors: [{ format: "css", code: "css-type-unsupported", tokenPath: "x", type: "strokeStyle", message: "unsupported" }] })),
        ],
      },
    });
    const { code, envelope } = await runJson(h);
    expect(code).toBe(4);
    expect(envelope.outcome).toBe("unsupported-value");
    expect(h.writer.calls).toBe(0);
  });

  it("conflict (ownership/writer) → exit 4", async () => {
    const snapshot = await readSnapshot(bag);
    const h = makeBuildExportCli(snapshot, { writeResult: CONFLICT });
    const { code, envelope } = await runJson(h);
    expect(code).toBe(4);
    expect(envelope.outcome).toBe("conflict");
  });

  it("read-error → exit 6", async () => {
    const snapshot = await readSnapshot(bag);
    const h = makeBuildExportCli(snapshot, {
      buildOverrides: { snapshotReader: fakeSnapshotReader({ outcome: "read-error", snapshot: null, reason: "io" }) },
    });
    const { code, envelope } = await runJson(h);
    expect(code).toBe(6);
    expect(envelope.outcome).toBe("read-error");
  });

  it("write-error → exit 6, wrote false, sin recovery", async () => {
    const snapshot = await readSnapshot(bag);
    const h = makeBuildExportCli(snapshot, { writeResult: WRITE_ERROR });
    const { code, envelope } = await runJson(h);
    expect(code).toBe(6);
    expect(envelope.outcome).toBe("write-error");
    expect(envelope.wrote).toBe(false);
    expect(envelope.recoveryRequired).toBe(false);
    expect(envelope.backupRelativePath).toBeNull();
  });

  it("verification-error → exit 7, wrote true, backup retenido y recovery requerido (JSON)", async () => {
    const snapshot = await readSnapshot(bag);
    const h = makeBuildExportCli(snapshot, { writeResult: VERIFICATION_ERROR });
    const { code, envelope } = await runJson(h);
    expect(code).toBe(7);
    expect(envelope.outcome).toBe("verification-error");
    expect(envelope.wrote).toBe(true);
    expect(envelope.outputAvailable).toBe(true);
    expect(envelope.backupRelativePath).toBe("design-system/build.backup");
    expect(envelope.recoveryRequired).toBe(true);
  });
});
