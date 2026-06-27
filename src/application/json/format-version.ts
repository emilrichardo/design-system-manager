// T001 (003) — Versión del contrato JSON público. Constante canónica, ÚNICA fuente de verdad,
// inmutable e independiente de `package.json`/`package.version`. Semver del FORMATO (no del paquete):
// patch = fix de serialización; minor = campos opcionales nuevos; major = cambios incompatibles.
// Capa de aplicación: tipo de transporte puro, sin Node/CLI/exit-codes (ADR-0011).

/** Versión del formato JSON v1. Literal estable `"1.0.0"`. */
export const JSON_FORMAT_VERSION = "1.0.0";

/** Tipo literal de la versión de formato (útil en los envelopes). */
export type JsonFormatVersion = typeof JSON_FORMAT_VERSION;
