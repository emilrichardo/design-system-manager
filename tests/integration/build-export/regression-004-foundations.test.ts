// T153 (006) — Regresión de 004 (foundations): el comando `foundations` y `foundations --json` conservan
// su contrato (FoundationsJsonEnvelopeV1, formatVersion 1.0.0, command "foundations") y su semántica de
// outcome/exit sobre el host inicial. 006 no altera foundations.
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

describe("regression 004 — foundations (T153)", () => {
  it("foundations → exit estable (token inicial unclassified → partial/4)", async () => {
    const r = await runBinary(["foundations"], await host());
    expect(r.code).toBe(4);
    expect(r.stdout.length + r.stderr.length).toBeGreaterThan(0);
  });

  it("foundations --json → envelope propio (formatVersion 1.0.0, command foundations)", async () => {
    const r = await runBinary(["foundations", "--json"], await host());
    const envelope = JSON.parse(r.stdout) as Record<string, unknown>;
    expect(envelope.formatVersion).toBe("1.0.0");
    expect(envelope.command).toBe("foundations");
    expect(r.stdout.endsWith("}\n")).toBe(true);
  });
});
