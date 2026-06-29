// T021 (005) — Proyección de listado de presets (capa de aplicación). Convierte envelopes ya
// interpretados a `PresetCatalogEntry[]` preservando el orden recibido (orden público del catálogo) y
// sin exponer rutas absolutas. La orquestación completa de `listPresets` (incl. `invalid-preset`) llega
// en el Checkpoint F; aquí solo vive la proyección pura reutilizable.
import type { PresetCatalogEntry, PresetEnvelope } from "../../domain/presets/preset-envelope.js";
import { toPresetCatalogEntry } from "../../domain/presets/preset-envelope.js";
import type { ListPresets } from "./preset-ports.js";

/** Proyecta envelopes validados a entradas de catálogo (orden preservado; sin paths absolutos). */
export function presetCatalogEntries(
  envelopes: readonly PresetEnvelope[],
): readonly PresetCatalogEntry[] {
  return envelopes.map((envelope) => toPresetCatalogEntry(envelope));
}

/**
 * Caso de uso headless de listado (T054). Usa la carga RICA del catálogo para preservar la causa: un
 * catálogo empaquetado inválido/ilegible produce `invalid-preset` (no una lista vacía). Orden estable,
 * offline, sin lectura del host ni escrituras. No lanza ni expone `Error`/paths absolutos.
 */
export const listPresets: ListPresets = async (deps) => {
  const loaded = await deps.catalog.load();
  if (!loaded.ok) return { outcome: "invalid-preset", presets: [], validation: null };
  return { outcome: "success", presets: loaded.entries, validation: null };
};
