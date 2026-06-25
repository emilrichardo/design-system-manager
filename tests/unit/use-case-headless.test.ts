import { describe, expect, it } from "vitest";
import { initializeDesignSystem } from "../../src/application/initialize-design-system.js";
import { InMemoryFileSystem, buildDeps } from "../helpers/in-memory-adapters.js";

// T040 — El caso de uso se ejecuta SIN terminal, sin Commander/Clack, sin consola y, con estos
// adapters, sin filesystem real (la transacción es un fake en memoria).
describe("ejecución headless (T040)", () => {
  it("initializeDesignSystem corre con adapters en memoria y devuelve created", async () => {
    const built = buildDeps({ tx: { status: "committed", files: ["neuraz-ds.config.json"] } });
    const result = await initializeDesignSystem({ executionDir: "/host" }, built.deps);
    expect(result.status).toBe("created");
    // El reporter retuvo datos semánticos para una futura interfaz.
    expect(built.reporter.host?.rootDir).toBe("/host");
    expect(built.reporter.summary?.identity.slug).toBe("acme-design-system");
    expect(built.reporter.result?.status).toBe("created");
  });
});

describe("InMemoryFileSystem (T040, contrato básico del puerto)", () => {
  it("escribe, lee, renombra y elimina sin Node", async () => {
    const fs = new InMemoryFileSystem();
    expect(await fs.lstatKind("/a.json")).toBe("absent");
    await fs.writeFileExclusive("/a.json", "{}\n");
    expect(await fs.lstatKind("/a.json")).toBe("file");
    expect(await fs.readFile("/a.json")).toBe("{}\n");
    await expect(fs.writeFileExclusive("/a.json", "x")).rejects.toMatchObject({ code: "EEXIST" });
    await fs.rename("/a.json", "/b.json");
    expect(await fs.lstatKind("/a.json")).toBe("absent");
    expect(await fs.lstatKind("/b.json")).toBe("file");
    await fs.removeFile("/b.json");
    expect(await fs.lstatKind("/b.json")).toBe("absent");
  });
});
