// T038 (010) — Fault injection sobre el adapter HTTP del Editor: concurrent-source-change,
// write-error y verification-error con recovery. Reusa el seam `WriterFileSystem` de 008
// (`failingFs`/`createTokenSourceWriter`) — nunca inventa su propio mecanismo de fallas.
import { readFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { PlanTokenMutationDependencies } from "../../../src/application/token-mutations/plan-token-mutation.js";
import type { startViewerHttpServer as StartViewerHttpServerType, ViewerHttpServerHandle } from "../../../src/infrastructure/viewer/http-server.js";
import { TOKENS_REL, newCallCounts, realViewerDeps } from "../../application/viewer/real-deps.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";
import { ensureBuilt } from "../../helpers/run-binary.js";
import { failingFs } from "../../helpers/writer-fakes.js";

ensureBuilt();
const { startViewerHttpServer } = (await import("../../../dist/infrastructure/viewer/http-server.js")) as {
  startViewerHttpServer: typeof StartViewerHttpServerType;
};
const { createTokenSourceSnapshotReader } = (await import("../../../dist/infrastructure/token-mutations/source-snapshot-reader.js")) as {
  createTokenSourceSnapshotReader: () => PlanTokenMutationDependencies["snapshot"];
};
const { serializeCandidate } = (await import("../../../dist/infrastructure/token-mutations/candidate-serializer.js")) as {
  serializeCandidate: PlanTokenMutationDependencies["serialize"];
};
const { createTokenSourceWriter } = (await import("../../../dist/infrastructure/token-mutations/token-source-writer.js")) as {
  createTokenSourceWriter: (rootDir: string, fs?: ReturnType<typeof failingFs>) => unknown;
};

const hosts: HostProject[] = [];
const handles: ViewerHttpServerHandle[] = [];
afterEach(async () => {
  await Promise.all(handles.splice(0).map((h) => h.close()));
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});

function targetAbs(host: HostProject): string {
  return join(realpathSync(host.dir), TOKENS_REL);
}

async function server(host: HostProject, fs: ReturnType<typeof failingFs>): Promise<{ readonly base: string }> {
  const viewerDeps = realViewerDeps(host.dir, newCallCounts());
  const handle = await startViewerHttpServer({
    deps: viewerDeps,
    editorPlanDeps: { snapshot: createTokenSourceSnapshotReader(), serialize: serializeCandidate },
    editorApplyDeps: {
      apply: { snapshot: createTokenSourceSnapshotReader(), serialize: serializeCandidate, createWriter: (rootDir: string) => createTokenSourceWriter(rootDir, fs) as never },
      viewer: viewerDeps,
    },
    executionDir: host.dir,
    host: "127.0.0.1",
  });
  handles.push(handle);
  return { base: `http://127.0.0.1:${handle.port}` };
}

async function apply(base: string, description: string) {
  const res = await fetch(`${base}/api/editor/apply`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ formatVersion: "1.0.0", operations: [{ kind: "update-description", path: "color.base.blue-500", description }] }),
  });
  return (await res.json()) as {
    readonly data: {
      readonly apply: {
        readonly state: string;
        readonly wrote: boolean;
        readonly recovery: { readonly sourceAvailable: boolean; readonly backupRelativePath: string | null; readonly recoveryRequired: boolean } | null;
      };
    };
  };
}

describe("editor apply concurrency and recovery (T038)", () => {
  it("cambio concurrente: estado source-changed-concurrently, sin escritura", async () => {
    const host = await makeHostProject();
    hosts.push(host);
    const before = await readFile(`${host.dir}/${TOKENS_REL}`, "utf8");
    const abs = targetAbs(host);
    const fs = failingFs(undefined, { readFile: (p) => (p === abs ? new TextEncoder().encode('{"changed":true}') : undefined) });
    const { base } = await server(host, fs);

    const body = await apply(base, "concurrent");

    expect(body.data.apply.state).toBe("source-changed-concurrently");
    expect(body.data.apply.wrote).toBe(false);
    expect(await readFile(`${host.dir}/${TOKENS_REL}`, "utf8")).toBe(before);
  });

  it("fallo antes del commit point: estado write-error, fuente disponible, sin backup", async () => {
    const host = await makeHostProject();
    hosts.push(host);
    const before = await readFile(`${host.dir}/${TOKENS_REL}`, "utf8");
    const fs = failingFs(undefined, { writeFile: () => new Error("EACCES") });
    const { base } = await server(host, fs);

    const body = await apply(base, "write fails");

    expect(body.data.apply.state).toBe("write-error");
    expect(body.data.apply.wrote).toBe(false);
    expect(body.data.apply.recovery).toMatchObject({ sourceAvailable: true, backupRelativePath: null, recoveryRequired: false });
    expect(await readFile(`${host.dir}/${TOKENS_REL}`, "utf8")).toBe(before);
  });

  it("verificación posterior falla, restore exitoso: recovery-required tiene precedencia sobre verification-error, backup relativo", async () => {
    const host = await makeHostProject();
    hosts.push(host);
    const before = await readFile(`${host.dir}/${TOKENS_REL}`, "utf8");
    const abs = targetAbs(host);
    let readsOfTarget = 0;
    const fs = failingFs(undefined, {
      readFile: (p) => (p === abs && ++readsOfTarget === 2 ? new TextEncoder().encode("CORRUPTO") : undefined),
    });
    const { base } = await server(host, fs);

    const body = await apply(base, "verification fails");

    // `createEditorApplyResult` (Checkpoint A) prioriza `recovery-required` sobre el outcome subyacente
    // cuando `recovery.recoveryRequired === true`: es el estado accionable que la UI debe mostrar.
    expect(body.data.apply.state).toBe("recovery-required");
    expect(body.data.apply.wrote).toBe(false);
    expect(body.data.apply.recovery).toMatchObject({ sourceAvailable: true, recoveryRequired: true });
    expect(body.data.apply.recovery?.backupRelativePath).toBe(`${TOKENS_REL}.bak`);
    expect(body.data.apply.recovery?.backupRelativePath?.startsWith("/")).toBe(false);
    // el restore automático de 008 devolvió la fuente a su estado original.
    expect(await readFile(`${host.dir}/${TOKENS_REL}`, "utf8")).toBe(before);
  });
});
