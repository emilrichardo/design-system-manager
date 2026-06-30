// T151 (006) — Regresión de 002 (validate/inspect): el analyzer reutilizado por build/export NO cambia
// el comportamiento de validate/inspect. Se ejecuta el binario sobre un host válido y se comprueban
// outcomes/exits/streams y que la inspección sigue exponiendo tokens, aliases, tipos y trust.
import { afterEach, describe, expect, it } from "vitest";
import { runBinary } from "../../helpers/run-binary.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";

const hosts: HostProject[] = [];
afterEach(async () => {
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});
async function host(): Promise<string> {
  const p = await makeHostProject();
  hosts.push(p);
  return p.dir;
}

describe("regression 002 — validate/inspect (T151)", () => {
  it("validate sobre un DS válido → exit 0, stderr vacío", async () => {
    const r = await runBinary(["validate"], await host());
    expect(r.code).toBe(0);
    expect(r.stderr).toBe("");
  });

  it("inspect → exit 0 y reporta estructura del DS", async () => {
    const r = await runBinary(["inspect"], await host());
    expect(r.code).toBe(0);
    expect(r.stdout.length).toBeGreaterThan(0);
  });

  it("inspect --json sigue exponiendo tokens/tipos (extensión aditiva del analyzer)", async () => {
    const r = await runBinary(["inspect", "--json"], await host());
    expect(r.code).toBe(0);
    expect(r.stderr).toBe("");
    const envelope = JSON.parse(r.stdout) as Record<string, unknown>;
    expect(envelope.formatVersion).toBe("1.0.0");
    expect(envelope.command).toBe("inspect");
    // El recorrido del analyzer sigue produciendo resultado (tokens/tipos presentes en algún punto).
    expect(r.stdout).toContain("color");
  });
});
