// T036 (008) — Reporter JSON de mutaciones de tokens. Outcomes esperados (incluyendo errores) → UN
// envelope en stdout, stderr vacío (mismo patrón que build/asset/presets). `internalError()` (adapter) →
// envelope `internal-error` en stderr, stdout vacío.
import type { TokenMutationResultV1 } from "../../domain/token-mutations/result.js";
import { toTokenMutationInternalErrorEnvelope, toTokenMutationJsonEnvelope } from "../../application/token-mutations/json/index.js";
import type { TokenMutationJsonCommandV1 } from "../../application/token-mutations/json/dto.js";
import type { OutputWriter } from "./terminal-reporter.js";
import { serializeTokenMutationJsonV1 } from "./token-mutation-json-serializer.js";

export class TokenMutationJsonReporter {
  constructor(private readonly io: OutputWriter) {}

  planCompleted(result: TokenMutationResultV1): void {
    this.io.out(serializeTokenMutationJsonV1(toTokenMutationJsonEnvelope("token-plan", result)));
  }

  applyCompleted(result: TokenMutationResultV1): void {
    this.io.out(serializeTokenMutationJsonV1(toTokenMutationJsonEnvelope("token-apply", result)));
  }

  internalError(command: TokenMutationJsonCommandV1): void {
    this.io.err(serializeTokenMutationJsonV1(toTokenMutationInternalErrorEnvelope(command)));
  }
}
