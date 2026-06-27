// T017 (003) — Adapter de presentación JSON del puerto `InspectionReporter`. Misma disciplina que el
// reporter JSON de validate: eventos intermedios no-op; SOLO `completed(result)` emite, mapeando con
// `toJsonInspectEnvelope` y serializando con `serializeJsonV1`, **una sola escritura** en stdout para
// todos los outcomes esperados. Conserva TODOS los token paths: NO importa
// `MAX_INSPECT_TERMINAL_TOKEN_ROWS` (esa cota es del reporter textual). Sin análisis, sin fs, sin
// exit codes, sin texto humano. Error de IO se propaga. Stateless.
import type {
  InspectDesignSystemResult,
  InspectionReporter,
} from "../../application/analysis-ports.js";
import { toJsonInspectEnvelope } from "../../application/json/map-inspect.js";
import { serializeJsonV1 } from "./json-serializer.js";
import type { OutputWriter } from "./terminal-reporter.js";

export class InspectJsonReporter implements InspectionReporter {
  constructor(private readonly io: OutputWriter) {}

  hostResolved(): void {
    // no-op: la salida JSON se emite únicamente en `completed`.
  }

  structuralStateDetected(): void {
    // no-op.
  }

  inspected(): void {
    // no-op.
  }

  completed(result: InspectDesignSystemResult): void {
    this.io.out(serializeJsonV1(toJsonInspectEnvelope(result)));
  }
}
