// T100 (006) — Reporter JSON de build. Para outcomes esperados escribe UN único `BuildJsonEnvelopeV1`
// en stdout con stderr vacío. `internalError` (adapter) escribe el envelope `internal-error` en stderr.
import type { BuildResult } from "../../domain/build-export/build-result.js";
import { buildInternalErrorJsonEnvelope, mapBuildResultToJsonEnvelope } from "../../application/build-export/build-json/map-build.js";
import type { OutputWriter } from "./terminal-reporter.js";
import { serializeBuildJsonV1 } from "./build-json-serializer.js";

export class BuildJsonReporter {
  constructor(private readonly io: OutputWriter) {}

  /** Outcome esperado de build → un envelope en stdout; stderr vacío. */
  completed(result: BuildResult): void {
    this.io.out(serializeBuildJsonV1(mapBuildResultToJsonEnvelope(result)));
  }

  /** Excepción inesperada (adapter) → envelope `internal-error` en stderr. */
  internalError(): void {
    this.io.err(serializeBuildJsonV1(buildInternalErrorJsonEnvelope()));
  }
}
