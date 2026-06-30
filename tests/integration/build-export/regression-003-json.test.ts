// T152 (006) — Regresión de 003 (JSON v1): `validate --json` e `inspect --json` conservan el contrato
// `JsonEnvelopeV1` (formatVersion 1.0.0, command, dos espacios de indentación, newline final, bytes en
// stdout, stderr vacío). 006 NO modifica este contrato.
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

describe("regression 003 — JSON v1 (T152)", () => {
  it.each(["validate", "inspect"] as const)("%s --json → envelope v1 en stdout, stderr vacío", async (command) => {
    const r = await runBinary([command, "--json"], await host());
    expect(r.code).toBe(0);
    expect(r.stderr).toBe("");
    const envelope = JSON.parse(r.stdout) as Record<string, unknown>;
    expect(envelope.formatVersion).toBe("1.0.0");
    expect(envelope.command).toBe(command);
  });

  it("serialización: indentación de dos espacios y newline final único", async () => {
    const r = await runBinary(["validate", "--json"], await host());
    expect(r.stdout).toContain('\n  "');
    expect(r.stdout.endsWith("}\n")).toBe(true);
    expect(r.stdout.endsWith("}\n\n")).toBe(false);
  });
});
