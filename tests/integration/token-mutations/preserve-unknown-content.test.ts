// T047 (008) — `$extensions` desconocidos (vendor ajeno) y propiedades no gestionadas quedan intactos
// tras mutaciones reales aplicadas vía el binario compilado (complementa T033, a nivel headless).
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runBinary } from "../../helpers/run-binary.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";
import { buildTokens } from "../../../src/domain/builders/build-tokens.js";

const TOKENS_REL = "design-system/tokens/base.tokens.json";
const hosts: HostProject[] = [];
afterEach(async () => {
  await Promise.all(hosts.splice(0).map((h) => h.cleanup()));
});

function tokensWithUnknownContent(): Record<string, unknown> {
  const base = buildTokens() as Record<string, unknown>;
  const color = base.color as Record<string, unknown>;
  const blue = (color.base as Record<string, unknown>)["blue-500"] as Record<string, unknown>;
  return {
    ...base,
    color: {
      ...color,
      base: { ...(color.base as Record<string, unknown>), "blue-500": { ...blue, $extensions: { "com.example.other-vendor": { note: "no tocar", nested: { keep: true } } } } },
    },
    $unknownTopLevel: { keepMe: 42 },
  };
}

async function host(): Promise<string> {
  const p = await makeHostProject({ tokens: tokensWithUnknownContent() });
  hosts.push(p);
  return p.dir;
}

async function commandFile(dir: string, operations: readonly unknown[]): Promise<string> {
  const path = join(dir, "mutation.json");
  await writeFile(path, `${JSON.stringify({ formatVersion: "1.0.0", operations }, null, 2)}\n`, "utf8");
  return path;
}

describe("preserve unknown content across real CLI mutations (T047)", () => {
  it("$extensions de vendor ajeno y propiedades no gestionadas se preservan tras create/update/rename/move", async () => {
    const dir = await host();

    const file1 = await commandFile(dir, [{ kind: "create-token", path: "spacing.500", type: "dimension", value: { value: 20, unit: "px" } }]);
    expect((await runBinary(["token", "apply", "--file", file1], dir)).code).toBe(0);

    const file2 = await commandFile(dir, [{ kind: "update-description", path: "color.base.blue-500", description: "actualizado" }]);
    expect((await runBinary(["token", "apply", "--file", file2], dir)).code).toBe(0);

    expect((await runBinary(["token", "rename", "color.base.blue-500", "blue-600"], dir)).code).toBe(0);
    expect((await runBinary(["token", "move", "color.base.blue-600", "color"], dir)).code).toBe(0);

    const tokens = JSON.parse(await readFile(join(dir, TOKENS_REL), "utf8"));
    expect(tokens.$unknownTopLevel).toEqual({ keepMe: 42 });
    const moved = tokens.color["blue-600"];
    expect(moved.$extensions).toEqual({ "com.example.other-vendor": { note: "no tocar", nested: { keep: true } } });
    expect(moved.$description).toBe("actualizado");
    // El alias del fixture de init sigue apuntando correctamente tras el rename/move.
    expect(tokens.color.brand.primary.$value).toBe("{color.blue-600}");
  });
});
