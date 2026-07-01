// T042 (008) — Los casos de uso de mutaciones son headless: sin Commander/process/TTY; producen
// resultados estructurados, JSON-serializables sin pérdida, reutilizables directamente por MCP/Studio
// sin pasar por la CLI.
import { describe, expect, it } from "vitest";
import { planTokenMutation } from "../../../src/application/token-mutations/plan-token-mutation.js";
import { applyTokenMutation } from "../../../src/application/token-mutations/apply-token-mutation.js";
import { aliasedDoc, command, fakeSnapshot, sourceFrom, stubSerialize } from "./fixtures.js";
import type { TokenSourceWriterPort } from "../../../src/application/token-mutations/ports.js";

/** Falla si el valor contiene funciones, `Error`, `undefined` o cualquier dato no JSON-safe (recursivo). */
function assertJsonSafe(value: unknown, path = "$"): void {
  if (value === null) return;
  if (value === undefined) throw new Error(`undefined en ${path}`);
  if (value instanceof Error) throw new Error(`Error nativo en ${path}`);
  const t = typeof value;
  if (t === "function" || t === "symbol" || t === "bigint") throw new Error(`${t} en ${path}`);
  if (t !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertJsonSafe(v, `${path}[${i}]`));
    return;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) assertJsonSafe(v, `${path}.${k}`);
}

function fakeWriter(): TokenSourceWriterPort {
  return {
    write: async () => ({ outcome: "written", wrote: true, sourceAvailable: true, backupRelativePath: null, recoveryRequired: false, error: null }),
  };
}

describe("headless reuse of token mutation use cases (T042)", () => {
  it("planTokenMutation es invocable directamente (sin CLI) y produce un resultado JSON-safe", async () => {
    const r = await planTokenMutation({ executionDir: "/anywhere-not-process-cwd" }, command({ kind: "rename-token", path: "color.brand.500", newName: "primary" }), {
      snapshot: fakeSnapshot(sourceFrom(aliasedDoc())),
      serialize: stubSerialize,
    });
    expect(r.outcome).toBe("planned");
    assertJsonSafe(r);
    expect(() => JSON.stringify(r)).not.toThrow();
  });

  it("applyTokenMutation es invocable directamente (sin CLI) y produce un resultado JSON-safe", async () => {
    const r = await applyTokenMutation({ executionDir: "/anywhere-not-process-cwd" }, command({ kind: "update-value", path: "color.brand.500", value: "#000" }), {
      snapshot: fakeSnapshot(sourceFrom(aliasedDoc())),
      serialize: stubSerialize,
      createWriter: () => fakeWriter(),
    });
    expect(r.outcome).toBe("applied");
    assertJsonSafe(r);
    expect(() => JSON.stringify(r)).not.toThrow();
  });

  it("dos invocaciones independientes con las mismas entradas producen resultados idénticos (sin estado compartido/global)", async () => {
    const deps = { snapshot: fakeSnapshot(sourceFrom(aliasedDoc())), serialize: stubSerialize };
    const a = await planTokenMutation({ executionDir: "/x" }, command({ kind: "rename-token", path: "color.brand.500", newName: "primary" }), deps);
    const b = await planTokenMutation({ executionDir: "/x" }, command({ kind: "rename-token", path: "color.brand.500", newName: "primary" }), deps);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("no depende de process.argv/cwd: executionDir es un parámetro explícito", async () => {
    const deps = { snapshot: fakeSnapshot(sourceFrom(aliasedDoc())), serialize: stubSerialize };
    const r = await planTokenMutation({ executionDir: "totalmente-inventado-e-inexistente" }, command({ kind: "update-value", path: "color.brand.500", value: "#111" }), deps);
    // El snapshot fake ignora executionDir; lo relevante es que la firma solo pide el input explícito.
    expect(r.outcome).toBe("planned");
  });
});
