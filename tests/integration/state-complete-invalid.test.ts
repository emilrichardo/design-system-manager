import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MANAGED_FILES } from "../../src/domain/plan/managed-files.js";
import { createTmpProject, writeFileIn, type TmpProject } from "../helpers/tmp-project.js";
import { runRealInit, samplePrepared } from "../helpers/real-init.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

// Escribe los tres documentos válidos y luego sustituye uno por una variante inválida.
async function writeCompleteWith(dir: string, override: Partial<Record<keyof typeof MANAGED_FILES, string>>): Promise<void> {
  const prepared = samplePrepared();
  const byRel: Record<string, string> = {};
  for (const f of prepared) byRel[f.relativePath] = f.content;
  if (override.config !== undefined) byRel[MANAGED_FILES.config] = override.config;
  if (override.manifest !== undefined) byRel[MANAGED_FILES.manifest] = override.manifest;
  if (override.tokens !== undefined) byRel[MANAGED_FILES.tokens] = override.tokens;
  for (const rel of Object.keys(byRel)) await writeFileIn(dir, rel, byRel[rel]!);
}

const cases: Array<[string, Partial<Record<keyof typeof MANAGED_FILES, string>>]> = [
  ["JSON malformado", { tokens: "{ roto " }],
  ["slug inválido", { manifest: '{"manifestSchemaVersion":"0.1.0","name":"Acme","slug":"Bad Slug","version":"0.1.0","tokensDir":"tokens"}\n' }],
  ["versión inválida", { manifest: '{"manifestSchemaVersion":"0.1.0","name":"Acme","slug":"acme","version":"v1","tokensDir":"tokens"}\n' }],
  ["configuración inválida (ruta absoluta)", { config: '{"configSchemaVersion":"0.1.0","designSystemDir":"/etc"}\n' }],
  ["color hex directo no conforme", { tokens: '{"color":{"$type":"color","base":{"x":{"$value":"#3b82f6","$description":"x"}}}}\n' }],
  ["alias inexistente", { tokens: '{"color":{"$type":"color","brand":{"primary":{"$value":"{color.base.missing}","$description":"x"}}}}\n' }],
  ["alias cíclico", { tokens: '{"color":{"$type":"color","a":{"$value":"{color.b}","$description":"x"},"b":{"$value":"{color.a}","$description":"y"}}}\n' }],
];

describe("T054 — estado complete-invalid", () => {
  it.each(cases)("%s → failed/validation (exit 3), sin prompts ni escritura", async (_label, override) => {
    const p = await createTmpProject({ packageJson: { name: "host" } });
    projects.push(p);
    await writeCompleteWith(p.dir, override);
    const tokensBefore = readFileSync(join(p.dir, MANAGED_FILES.tokens), "utf8");

    const { result, exitCode, prompter } = await runRealInit(p.dir);

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.category).toBe("validation");
      expect(result.errors.length).toBeGreaterThan(0);
    }
    expect(exitCode).toBe(3);
    expect(prompter.requestIdentityCalls).toBe(0);
    expect(prompter.confirmCalls).toBe(0);
    // No modifica los documentos existentes.
    expect(readFileSync(join(p.dir, MANAGED_FILES.tokens), "utf8")).toBe(tokensBefore);
  });
});
