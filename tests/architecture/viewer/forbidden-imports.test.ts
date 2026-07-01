// T025 (009) — Falla si `src/application/viewer/**` importa algo prohibido por T024 (node:http, DOM,
// Commander, puertos de escritura); falla si `src/domain/viewer/**` existe (plan.md: sin paquete de
// dominio nuevo). También demuestra que el guard detecta violaciones reales (fixtures temporales), no
// solo que pasa vacíamente sobre el código actual.
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { findViolations } from "../../../scripts/arch-guard.mjs";

const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

describe("viewer forbidden imports (T025)", () => {
  it("el código real de src/application/viewer no viola T024", async () => {
    const violations = await findViolations(REPO_ROOT);
    const viewerViolations = violations.filter((v) => v.file.startsWith("src/application/viewer/"));
    expect(viewerViolations).toEqual([]);
  });

  it("src/domain/viewer no existe (sin paquete de dominio nuevo, decisión de plan.md)", () => {
    expect(existsSync(join(REPO_ROOT, "src", "domain", "viewer"))).toBe(false);
  });

  it("el guard SÍ detecta un import prohibido real (node:http en application/viewer)", async () => {
    const root = await mkdtemp(join(tmpdir(), "arch-guard-viewer-"));
    try {
      await mkdir(join(root, "src", "application", "viewer"), { recursive: true });
      await writeFile(join(root, "src", "application", "viewer", "bad.ts"), 'import { createServer } from "node:http";\n');
      const violations = await findViolations(root);
      expect(violations.some((v) => v.msg.includes("node:http"))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("el guard SÍ detecta una referencia DOM (document/window) en application/viewer", async () => {
    const root = await mkdtemp(join(tmpdir(), "arch-guard-viewer-"));
    try {
      await mkdir(join(root, "src", "application", "viewer"), { recursive: true });
      await writeFile(join(root, "src", "application", "viewer", "bad.ts"), "export const el = document.getElementById('x');\n");
      const violations = await findViolations(root);
      expect(violations.some((v) => v.msg.includes("DOM"))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("el guard SÍ detecta un puerto de escritura en application/viewer", async () => {
    const root = await mkdtemp(join(tmpdir(), "arch-guard-viewer-"));
    try {
      await mkdir(join(root, "src", "application", "viewer"), { recursive: true });
      await writeFile(join(root, "src", "application", "viewer", "bad.ts"), "export interface Bad { readonly writer: TokenSourceWriterPort; }\n");
      const violations = await findViolations(root);
      expect(violations.some((v) => v.msg.includes("*Writer"))).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
