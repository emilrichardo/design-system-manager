import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
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

const hosts: HostProject[] = [];
const handles: ViewerHttpServerHandle[] = [];

afterEach(async () => {
  await Promise.all(handles.splice(0).map((h) => h.close()));
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});

async function server(): Promise<{ readonly base: string; readonly host: HostProject }> {
  const host = await makeHostProject();
  hosts.push(host);
  const handle = await startViewerHttpServer({
    deps: realViewerDeps(host.dir, newCallCounts()),
    editorPlanDeps: { snapshot: createTokenSourceSnapshotReader(), serialize: serializeCandidate },
    executionDir: host.dir,
    host: "127.0.0.1",
  });
  handles.push(handle);
  return { base: `http://127.0.0.1:${handle.port}`, host };
}

describe("Editor HTTP plan route (010 Checkpoint B)", () => {
  it("GET /api/editor/session responde un envelope editorial y conserva Viewer dentro de data", async () => {
    const { base } = await server();
    const res = await fetch(`${base}/api/editor/session`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ formatVersion: "1.0.0", action: "editor-session", state: "idle" });
    expect(body.data.viewer.state).toBe("ready");
  });

  it("POST /api/editor/plan acepta un comando estructurado, devuelve un envelope y no escribe tokens", async () => {
    const { base, host } = await server();
    const before = await readFile(`${host.dir}/${TOKENS_REL}`, "utf8");
    const res = await fetch(`${base}/api/editor/plan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        formatVersion: "1.0.0",
        operations: [{ kind: "update-description", path: "color.brand.primary", description: "Edited from visual editor" }],
      }),
    });
    const after = await readFile(`${host.dir}/${TOKENS_REL}`, "utf8");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ formatVersion: "1.0.0", action: "editor-plan" });
    expect(body.data.plan.canRequestApproval).toBe(true);
    expect(body.data.canApprove).toBe(true);
    expect(after).toBe(before);
  });

  it("rechaza bodies no estructurados sin stack ni rutas absolutas", async () => {
    const { base } = await server();
    const res = await fetch(`${base}/api/editor/plan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operations: [{ kind: "not-real" }] }),
    });
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toContain("invalid-request");
    expect(text).not.toMatch(/\/(Users|home|Volumes)\//);
    expect(text).not.toContain("stack");
  });
});
