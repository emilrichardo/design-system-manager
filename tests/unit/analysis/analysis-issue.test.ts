// T003 — AnalysisIssue (C4): compatibilidad con Issue de 001, error/warning, document/context/path.
import { describe, expect, it } from "vitest";
import type { Issue } from "../../../src/domain/issue.js";
import {
  analysisError,
  analysisWarning,
  isError,
  isWarning,
  type AnalysisIssue,
} from "../../../src/domain/analysis/analysis-issue.js";

describe("AnalysisIssue", () => {
  it("es estructuralmente asignable a Issue de 001 (C4)", () => {
    const issue: Issue = analysisError("dtcg-type-unrecognized", "tipo no reconocido");
    expect(issue.code).toBe("dtcg-type-unrecognized");
    expect(issue.message).toBe("tipo no reconocido");
  });

  it("analysisError tiene severidad error; analysisWarning severidad warning", () => {
    const e = analysisError("c", "m");
    const w = analysisWarning("dtcg-type-not-deeply-inspected", "m");
    expect(e.severity).toBe("error");
    expect(w.severity).toBe("warning");
    expect(isError(e)).toBe(true);
    expect(isWarning(e)).toBe(false);
    expect(isWarning(w)).toBe(true);
  });

  it("preserva code y path; document y context son opcionales", () => {
    const i = analysisError("config-path-escape", "ruta fuera de la raíz", {
      path: "designSystemDir",
      document: "config",
      context: { value: "../../etc" },
    });
    expect(i.code).toBe("config-path-escape");
    expect(i.path).toBe("designSystemDir");
    expect(i.document).toBe("config");
    expect(i.context).toEqual({ value: "../../etc" });
  });

  it("sin opts no añade campos opcionales (document/context/path ausentes)", () => {
    const i = analysisWarning("dtcg-empty-group", "grupo vacío");
    expect("document" in i).toBe(false);
    expect("context" in i).toBe(false);
    expect("path" in i).toBe(false);
  });

  it("el código es estable y distinto del mensaje humano", () => {
    const i: AnalysisIssue = analysisError("alias-cyclic", "Se detectó un ciclo de aliases");
    expect(i.code).not.toBe(i.message);
  });
});
