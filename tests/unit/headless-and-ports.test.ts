import { describe, expect, it } from "vitest";
import { initializeDesignSystem } from "../../src/application/initialize-design-system.js";
import { buildDeps } from "../helpers/in-memory-adapters.js";

// T066 — El caso de uso corre headless (sin Commander/Clack/consola/proceso hijo/TTY/FS real)
// y los puertos Prompter/Reporter son independientes y reemplazables. Habilita una futura
// TUI/Studio/MCP sin reescribir dominio/aplicación (que NO se implementan aquí).
describe("T066 — headless / preparación TUI-Studio-MCP", () => {
  it("se ejecuta solo con adapters en memoria y devuelve un resultado semántico", async () => {
    const built = buildDeps({ tx: { status: "committed", files: ["neuraz-ds.config.json"] } });
    const result = await initializeDesignSystem({ executionDir: "/host" }, built.deps);

    expect(result.status).toBe("created");
    // El reporter recibió datos estructurados (no texto preformateado).
    expect(built.reporter.host?.rootDir).toBe("/host");
    expect(built.reporter.summary?.files.length).toBe(3);
    expect(built.reporter.result?.status).toBe("created");
  });

  it("el resultado del dominio NO contiene exit codes ni texto de terminal", async () => {
    const built = buildDeps();
    const result = await initializeDesignSystem({ executionDir: "/host" }, built.deps);
    expect(result).not.toHaveProperty("exitCode");
    expect(result).not.toHaveProperty("code");
    // created solo expone `files` (datos), nada de ANSI/strings de terminal.
    if (result.status === "created") expect(Object.keys(result).sort()).toEqual(["files", "status"]);
  });

  it("Prompter y Reporter son colaboradores independientes e intercambiables", async () => {
    const built = buildDeps();
    expect(built.deps.prompter).not.toBe(built.deps.reporter);
    // Un reporter alternativo (silencioso) no altera el resultado.
    const silent = buildDeps({ reporter: { hostResolved() {}, previousStateDetected() {}, planPrepared() {}, completed() {} } });
    const result = await initializeDesignSystem({ executionDir: "/host" }, silent.deps);
    expect(result.status).toBe("created");
  });
});
