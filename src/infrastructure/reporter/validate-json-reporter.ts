// T015 (003) — Adapter de presentación JSON del puerto `ValidationReporter`. Eventos intermedios
// no-op (sin acumular estado); SOLO `completed(result)` emite: mapea con `toJsonValidateEnvelope`,
// serializa con `serializeJsonV1` y escribe **una vez** en stdout (`io.out`) — para TODOS los
// outcomes esperados, incluso los que la CLI traducirá a exit ≠ 0 (ADR-0012/0013). No analiza, no
// lee fs, no recalcula exit codes, no aplica la cota de 200, no produce texto humano. Un error de IO
// se propaga (no hay segunda escritura ni fallback). Stateless: una ejecución → un `completed` → una
// escritura.
import type {
  ValidateDesignSystemResult,
  ValidationReporter,
} from "../../application/analysis-ports.js";
import { toJsonValidateEnvelope } from "../../application/json/map-validate.js";
import { serializeJsonV1 } from "./json-serializer.js";
import type { OutputWriter } from "./terminal-reporter.js";

export class ValidateJsonReporter implements ValidationReporter {
  constructor(private readonly io: OutputWriter) {}

  hostResolved(): void {
    // no-op: la salida JSON se emite únicamente en `completed`.
  }

  structuralStateDetected(): void {
    // no-op.
  }

  validated(): void {
    // no-op.
  }

  completed(result: ValidateDesignSystemResult): void {
    this.io.out(serializeJsonV1(toJsonValidateEnvelope(result)));
  }
}
