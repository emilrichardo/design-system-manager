// T049 (004) - Foundations es read-only y determinista.
import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { createTmpProject, type TmpProject } from "../../helpers/tmp-project.js";
import { COLOR } from "../../helpers/ds-fixtures.js";
import { expectReadOnly, foundation, runFoundationsJson, seedDesignSystem } from "./foundations-test-helpers.js";
import { MANAGED_FILES } from "../../../src/domain/plan/managed-files.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

describe("foundations purity/determinism (T049)", () => {
  it("mismo input produce mismos bytes JSON y no modifica archivos", async () => {
    const p = await createTmpProject({ withGit: true });
    projects.push(p);
    const unknownExtensions = {
      color: {
        base: {
          $type: "color",
          $value: COLOR,
          $description: "d",
          $extensions: {
            "future.vendor": { preserve: { nested: true } },
            "ar.neuraz.design-system-manager": { foundation: { level: "primitive" } },
          },
        },
      },
    };
    await seedDesignSystem(p.dir, unknownExtensions);
    const beforeContent = await readFile(`${p.dir}/${MANAGED_FILES.tokens}`, "utf8");

    let first = "";
    await expectReadOnly(p.dir, async () => {
      first = (await runFoundationsJson(p.dir)).stdout;
    });
    const second = (await runFoundationsJson(p.dir)).stdout;

    expect(second).toBe(first);
    expect(await readFile(`${p.dir}/${MANAGED_FILES.tokens}`, "utf8")).toBe(beforeContent);
    expect(first).not.toMatch(/timestamp|uuid|locale|TTY|process\.env/i);
  });
});
