// T039 (010) — Solo el apply de 008 escribe; cualquier otra ruta editorial (session/refresh/plan,
// bodies inválidos, apply bloqueado) deja los bytes del host sin cambios.
import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import type { ApplyTokenMutationDependencies } from "../../../src/application/token-mutations/apply-token-mutation.js";
import type { PlanTokenMutationDependencies } from "../../../src/application/token-mutations/plan-token-mutation.js";
import type { startViewerHttpServer as StartViewerHttpServerType, ViewerHttpServerHandle } from "../../../src/infrastructure/viewer/http-server.js";
import { TOKENS_REL, newCallCounts, realViewerDeps } from "../../application/viewer/real-deps.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";
import { ensureBuilt } from "../../helpers/run-binary.js";

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
  createTokenSourceWriter: (rootDir: string) => ApplyTokenMutationDependencies["createWriter"] extends (r: string) => infer W ? W : never;
};

const hosts: HostProject[] = [];
const handles: ViewerHttpServerHandle[] = [];
afterEach(async () => {
  await Promise.all(handles.splice(0).map((h) => h.close()));
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});

async function server(): Promise<{ readonly base: string; readonly host: HostProject }> {
  const host = await makeHostProject();
  hosts.push(host);
  const viewerDeps = realViewerDeps(host.dir, newCallCounts());
  const handle = await startViewerHttpServer({
    deps: viewerDeps,
    editorPlanDeps: { snapshot: createTokenSourceSnapshotReader(), serialize: serializeCandidate },
    editorApplyDeps: {
      apply: { snapshot: createTokenSourceSnapshotReader(), serialize: serializeCandidate, createWriter: createTokenSourceWriter },
      viewer: viewerDeps,
    },
    executionDir: host.dir,
    host: "127.0.0.1",
  });
  handles.push(handle);
  return { base: `http://127.0.0.1:${handle.port}`, host };
}

async function bytes(host: HostProject): Promise<string> {
  return readFile(`${host.dir}/${TOKENS_REL}`, "utf8");
}

describe("no direct writes outside 008 apply (T039)", () => {
  it("GET /api/editor/session no escribe", async () => {
    const { base, host } = await server();
    const before = await bytes(host);
    await fetch(`${base}/api/editor/session`);
    expect(await bytes(host)).toBe(before);
  });

  it("POST /api/editor/refresh no escribe", async () => {
    const { base, host } = await server();
    const before = await bytes(host);
    await fetch(`${base}/api/editor/refresh`, { method: "POST" });
    expect(await bytes(host)).toBe(before);
  });

  it("POST /api/editor/plan (read-only) no escribe, con o sin conflictos", async () => {
    const { base, host } = await server();
    const before = await bytes(host);
    for (const operations of [
      [{ kind: "update-description", path: "color.base.blue-500", description: "safe" }],
      [{ kind: "remove-token", path: "color.base.blue-500" }],
    ]) {
      await fetch(`${base}/api/editor/plan`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ formatVersion: "1.0.0", operations }) });
    }
    expect(await bytes(host)).toBe(before);
  });

  it("POST /api/editor/plan y /api/editor/apply con body inválido/malformado no escriben", async () => {
    const { base, host } = await server();
    const before = await bytes(host);
    for (const path of ["/api/editor/plan", "/api/editor/apply"]) {
      await fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: "not json" });
      await fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operations: [{ kind: "not-real" }] }) });
    }
    expect(await bytes(host)).toBe(before);
  });

  it("POST /api/editor/apply con comando bloqueado (dependientes) no escribe", async () => {
    const { base, host } = await server();
    const before = await bytes(host);
    await fetch(`${base}/api/editor/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formatVersion: "1.0.0", operations: [{ kind: "remove-token", path: "color.base.blue-500" }] }),
    });
    expect(await bytes(host)).toBe(before);
  });

  it("POST /api/editor/apply exitoso escribe EXACTAMENTE una vez (idempotente si se repite sin cambios reales)", async () => {
    const { base, host } = await server();
    const command = { formatVersion: "1.0.0", operations: [{ kind: "update-description", path: "color.base.blue-500", description: "single write" }] };
    const first = await fetch(`${base}/api/editor/apply`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(command) });
    const firstBody = (await first.json()) as { readonly data: { readonly apply: { readonly state: string; readonly wrote: boolean } } };
    expect(firstBody.data.apply.state).toBe("applied");
    expect(firstBody.data.apply.wrote).toBe(true);
    const after = await bytes(host);

    const second = await fetch(`${base}/api/editor/apply`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(command) });
    const secondBody = (await second.json()) as { readonly data: { readonly apply: { readonly state: string; readonly wrote: boolean } } };
    expect(secondBody.data.apply.state).toBe("unchanged");
    expect(secondBody.data.apply.wrote).toBe(false);
    expect(await bytes(host)).toBe(after);
  });
});
