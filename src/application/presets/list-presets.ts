// T021 (005) — Proyección de listado de presets (capa de aplicación). Convierte envelopes ya
// interpretados a `PresetCatalogEntry[]` preservando el orden recibido (orden público del catálogo) y
// sin exponer rutas absolutas. La orquestación completa de `listPresets` (incl. `invalid-preset`) llega
// en el Checkpoint F; aquí solo vive la proyección pura reutilizable.
import type { PresetCatalogEntry, PresetEnvelope } from "../../domain/presets/preset-envelope.js";
import { toPresetCatalogEntry } from "../../domain/presets/preset-envelope.js";

/** Proyecta envelopes validados a entradas de catálogo (orden preservado; sin paths absolutos). */
export function presetCatalogEntries(
  envelopes: readonly PresetEnvelope[],
): readonly PresetCatalogEntry[] {
  return envelopes.map((envelope) => toPresetCatalogEntry(envelope));
}
