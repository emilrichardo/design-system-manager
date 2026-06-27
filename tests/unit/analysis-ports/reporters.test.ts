// T019 — Reporters semánticos: reciben modelos estructurados, registran orden, no imprimen, separados.
import { describe, expect, it } from "vitest";
import { validationReport } from "../../../src/domain/analysis/validation-report.js";
import { noLimitsReached } from "../../../src/domain/traversal/limits.js";
import type { DesignSystemInspection } from "../../../src/domain/analysis/design-system-inspection.js";
import {
  RecordingInspectionReporter,
  RecordingValidationReporter,
} from "../../helpers/analysis-fakes.js";
import { analysisHost } from "../../helpers/analysis-fixtures.js";

const report = validationReport({
  structuralState: "complete-valid",
  checkedDocuments: [],
  uncheckedDocuments: [],
  errors: [],
  warnings: [],
  limits: noLimitsReached,
});

describe("ValidationReporter (T019)", () => {
  it("recibe datos estructurados y registra el orden, sin imprimir", async () => {
    const reporter = new RecordingValidationReporter();
    await reporter.hostResolved(analysisHost());
    await reporter.structuralStateDetected("complete-valid");
    await reporter.validated(report);
    await reporter.completed({ outcome: "valid", host: analysisHost(), report });
    expect(reporter.calls).toEqual([
      "host:/repo",
      "state:complete-valid",
      "validated:true",
      "completed:valid",
    ]);
  });
});

describe("InspectionReporter (T019)", () => {
  it("es independiente del de validación y recibe el modelo de inspección", async () => {
    const inspection: DesignSystemInspection = {
      host: { root: "/repo", designSystemPath: "/repo/design-system" },
      structuralState: "complete-valid",
      files: { expected: [], present: [], missing: [] },
      validation: report,
      limits: noLimitsReached,
    };
    const reporter = new RecordingInspectionReporter();
    await reporter.hostResolved(analysisHost());
    await reporter.structuralStateDetected("complete-valid");
    await reporter.inspected(inspection);
    await reporter.completed({ outcome: "valid", host: analysisHost(), inspection });
    expect(reporter.calls).toEqual([
      "host:/repo",
      "state:complete-valid",
      "inspected:complete-valid",
      "completed:valid",
    ]);
  });
});
