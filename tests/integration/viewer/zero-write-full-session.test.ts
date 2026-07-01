// T055 (009) — Sesión completa (cada vista + búsqueda + preview de alias) deja el host root byte-idéntico
// (SC-007): 0 writes, 0 renames, 0 backups, 0 staging, 0 cambios de mtime, 0 cambios en tokens/assets/
// build/manifests.
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { startViewerHttpServer, type ViewerHttpServerHandle } from "../../../src/infrastructure/viewer/http-server.js";
import { searchTokens } from "../../../src/application/viewer/search-filter.js";
import { projectAlias, projectRenameMoveImpactPreview } from "../../../src/application/viewer/alias.js";
import type { ViewerTokenV1 } from "../../../src/application/viewer/token.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";
import { newCallCounts, realViewerDeps } from "../../application/viewer/real-deps.js";

const VIEWER_SECTIONS = ["overview", "colors", "typography", "spacing", "radius", "borders", "shadows", "motion", "aliases", "foundations", "assets", "presets", "issues", "build"];

const hosts: HostProject[] = [];
const handles: ViewerHttpServerHandle[] = [];
afterEach(async () => {
  await Promise.all(handles.splice(0).map((h) => h.close()));
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});

interface FileSnapshot {
  readonly bytes: Buffer;
  readonly mtimeMs: number;
}

async function snapshotDir(dir: string): Promise<ReadonlyMap<string, FileSnapshot>> {
  const out = new Map<string, FileSnapshot>();
  async function walk(rel: string): Promise<void> {
    const abs = join(dir, rel);
    for (const entry of await readdir(abs, { withFileTypes: true })) {
      const childRel = rel === "" ? entry.name : join(rel, entry.name);
      if (entry.isDirectory()) await walk(childRel);
      else {
        const full = join(dir, childRel);
        out.set(childRel, { bytes: await readFile(full), mtimeMs: (await stat(full)).mtimeMs });
      }
    }
  }
  await walk("");
  return out;
}

describe("zero-write full session (T055 / SC-007)", () => {
  it("host root byte-idéntico y con mtime idéntico tras una sesión completa (todas las vistas + búsqueda + preview de alias)", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    // Añade build/assets reales para que "cero cambios" cubra también esos árboles, no solo tokens.
    await writeFile(join(p.dir, "design-system", "build", "manifest.json"), "{}\n").catch(() => undefined);

    const before = await snapshotDir(p.dir);

    const deps = realViewerDeps(p.dir, newCallCounts());
    const handle = await startViewerHttpServer({ deps, executionDir: p.dir, host: "127.0.0.1" });
    handles.push(handle);
    const base = `http://127.0.0.1:${handle.port}`;

    await fetch(`${base}/api/session`);
    const sectionPayloads: Record<string, unknown> = {};
    for (const id of VIEWER_SECTIONS) {
      const res = await fetch(`${base}/api/section/${id}`);
      sectionPayloads[id] = (await res.json()) as { data: unknown };
    }

    // Búsqueda sobre los colores ya cargados (pura, sin I/O).
    const colorsEnvelope = sectionPayloads["colors"] as { data: readonly { token: ViewerTokenV1 }[] };
    searchTokens(colorsEnvelope.data.map((c) => c.token), { query: "blue" });

    // Preview de impacto de alias (read-only; nunca aplica ni persiste).
    const a = projectAlias({ path: "color.base.blue-500", kind: "concrete", immediateTarget: null, chain: [], dependents: ["color.brand.primary"], state: "n/a" });
    await projectRenameMoveImpactPreview(a, "color.base.blue-999", "rename", deps.planRenameMoveImpact);

    const after = await snapshotDir(p.dir);

    expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [rel, snapshot] of before) {
      const afterSnapshot = after.get(rel);
      expect(afterSnapshot?.bytes, `${rel} bytes changed`).toEqual(snapshot.bytes);
      expect(afterSnapshot?.mtimeMs, `${rel} mtime changed`).toBe(snapshot.mtimeMs);
    }
  });

  it("cero staging/backup/temp residual bajo design-system/ tras la sesión completa", async () => {
    const p = await makeHostProject();
    hosts.push(p);
    const deps = realViewerDeps(p.dir, newCallCounts());
    const handle = await startViewerHttpServer({ deps, executionDir: p.dir, host: "127.0.0.1" });
    handles.push(handle);
    const base = `http://127.0.0.1:${handle.port}`;
    for (const id of VIEWER_SECTIONS) await fetch(`${base}/api/section/${id}`);

    const entries = await readdir(join(p.dir, "design-system"), { withFileTypes: true });
    const names = entries.map((e) => e.name);
    const suspicious = names.filter((n) => n.includes(".staging") || n.includes(".backup") || n.includes(".tmp") || n.startsWith("."));
    expect(suspicious).toEqual([]);
  });
});
