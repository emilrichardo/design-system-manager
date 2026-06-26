// Fakes en memoria para PROBAR los puertos de 002 (Fase 3). No son API productiva; no imprimen; no
// usan filesystem real. Registran llamadas y devuelven resultados programados.
import type {
  AnalyzeDesignSystemInput,
  AnalyzeExistingDesignSystem,
  InspectDesignSystemResult,
  InspectionReporter,
  ManagedDocumentReadRequest,
  ManagedDocumentReadResult,
  ManagedDocumentReader,
  ReadableManagedDocument,
  ValidateDesignSystemResult,
  ValidationReporter,
} from "../../src/application/analysis-ports.js";
import type { DesignSystemAnalysis } from "../../src/domain/analysis/design-system-analysis.js";
import type { DesignSystemInspection } from "../../src/domain/analysis/design-system-inspection.js";
import type { StructuralState } from "../../src/domain/analysis/structural-state.js";
import type { ValidationReport } from "../../src/domain/analysis/validation-report.js";
import type { HostRoot } from "../../src/application/ports.js";

/** Reader programable: registra peticiones y devuelve un resultado por documento. */
export class ScriptedDocumentReader implements ManagedDocumentReader {
  readonly requests: ManagedDocumentReadRequest[] = [];
  constructor(
    private readonly results: ReadonlyMap<ReadableManagedDocument, ManagedDocumentReadResult>,
  ) {}
  async read(request: ManagedDocumentReadRequest): Promise<ManagedDocumentReadResult> {
    this.requests.push(request);
    const result = this.results.get(request.document);
    return (
      result ?? { ok: false, reason: "absent", message: `sin resultado programado: ${request.document}` }
    );
  }
}

/** Analyzer programable: registra el input y devuelve un `DesignSystemAnalysis` fijo. */
export function scriptedAnalyzer(
  analysis: DesignSystemAnalysis,
  trace?: string[],
): AnalyzeExistingDesignSystem {
  return async (input: AnalyzeDesignSystemInput) => {
    trace?.push(`analyze:${input.executionDir}`);
    return analysis;
  };
}

/** Reporter de validación de grabación (no imprime). */
export class RecordingValidationReporter implements ValidationReporter {
  readonly calls: string[] = [];
  async hostResolved(host: HostRoot): Promise<void> {
    this.calls.push(`host:${host.rootDir}`);
  }
  async structuralStateDetected(state: StructuralState): Promise<void> {
    this.calls.push(`state:${state}`);
  }
  async validated(report: ValidationReport): Promise<void> {
    this.calls.push(`validated:${report.valid}`);
  }
  async completed(result: ValidateDesignSystemResult): Promise<void> {
    this.calls.push(`completed:${result.outcome}`);
  }
}

/** Reporter de inspección de grabación (no imprime). */
export class RecordingInspectionReporter implements InspectionReporter {
  readonly calls: string[] = [];
  async hostResolved(host: HostRoot): Promise<void> {
    this.calls.push(`host:${host.rootDir}`);
  }
  async structuralStateDetected(state: StructuralState): Promise<void> {
    this.calls.push(`state:${state}`);
  }
  async inspected(inspection: DesignSystemInspection): Promise<void> {
    this.calls.push(`inspected:${inspection.structuralState}`);
  }
  async completed(result: InspectDesignSystemResult): Promise<void> {
    this.calls.push(`completed:${result.outcome}`);
  }
}
