// T038 (004) - Reporter JSON foundations: solo completed escribe una vez en stdout.
import type { FoundationsReporter, FoundationsResult } from "../../application/foundations/foundations-ports.js";
import { toFoundationsJsonEnvelope } from "../../application/foundations/json/map-foundations.js";
import { serializeFoundationsJsonV1 } from "./foundations-json-serializer.js";
import type { OutputWriter } from "./terminal-reporter.js";

export class FoundationsJsonReporter implements FoundationsReporter {
  constructor(private readonly io: OutputWriter) {}

  hostResolved(): void {
    // no-op: la salida JSON se emite unicamente en `completed`.
  }

  structuralStateDetected(): void {
    // no-op.
  }

  inspected(): void {
    // no-op.
  }

  completed(result: FoundationsResult): void {
    this.io.out(serializeFoundationsJsonV1(toFoundationsJsonEnvelope(result)));
  }
}
