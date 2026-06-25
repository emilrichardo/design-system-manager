// Issue: dato estructurado de error/advertencia, reutilizable por validación y resultados.
// No contiene texto de terminal ni colores ANSI (Constitución VII; preparación TUI/MCP).
export interface Issue {
  /** Código estable y discriminable (p. ej. "slug-invalid", "dtcg-ref-missing"). */
  readonly code: string;
  /** Mensaje legible, independiente de la presentación. */
  readonly message: string;
  /** Ruta o ubicación relacionada, cuando aplica. */
  readonly path?: string;
}
