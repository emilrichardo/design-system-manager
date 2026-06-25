import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { initializeDesignSystem } from "../../src/application/initialize-design-system.js";
import {
  documentPreparer,
  documentValidators,
  hostRootResolver,
  stateClassifier,
  transactionalWriter,
} from "../../src/infrastructure/initialize-adapters.js";
import { EXPECTED_FILES } from "../../src/domain/plan/managed-files.js";
import type { InitializeDependencies } from "../../src/application/ports.js";
import { createTmpProject, type TmpProject } from "../helpers/tmp-project.js";
import { RecordingReporter, ScriptedPrompter, sampleAnswers } from "../helpers/in-memory-adapters.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

function realDeps(): InitializeDependencies {
  return {
    resolver: hostRootResolver,
    classifier: stateClassifier,
    prompter: new ScriptedPrompter({ kind: "answered", value: sampleAnswers }, { kind: "answered", value: true }),
    reporter: new RecordingReporter(),
    preparer: documentPreparer,
    validators: documentValidators,
    writer: transactionalWriter,
  };
}

describe("idempotencia end-to-end headless (T039)", () => {
  it("primera ejecución crea; segunda devuelve unchanged sin modificar", async () => {
    const p = await createTmpProject({ packageJson: { name: "host" } });
    projects.push(p);

    const first = await initializeDesignSystem({ executionDir: p.dir }, realDeps());
    expect(first.status).toBe("created");
    for (const rel of EXPECTED_FILES) expect(existsSync(join(p.dir, rel))).toBe(true);

    const second = await initializeDesignSystem({ executionDir: p.dir }, realDeps());
    expect(second.status).toBe("unchanged");
    // sin staging temporal remanente
    const { readdirSync } = await import("node:fs");
    expect(readdirSync(p.dir).filter((n) => n.startsWith(".neuraz-ds-staging-"))).toEqual([]);
  });
});
