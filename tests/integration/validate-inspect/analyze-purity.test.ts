// T029 — Pureza observacional de la tubería: analizar NO altera el proyecto (sin escrituras/staging).
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeExistingDesignSystem } from "../../../src/application/analyze-existing-design-system.js";
import type { AnalyzeDesignSystemDependencies } from "../../../src/application/analysis-ports.js";
import { hostRootResolver, documentValidators } from "../../../src/infrastructure/initialize-adapters.js";
import { inspectPresence } from "../../../src/infrastructure/host-root/inspect-presence.js";
import { nodeFileSystem } from "../../../src/infrastructure/fs/node-file-system.js";
import { createManagedDocumentReader } from "../../../src/infrastructure/analysis/managed-document-reader.js";
import { createDtcgAnalyzer } from "../../../src/infrastructure/analysis/dtcg-read-validator.js";
import { buildConfig } from "../../../src/domain/builders/build-config.js";
import { buildTokens } from "../../../src/domain/builders/build-tokens.js";
import { MANAGED_FILES } from "../../../src/domain/plan/managed-files.js";
import { createTmpProject, type TmpProject } from "../../helpers/tmp-project.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

function deps(): AnalyzeDesignSystemDependencies {
  return {
    hostRootResolver,
    presenceInspector: { inspectPresence },
    stateClassifier: { classify: () => ({ kind: "none" }) },
    documentReader: createManagedDocumentReader({ fileSystem: nodeFileSystem }),
    documentValidators,
    dtcgAnalyzer: createDtcgAnalyzer(),
  };
}

async function snapshot(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const abs = join(dir, e.name);
      if (e.isDirectory()) {
        out.push(`${relative(root, abs)}/`);
        await walk(abs);
      } else {
        const st = await stat(abs);
        out.push(`${relative(root, abs)}:${st.size}:${st.mtimeMs}`);
      }
    }
  }
  await walk(root);
  return out.sort();
}

const manifest = JSON.stringify({ manifestSchemaVersion: "0.1.0", name: "Acme", slug: "acme", version: "0.1.0", tokensDir: "tokens" });

async function seed(root: string, kind: "valid" | "invalid" | "broken-json" | "cyclic"): Promise<void> {
  await writeFile(join(root, MANAGED_FILES.config), JSON.stringify(buildConfig()));
  await mkdir(join(root, "design-system", "tokens"), { recursive: true });
  await writeFile(join(root, MANAGED_FILES.manifest), manifest);
  const tokens =
    kind === "valid" ? JSON.stringify(buildTokens())
    : kind === "invalid" ? JSON.stringify({ g: { t: { $type: "weird", $value: "v" } } })
    : kind === "cyclic" ? JSON.stringify({ g: { a: { $value: "{g.a}" } } })
    : "{ broken json";
  await writeFile(join(root, MANAGED_FILES.tokens), tokens);
}

describe("Pureza observacional de la tubería (T029)", () => {
  it.each(["valid", "invalid", "broken-json", "cyclic"] as const)(
    "analizar (%s) no produce cambios observables",
    async (kind) => {
      const p = await createTmpProject();
      projects.push(p);
      await seed(p.dir, kind);
      const before = await snapshot(p.dir);
      await analyzeExistingDesignSystem({ executionDir: p.dir }, deps());
      const after = await snapshot(p.dir);
      expect(after).toEqual(before);
      expect(after.some((e) => e.includes(".neuraz-ds-staging-"))).toBe(false);
    },
  );
});
