// T011 (006) — Lectura del source snapshot contra filesystem real: ready/sourceHash estable/logical
// path, UTF-8 inválido → read-error, no inicializado → not-found, y solo-lectura (bytes/mtime intactos).
import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createBuildSnapshotReader } from "../../../src/infrastructure/build-export/snapshot-reader.js";
import { emptyProject, makeProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";

const TOKENS_REL = "design-system/tokens/base.tokens.json";
const bag: TmpProject[] = [];
afterEach(async () => {
  await Promise.all(bag.splice(0).map((p) => p.cleanup()));
});

describe("build source snapshot reader (T011)", () => {
  it("produce un snapshot ready con sourceHash hex y logical path lógico", async () => {
    const dir = await makeProject(bag);
    const r = await createBuildSnapshotReader().read({ executionDir: dir });
    expect(r.outcome).toBe("ready");
    if (r.outcome !== "ready") return;
    expect(r.snapshot.logicalSourcePath).toBe(TOKENS_REL);
    expect(r.snapshot.sourceHash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.snapshot.resolvedTokenView.tokens.length).toBeGreaterThan(0);
    expect(r.snapshot.resolvedTokenView.sourceHash).toBe(r.snapshot.sourceHash);
    expect(r.snapshot.foundationProjection).not.toBeNull();
  });

  it("sourceHash es estable byte-exacto entre dos lecturas sin cambios", async () => {
    const dir = await makeProject(bag);
    const a = await createBuildSnapshotReader().read({ executionDir: dir });
    const b = await createBuildSnapshotReader().read({ executionDir: dir });
    if (a.outcome !== "ready" || b.outcome !== "ready") throw new Error("esperado ready");
    expect(a.snapshot.sourceHash).toBe(b.snapshot.sourceHash);
  });

  it("UTF-8 inválido en tokens → read-error", async () => {
    const dir = await makeProject(bag);
    await writeFile(join(dir, TOKENS_REL), Buffer.from([0x7b, 0xff, 0xfe, 0x7d]));
    const r = await createBuildSnapshotReader().read({ executionDir: dir });
    expect(r.outcome).toBe("read-error");
  });

  it("JSON corrupto en tokens → read-error", async () => {
    const dir = await makeProject(bag);
    await writeFile(join(dir, TOKENS_REL), "{ not json ");
    const r = await createBuildSnapshotReader().read({ executionDir: dir });
    expect(r.outcome).toBe("read-error");
  });

  it("proyecto no inicializado → not-found", async () => {
    const dir = await emptyProject(bag);
    const r = await createBuildSnapshotReader().read({ executionDir: dir });
    expect(r.outcome).toBe("not-found");
  });

  it("es solo-lectura: bytes y mtime del documento de tokens intactos", async () => {
    const dir = await makeProject(bag);
    const before = await readFile(join(dir, TOKENS_REL));
    const mtime = (await stat(join(dir, TOKENS_REL))).mtimeMs;
    await createBuildSnapshotReader().read({ executionDir: dir });
    expect(await readFile(join(dir, TOKENS_REL))).toEqual(before);
    expect((await stat(join(dir, TOKENS_REL))).mtimeMs).toBe(mtime);
  });
});
