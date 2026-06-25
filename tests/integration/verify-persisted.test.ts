import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { verifyPersisted } from "../../src/infrastructure/fs/verify-persisted.js";
import { commitTransaction } from "../../src/infrastructure/fs/transactional-writer.js";
import { nodeFileSystem } from "../../src/infrastructure/fs/node-file-system.js";
import { prepareFiles } from "../../src/infrastructure/serialization/prepare-files.js";
import { MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import { createTmpProject, writeFileIn, type TmpProject } from "../helpers/tmp-project.js";
import { validIdentity } from "../fixtures/documents.js";

const projects: TmpProject[] = [];
async function tmp(): Promise<string> {
  const p = await createTmpProject({ packageJson: false });
  projects.push(p);
  return p.dir;
}
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

const prepared = prepareFiles(validIdentity);
async function writeAll(base: string) {
  for (const f of prepared) await writeFileIn(base, f.relativePath, f.content);
}
const codes = (issues: { code: string }[]) => issues.map((i) => i.code);

describe("verifyPersisted (T034)", () => {
  it("persistencia válida → sin issues", async () => {
    const base = await tmp();
    await writeAll(base);
    expect(await verifyPersisted(nodeFileSystem, base, prepared)).toEqual([]);
  });

  it("archivo ausente → post-verify-missing", async () => {
    const base = await tmp();
    await writeFileIn(base, MANAGED_FILES.config, prepared[0]!.content);
    await writeFileIn(base, MANAGED_FILES.manifest, prepared[1]!.content);
    expect(codes(await verifyPersisted(nodeFileSystem, base, prepared))).toContain("post-verify-missing");
  });

  it("contenido distinto del preparado → post-verify-content-mismatch", async () => {
    const base = await tmp();
    await writeAll(base);
    await writeFileIn(base, MANAGED_FILES.config, '{"configSchemaVersion":"0.1.0","designSystemDir":"design-system"}\n');
    expect(codes(await verifyPersisted(nodeFileSystem, base, prepared))).toContain("post-verify-content-mismatch");
  });

  it("JSON roto → post-verify-parse", async () => {
    const base = await tmp();
    await writeAll(base);
    await writeFileIn(base, MANAGED_FILES.tokens, "{ roto ");
    expect(codes(await verifyPersisted(nodeFileSystem, base, prepared))).toContain("post-verify-parse");
  });

  it("DTCG con hex directo persistido → issues de validación", async () => {
    const base = await tmp();
    await writeAll(base);
    await writeFileIn(base, MANAGED_FILES.tokens, '{"color":{"$type":"color","base":{"x":{"$value":"#3b82f6","$description":"x"}}}}\n');
    const result = await verifyPersisted(nodeFileSystem, base, prepared);
    // difiere del preparado y además es DTCG inválido
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("commitTransaction → post-verify (T033/T034)", () => {
  it("si la relectura posterior difiere → failed/post-verify + rollback", async () => {
    const base = await tmp();
    const tokensFinal = join(base, MANAGED_FILES.tokens);
    const real = nodeFileSystem;
    let promoted = false;
    const fs = {
      ...real,
      rename: async (f: string, t: string) => {
        const out = await real.rename(f, t);
        if (t === tokensFinal) promoted = true;
        return out;
      },
      // Tras promover, la verificación relee y obtiene contenido manipulado para tokens.
      readFile: async (p: string) => (promoted && p === tokensFinal ? "{}\n" : real.readFile(p)),
    };
    const r = await commitTransaction(fs, base, prepared);
    expect(r.status).toBe("failed");
    if (r.status === "failed") expect(r.category).toBe("post-verify");
    // rollback: no queda estado parcial
    expect(existsSync(join(base, MANAGED_FILES.config))).toBe(false);
    expect(existsSync(join(base, MANAGED_FILES.tokens))).toBe(false);
  });
});
