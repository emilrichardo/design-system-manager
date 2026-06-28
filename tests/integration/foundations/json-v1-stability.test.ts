// T051/T052 (004) - 003 JSON sigue estable y metadata foundations solo corre en foundations.
import { afterEach, describe, expect, it } from "vitest";
import { JSON_FORMAT_VERSION } from "../../../src/application/json/format-version.js";
import type { JsonCommand, JsonEnvelopeV1 } from "../../../src/application/json/dto.js";
import { serializeJsonV1 } from "../../../src/infrastructure/reporter/json-serializer.js";
import { COLOR, makeProject } from "../../helpers/ds-fixtures.js";
import type { TmpProject } from "../../helpers/tmp-project.js";
import { runInspectJson, runValidateJson } from "../json-output/json-output-helpers.js";
import { foundation, issueCodes, runFoundationsJson } from "./foundations-test-helpers.js";

const projects: TmpProject[] = [];
afterEach(async () => {
  while (projects.length) await projects.pop()!.cleanup();
});

describe("JSON v1 de 003 estable (T051)", () => {
  it("validate --json e inspect --json conservan command/version y no exponen foundations", async () => {
    const root = await makeProject(projects, {
      tokens: {
        color: {
          base: {
            $type: "color",
            $value: COLOR,
            $description: "d",
            ...foundation("core"),
          },
        },
      },
    });

    const validate = await runValidateJson(root);
    const inspect = await runInspectJson(root);

    expect(JSON_FORMAT_VERSION).toBe("1.0.0");
    expect(validate.stdout).toBe(serializeJsonV1(validate.json as JsonEnvelopeV1));
    expect(inspect.stdout).toBe(serializeJsonV1(inspect.json as JsonEnvelopeV1));
    expect(validate.json).toMatchObject({ formatVersion: "1.0.0", command: "validate", outcome: "valid" });
    expect(inspect.json).toMatchObject({ formatVersion: "1.0.0", command: "inspect", outcome: "valid" });
    expect(validate.stdout + inspect.stdout).not.toContain("foundation-level-invalid");

    const commands: JsonCommand[] = ["validate", "inspect"];
    expect(commands).toEqual(["validate", "inspect"]);
  });
});

describe("metadata foundations aislada (T052)", () => {
  it("validate/inspect no invocan ni reflejan metadata foundations; foundations sí", async () => {
    const root = await makeProject(projects, {
      tokens: {
        color: {
          base: {
            $type: "color",
            $value: COLOR,
            $description: "d",
            ...foundation("core"),
          },
        },
      },
    });

    expect((await runValidateJson(root)).code).toBe(0);
    expect((await runInspectJson(root)).code).toBe(0);
    const foundations = await runFoundationsJson(root);

    expect(foundations.code).toBe(3);
    expect(issueCodes(foundations.json)).toContain("foundation-level-invalid");
  });
});
