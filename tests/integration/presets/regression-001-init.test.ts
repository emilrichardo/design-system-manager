// T108 (005) — Regresión de 001-ds-init: la feature de presets NO cambia el comportamiento aprobado de
// `init`. Tres documentos canónicos, primera ejecución created/0, segunda unchanged/2, e (crítico) NO
// se aplica ningún preset automáticamente durante `init`: los tokens iniciales son exactamente los de
// `buildTokens()` y no contienen tokens de `neutral-base`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runRealInit } from "../../helpers/real-init.js";
import { buildTokens } from "../../../src/domain/builders/build-tokens.js";
import { buildConfig } from "../../../src/domain/builders/build-config.js";
import { MANAGED_FILES } from "../../../src/domain/plan/managed-files.js";
import { createTmpProject, type TmpProject } from "../../helpers/tmp-project.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});
async function host(): Promise<string> {
  const p = await createTmpProject();
  projects.push(p);
  return p.dir;
}

describe("regression 001 — init unchanged after presets (T108)", () => {
  it("creates exactly the three managed documents and is idempotent", async () => {
    const dir = await host();

    const first = await runRealInit(dir);
    expect(first.result.status).toBe("created");
    expect(first.exitCode).toBe(0);
    for (const rel of [MANAGED_FILES.config, MANAGED_FILES.manifest, MANAGED_FILES.tokens]) {
      expect(readFileSync(join(dir, rel), "utf8").length).toBeGreaterThan(0);
    }

    const second = await runRealInit(dir);
    expect(second.result.status).toBe("unchanged");
    expect(second.exitCode).toBe(2);
  });

  it("does NOT apply any preset during init: tokens are the canonical init document", async () => {
    const dir = await host();
    await runRealInit(dir);

    const tokensText = readFileSync(join(dir, MANAGED_FILES.tokens), "utf8");
    // Byte-idéntico al documento canónico de init.
    expect(tokensText).toBe(`${JSON.stringify(buildTokens(), null, 2)}\n`);

    const tokens = JSON.parse(tokensText) as Record<string, unknown> & { color: Record<string, unknown>; spacing?: unknown };
    // Ningún token de neutral-base presente (gray/surface/spacing del preset).
    expect((tokens.color as Record<string, unknown>).gray).toBeUndefined();
    expect((tokens.color as Record<string, unknown>).surface).toBeUndefined();
    expect(tokens.spacing).toBeUndefined();
  });

  it("config document remains the canonical init config", async () => {
    const dir = await host();
    await runRealInit(dir);
    expect(readFileSync(join(dir, MANAGED_FILES.config), "utf8")).toBe(`${JSON.stringify(buildConfig(), null, 2)}\n`);
  });
});
