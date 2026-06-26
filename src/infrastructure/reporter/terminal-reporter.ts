// T042 — Adapter del puerto Reporter para terminal. Traduce eventos semánticos a texto legible
// (comprensible sin color). stdout: plan/éxito/unchanged/cancelación; stderr: conflictos/fallos.
// No es una TUI. No usa color obligatorio. No altera el resultado del dominio.
import type { Reporter, InitializationSummary } from "../../application/ports.js";
import type { HostRoot } from "../../application/ports.js";
import type { PreviousState } from "../../domain/state/previous-state.js";
import type { InitializationResult } from "../../domain/result/initialization-result.js";

/** Escritor de líneas estructural (compatible con CliIO, sin acoplar la capa CLI). */
export interface OutputWriter {
  out(text: string): void;
  err(text: string): void;
}

export class TerminalReporter implements Reporter {
  private lastState: PreviousState | undefined;

  constructor(private readonly io: OutputWriter) {}

  hostResolved(host: HostRoot): void {
    this.io.out(`Raíz anfitriona: ${host.rootDir}\n`);
  }

  previousStateDetected(state: PreviousState): void {
    this.lastState = state;
  }

  planPrepared(summary: InitializationSummary): void {
    const { identity, files, conflicts } = summary;
    const lines = [
      "Plan de inicialización:",
      `  Nombre:  ${identity.name}`,
      `  Slug:    ${identity.slug}`,
      `  Versión: ${identity.version}`,
      ...(identity.description !== undefined ? [`  Descripción: ${identity.description}`] : []),
      `  Raíz anfitriona: ${summary.hostRoot.rootDir}`,
      "  Archivos a crear:",
      ...files.map((f) => `    - ${f}`),
      `  Conflictos: ${conflicts.length === 0 ? "ninguno" : conflicts.join(", ")}`,
    ];
    this.io.out(`${lines.join("\n")}\n`);
  }

  completed(result: InitializationResult): void {
    switch (result.status) {
      case "created":
        this.io.out(`Design System inicializado correctamente. Archivos creados:\n${result.files.map((f) => `  - ${f}`).join("\n")}\n`);
        return;
      case "unchanged":
        this.io.out(`El Design System ya está inicializado en: ${result.reason}. No se realizaron cambios.\n`);
        return;
      case "cancelled":
        this.io.out("Operación cancelada. No se realizaron cambios.\n");
        return;
      case "conflict":
        this.io.err(`Conflicto: ya existen artefactos administrados. Resuélvelos antes de continuar.\n`);
        this.renderPartialDetail();
        this.io.err(`  Rutas en conflicto: ${result.conflicts.join(", ")}\n`);
        return;
      case "failed":
        this.io.err(`Error (${result.category}):\n${result.errors.map((e) => `  - [${e.code}] ${e.message}${e.path !== undefined ? ` (${e.path})` : ""}`).join("\n")}\n`);
        return;
    }
  }

  /** Para `partial`, muestra presentes y obligatorios ausentes registrados en el estado previo. */
  private renderPartialDetail(): void {
    if (this.lastState?.kind === "partial") {
      this.io.err(`  Presentes: ${this.lastState.present.join(", ") || "ninguno"}\n`);
      this.io.err(`  Ausentes obligatorios: ${this.lastState.missing.join(", ") || "ninguno"}\n`);
    }
  }
}
