// T146 (006) — `export css|json|typescript` como proceso hijo: bytes exactos a stdout, stderr vacío,
// CERO escrituras (no se crea `design-system/build/`). Read-only verificado contra el filesystem real.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runBinary } from "../helpers/run-binary.js";
import { makeHostProject, type HostProject } from "../helpers/build-host.js";

const hosts: HostProject[] = [];
afterEach(async () => {
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});

async function host(): Promise<string> {
  const p = await makeHostProject();
  hosts.push(p);
  return p.dir;
}

describe("export binary (T146)", () => {
  it("export css → stdout CSS, stderr vacío, sin escribir", async () => {
    const dir = await host();
    const r = await runBinary(["export", "css"], dir);
    expect(r.code).toBe(0);
    expect(r.stderr).toBe("");
    expect(r.stdout.startsWith(":root {")).toBe(true);
    expect(r.stdout.endsWith("}\n")).toBe(true);
    expect(r.stdout.endsWith("}\n\n")).toBe(false); // sin newline extra
    expect(existsSync(join(dir, "design-system", "build"))).toBe(false);
  });

  it("export json → JSON parseable a stdout, stderr vacío, sin escribir", async () => {
    const dir = await host();
    const r = await runBinary(["export", "json"], dir);
    expect(r.code).toBe(0);
    expect(r.stderr).toBe("");
    expect(() => JSON.parse(r.stdout)).not.toThrow();
    expect(JSON.parse(r.stdout)).toMatchObject({ formatVersion: "1.0.0" });
    expect(existsSync(join(dir, "design-system", "build"))).toBe(false);
  });

  it("export typescript → exports a stdout, stderr vacío, sin escribir", async () => {
    const dir = await host();
    const r = await runBinary(["export", "typescript"], dir);
    expect(r.code).toBe(0);
    expect(r.stderr).toBe("");
    expect(r.stdout).toContain("export const tokens");
    expect(r.stdout).not.toMatch(/^\s*import\b/m); // sin imports en runtime
    expect(existsSync(join(dir, "design-system", "build"))).toBe(false);
  });

  it("formato inválido → error de uso/3 (no escribe, no emite artifact)", async () => {
    const dir = await host();
    const r = await runBinary(["export", "svg"], dir);
    expect(r.code).toBe(3);
    expect(r.stdout).toBe("");
    expect(r.stderr).toContain("css, json, typescript");
    expect(existsSync(join(dir, "design-system", "build"))).toBe(false);
  });

  it("export es estable: dos ejecuciones producen bytes idénticos", async () => {
    const dir = await host();
    const a = await runBinary(["export", "css"], dir);
    const b = await runBinary(["export", "css"], dir);
    expect(a.stdout).toBe(b.stdout);
  });
});
