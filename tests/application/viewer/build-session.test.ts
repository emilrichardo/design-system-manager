// T016 (009) — `buildViewerSession` sobre fixtures reales: cada caso de uso reusado se invoca como
// máximo una vez por sesión; el host root queda byte-idéntico antes/después (cero escrituras).
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildViewerSession } from "../../../src/application/viewer/build-session.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";
import { newCallCounts, realViewerDeps } from "./real-deps.js";

const hosts: HostProject[] = [];
afterEach(async () => {
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});
async function host(): Promise<HostProject> {
  const p = await makeHostProject();
  hosts.push(p);
  return p;
}

async function snapshotDir(dir: string): Promise<ReadonlyMap<string, Buffer>> {
  const out = new Map<string, Buffer>();
  async function walk(rel: string): Promise<void> {
    const abs = join(dir, rel);
    for (const entry of await readdir(abs, { withFileTypes: true })) {
      const childRel = rel === "" ? entry.name : join(rel, entry.name);
      if (entry.isDirectory()) await walk(childRel);
      else out.set(childRel, await readFile(join(dir, childRel)));
    }
  }
  await walk("");
  return out;
}

describe("buildViewerSession — single load and zero writes (T016)", () => {
  it("invoca cada caso de uso reusado exactamente una vez", async () => {
    const p = await host();
    const counts = newCallCounts();
    const session = await buildViewerSession({ executionDir: p.dir }, realViewerDeps(p.dir, counts));
    expect(session.state).toBe("ready");
    expect(counts.readBuildSnapshot).toBe(1);
    expect(counts.listPresets).toBe(1);
    expect(counts.listAssets).toBe(1);
    expect(counts.readBuildManifest).toBe(1);
  });

  it("el host queda byte-idéntico antes/después (cero escrituras)", async () => {
    const p = await host();
    const before = await snapshotDir(p.dir);
    await buildViewerSession({ executionDir: p.dir }, realViewerDeps(p.dir, newCallCounts()));
    const after = await snapshotDir(p.dir);
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [rel, bytes] of before) expect(after.get(rel)).toEqual(bytes);
  });

  it("dos cargas independientes con el mismo host producen el mismo overview/navigation (determinismo)", async () => {
    const p = await host();
    const a = await buildViewerSession({ executionDir: p.dir }, realViewerDeps(p.dir, newCallCounts()));
    const b = await buildViewerSession({ executionDir: p.dir }, realViewerDeps(p.dir, newCallCounts()));
    expect(JSON.stringify(a.overview)).toBe(JSON.stringify(b.overview));
    expect(JSON.stringify(a.navigation)).toBe(JSON.stringify(b.navigation));
  });
});
