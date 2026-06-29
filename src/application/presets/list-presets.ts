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
 * Caso de uso headless de listado. Devuelve las entradas del catálogo en orden estable; nunca escribe
 * ni lanza. La orquestación rica que distingue `invalid-preset` por defecto de empaquetado se completa
 * en el Checkpoint F sobre el cargador rico del catálogo.
 */
export const listPresets: ListPresets = async (deps) => {
  const presets = await deps.catalog.list();
  return { outcome: "success", presets, validation: null };
};
