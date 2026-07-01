// T047 (010) — El Editor no rompe ninguna feature cerrada: 001 init, 002 validate/inspect, 003 JSON,
// 004 foundations, 005 presets, 006 build/export, 007 assets, 008 token CLI/JSON, 009 Viewer read-only.
// Un flujo REAL de edición vía el Editor (plan + apply) solo toca `design-system/tokens/base.tokens.json`
// — nunca `design-system/build/**`, el asset manifest ni el host manifest.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { PlanTokenMutationDependencies } from "../../../src/application/token-mutations/plan-token-mutation.js";
import type { ApplyTokenMutationDependencies } from "../../../src/application/token-mutations/apply-token-mutation.js";
import type { startViewerHttpServer as StartViewerHttpServerType, ViewerHttpServerHandle } from "../../../src/infrastructure/viewer/http-server.js";
import { newCallCounts, realViewerDeps } from "../../application/viewer/real-deps.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";
import { runBinary, ensureBuilt } from "../../helpers/run-binary.js";
import { png } from "../assets/asset-store-fixtures.js";

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

const TOKENS_REL = "design-system/tokens/base.tokens.json";
const MANIFEST_REL = "design-system/design-system.json";
const ASSET_MANIFEST_REL = "design-system/assets/assets.json";

const hosts: HostProject[] = [];
const handles: ViewerHttpServerHandle[] = [];
afterEach(async () => {
  await Promise.all(handles.splice(0).map((h) => h.close()));
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});

async function host(): Promise<HostProject> {
  const p = await makeHostProject();
  hosts.push(p);
  return p;
}

async function editorServer(dir: string): Promise<{ readonly base: string }> {
  const viewerDeps = realViewerDeps(dir, newCallCounts());
  const handle = await startViewerHttpServer({
    deps: viewerDeps,
    editorPlanDeps: { snapshot: createTokenSourceSnapshotReader(), serialize: serializeCandidate },
    editorApplyDeps: {
      apply: { snapshot: createTokenSourceSnapshotReader(), serialize: serializeCandidate, createWriter: createTokenSourceWriter },
      viewer: viewerDeps,
    },
    executionDir: dir,
    host: "127.0.0.1",
  });
  handles.push(handle);
  return { base: `http://127.0.0.1:${handle.port}` };
}

describe("regression 001-009 — editor token flows leave everything else untouched (T047)", () => {
  it("un apply real del Editor solo modifica tokens.json: build/asset manifest/host manifest byte-estables", async () => {
    const p = await host();
    await runBinary(["build"], p.dir);
    await writeFile(join(p.dir, "hero.png"), png(8, 8, 1));
    await runBinary(["asset", "import", "apply", "./hero.png", "--license", "CC0-1.0"], p.dir);

    const buildBefore = await readFile(join(p.dir, "design-system", "build", "manifest.json"), "utf8");
    const cssBefore = await readFile(join(p.dir, "design-system", "build", "tokens.css"), "utf8");
    const assetManifestBefore = await readFile(join(p.dir, ASSET_MANIFEST_REL), "utf8");
    const hostManifestBefore = await readFile(join(p.dir, MANIFEST_REL), "utf8");

    const { base } = await editorServer(p.dir);
    const res = await fetch(`${base}/api/editor/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formatVersion: "1.0.0", operations: [{ kind: "update-description", path: "color.base.blue-500", description: "regression check" }] }),
    });
    const body = (await res.json()) as { readonly data: { readonly apply: { readonly state: string; readonly wrote: boolean } } };
    expect(body.data.apply.state).toBe("applied");
    expect(body.data.apply.wrote).toBe(true);

    expect(await readFile(join(p.dir, "design-system", "build", "manifest.json"), "utf8")).toBe(buildBefore);
    expect(await readFile(join(p.dir, "design-system", "build", "tokens.css"), "utf8")).toBe(cssBefore);
    expect(await readFile(join(p.dir, ASSET_MANIFEST_REL), "utf8")).toBe(assetManifestBefore);
    expect(await readFile(join(p.dir, MANIFEST_REL), "utf8")).toBe(hostManifestBefore);
    expect(await readFile(join(p.dir, TOKENS_REL), "utf8")).toContain("regression check");
  });

  it("Viewer read-only (view --json) sigue produciendo cero escrituras tras un apply del Editor", async () => {
    const p = await host();
    const { base } = await editorServer(p.dir);
    await fetch(`${base}/api/editor/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formatVersion: "1.0.0", operations: [{ kind: "update-description", path: "color.base.blue-500", description: "editor wrote this" }] }),
    });
    const tokensBefore = await readFile(join(p.dir, TOKENS_REL), "utf8");
    const r = await runBinary(["view", "--json"], p.dir);
    expect(r.code).toBe(0);
    expect(await readFile(join(p.dir, TOKENS_REL), "utf8")).toBe(tokensBefore);
  });

  it("008 token plan/apply CLI siguen funcionando exactamente igual tras un apply del Editor", async () => {
    const p = await host();
    const { base } = await editorServer(p.dir);
    await fetch(`${base}/api/editor/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formatVersion: "1.0.0", operations: [{ kind: "update-description", path: "color.base.blue-500", description: "editor wrote this" }] }),
    });

    const file = join(p.dir, "mutation.json");
    await writeFile(file, `${JSON.stringify({ formatVersion: "1.0.0", operations: [{ kind: "update-description", path: "color.base.blue-500", description: "cli wrote this" }] }, null, 2)}\n`, "utf8");
    const plan = await runBinary(["token", "plan", "--file", file], p.dir);
    expect(plan.code).toBe(0);
    const apply = await runBinary(["token", "apply", "--file", file], p.dir);
    expect(apply.code).toBe(0);
    expect(await readFile(join(p.dir, TOKENS_REL), "utf8")).toContain("cli wrote this");
  });

  it("Asset Manager (007) sigue funcionando igual tras un apply del Editor; el Editor no toca assets", async () => {
    const p = await host();
    const { base } = await editorServer(p.dir);
    await fetch(`${base}/api/editor/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formatVersion: "1.0.0", operations: [{ kind: "update-description", path: "color.base.blue-500", description: "editor" }] }),
    });
    await mkdir(p.dir, { recursive: true });
    await writeFile(join(p.dir, "hero.png"), png(4, 4, 1));
    const apply = await runBinary(["asset", "import", "apply", "./hero.png", "--license", "CC0-1.0"], p.dir);
    expect(apply.code).toBe(0);
    const list = await runBinary(["asset", "list", "--json"], p.dir);
    expect(list.code).toBe(0);
    expect(JSON.parse(list.stdout)).toMatchObject({ formatVersion: "1.0.0" });
  });

  it("build/export (006) siguen siendo byte-estables tras un apply no-op del Editor (unchanged)", async () => {
    const p = await host();
    const build1 = await runBinary(["build"], p.dir);
    expect(build1.code).toBe(0);
    const css1 = await readFile(join(p.dir, "design-system", "build", "tokens.css"));

    const { base } = await editorServer(p.dir);
    // sin operaciones: candidato == fuente actual → unchanged, cero escrituras.
    const res = await fetch(`${base}/api/editor/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formatVersion: "1.0.0", operations: [] }),
    });
    const body = (await res.json()) as { readonly data: { readonly apply: { readonly state: string; readonly wrote: boolean } } };
    expect(body.data.apply.state).toBe("unchanged");
    expect(body.data.apply.wrote).toBe(false);

    const build2 = await runBinary(["build"], p.dir);
    expect(build2.code).toBe(2); // unchanged: build previo sigue vigente
    const css2 = await readFile(join(p.dir, "design-system", "build", "tokens.css"));
    expect(css2).toEqual(css1);
  });

  it("validate/inspect/foundations/presets (002/004/005) conservan outcome/exit tras un apply del Editor", async () => {
    const p = await host();
    const { base } = await editorServer(p.dir);
    await fetch(`${base}/api/editor/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formatVersion: "1.0.0", operations: [{ kind: "update-description", path: "color.base.blue-500", description: "editor" }] }),
    });
    expect((await runBinary(["validate"], p.dir)).code).toBe(0);
    expect((await runBinary(["inspect"], p.dir)).code).toBe(0);
    expect((await runBinary(["foundations"], p.dir)).code).toBe(4);
    expect((await runBinary(["presets", "list"], p.dir)).code).toBe(0);
  });

  it("init (001) sigue produciendo unchanged tras un apply del Editor", async () => {
    const p = await host();
    const { base } = await editorServer(p.dir);
    await fetch(`${base}/api/editor/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formatVersion: "1.0.0", operations: [{ kind: "update-description", path: "color.base.blue-500", description: "editor" }] }),
    });
    expect((await runBinary(["init"], p.dir)).code).toBe(2);
  });

  it("003 JSON histórico (validate --json) sigue byte-estable tras un apply del Editor que no toca ese token", async () => {
    const p = await host();
    const before = await runBinary(["validate", "--json"], p.dir);
    const { base } = await editorServer(p.dir);
    await fetch(`${base}/api/editor/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ formatVersion: "1.0.0", operations: [] }),
    });
    const after = await runBinary(["validate", "--json"], p.dir);
    expect(after.stdout).toBe(before.stdout);
  });
});
