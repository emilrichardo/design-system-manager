// T024/T025 — ManagedDocumentReader concreto sobre filesystem real (temp dirs).
import { mkdir, symlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { nodeFileSystem } from "../../../src/infrastructure/fs/node-file-system.js";
import { createManagedDocumentReader } from "../../../src/infrastructure/analysis/managed-document-reader.js";
import { ANALYSIS_LIMITS } from "../../../src/domain/traversal/limits.js";
import type { FileSystem } from "../../../src/application/ports.js";
import type { ReadableManagedDocument } from "../../../src/application/analysis-ports.js";
import { createTmpProject, type TmpProject } from "../../helpers/tmp-project.js";

const CANON: Record<ReadableManagedDocument, string> = {
  config: "neuraz-ds.config.json",
  manifest: "design-system/design-system.json",
  tokens: "design-system/tokens/base.tokens.json",
};
const MAX = ANALYSIS_LIMITS.maxFileBytes;

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

async function project(): Promise<string> {
  const p = await createTmpProject();
  projects.push(p);
  return p.dir;
}
async function writeAt(root: string, rel: string, content: string | Uint8Array): Promise<void> {
  const abs = join(root, rel);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, content);
}
function reader(fs: FileSystem = nodeFileSystem) {
  return createManagedDocumentReader({ fileSystem: fs });
}
function req(rootDir: string, document: ReadableManagedDocument, overrides: Partial<{ relativePath: string; maxBytes: number }> = {}) {
  return {
    rootDir,
    document,
    relativePath: overrides.relativePath ?? CANON[document],
    maxBytes: overrides.maxBytes ?? MAX,
  };
}

describe("ManagedDocumentReader — lectura correcta", () => {
  it("lee los tres documentos administrados con content/sizeBytes/document", async () => {
    const root = await project();
    await writeAt(root, CANON.config, '{"configSchemaVersion":"1.0.0"}');
    await writeAt(root, CANON.manifest, '{"name":"Acme"}');
    await writeAt(root, CANON.tokens, '{"color":{}}');
    const r = reader();
    for (const doc of ["config", "manifest", "tokens"] as const) {
      const res = await r.read(req(root, doc));
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.document).toBe(doc);
        expect(res.relativePath).toBe(CANON[doc]);
        expect(res.sizeBytes).toBeGreaterThan(0);
        expect(res.content.startsWith("{")).toBe(true);
      }
    }
  });

  it("Unicode válido se decodifica correctamente", async () => {
    const root = await project();
    await writeAt(root, CANON.config, '{"name":"Diseño €"}');
    const res = await reader().read(req(root, "config"));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.content).toContain("€");
  });

  it("elimina un BOM UTF-8 inicial de forma consistente", async () => {
    const root = await project();
    await writeAt(root, CANON.config, new Uint8Array([0xef, 0xbb, 0xbf, 0x7b, 0x7d])); // BOM + "{}"
    const res = await reader().read(req(root, "config"));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.content).toBe("{}");
  });
});

describe("ManagedDocumentReader — fallos discriminados", () => {
  it("document/relativePath no coincidentes → outside-root", async () => {
    const root = await project();
    const res = await reader().read(req(root, "config", { relativePath: CANON.tokens }));
    expect(res).toMatchObject({ ok: false, reason: "outside-root" });
  });

  it("ruta con .. → outside-root (no autorizada)", async () => {
    const root = await project();
    const res = await reader().read(req(root, "config", { relativePath: "../evil.json" }));
    expect(res).toMatchObject({ ok: false, reason: "outside-root" });
  });

  it("ausente → absent", async () => {
    const root = await project();
    const res = await reader().read(req(root, "config"));
    expect(res).toMatchObject({ ok: false, reason: "absent" });
  });

  it("directorio ocupando la ruta → not-regular-file", async () => {
    const root = await project();
    await mkdir(join(root, CANON.config), { recursive: true });
    const res = await reader().read(req(root, "config"));
    expect(res).toMatchObject({ ok: false, reason: "not-regular-file" });
  });

  it("tamaño previo > maxBytes → too-large (no se lee)", async () => {
    const root = await project();
    await writeAt(root, CANON.config, "123456");
    const res = await reader().read(req(root, "config", { maxBytes: 4 }));
    expect(res).toMatchObject({ ok: false, reason: "too-large" });
  });

  it("UTF-8 inválido → invalid-encoding (distinto de read-failed)", async () => {
    const root = await project();
    await writeAt(root, CANON.tokens, new Uint8Array([0x7b, 0xff, 0xfe, 0x7d])); // { <invalid> }
    const res = await reader().read(req(root, "tokens"));
    expect(res).toMatchObject({ ok: false, reason: "invalid-encoding" });
  });

  it("fallo de byteSize (p. ej. desaparición) → read-failed", async () => {
    const root = await project();
    await writeAt(root, CANON.config, "{}");
    const fs: FileSystem = {
      ...nodeFileSystem,
      byteSize: async () => {
        throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      },
    };
    const res = await reader(fs).read(req(root, "config"));
    expect(res).toMatchObject({ ok: false, reason: "read-failed" });
  });

  it("TOCTOU: bytes reales > maxBytes aunque metadata previa estuviera bajo el límite → too-large", async () => {
    const root = await project();
    await writeAt(root, CANON.config, "0123456789"); // 10 bytes reales
    const lyingFs: FileSystem = { ...nodeFileSystem, byteSize: async () => 1 }; // miente: 1 ≤ maxBytes
    const res = await reader(lyingFs).read(req(root, "config", { maxBytes: 5 }));
    expect(res).toMatchObject({ ok: false, reason: "too-large" });
  });
});

describe("ManagedDocumentReader — symlinks y seguridad", () => {
  it("symlink externo (design-system → fuera de la raíz) → symlink-external", async () => {
    const root = await project();
    const outside = await project(); // otra raíz temporal
    await writeAt(outside, "tokens/base.tokens.json", "{}");
    await symlink(join(outside), join(root, "design-system"), "dir");
    const res = await reader().read(req(root, "tokens"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("symlink-external");
  });

  it("symlink roto → symlink-external", async () => {
    const root = await project();
    await symlink(join(root, "nonexistent-target"), join(root, "design-system"), "dir");
    const res = await reader().read(req(root, "tokens"));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("symlink-external");
  });
});

describe("ManagedDocumentReader — pureza e invariantes", () => {
  it("no muta la request de entrada", async () => {
    const root = await project();
    await writeAt(root, CANON.config, "{}");
    const request = Object.freeze(req(root, "config"));
    await reader().read(request);
    expect(request.document).toBe("config");
    expect(request.relativePath).toBe(CANON.config);
  });

  it("es determinista (misma entrada ⇒ mismo resultado)", async () => {
    const root = await project();
    await writeAt(root, CANON.config, '{"a":1}');
    const a = await reader().read(req(root, "config"));
    const b = await reader().read(req(root, "config"));
    expect(a).toEqual(b);
  });

  it("no expone stack ni contenido del archivo en mensajes de fallo", async () => {
    const root = await project();
    const res = await reader().read(req(root, "config"));
    if (!res.ok) {
      expect(res.message).not.toContain("Error:");
      expect(res.message).not.toContain("at ");
    }
  });
});
