// T008/T009 (011) — Registro puro de packs y su preset base obligatorio (contracts/preset-web-complete.md
// R2: "Packs son add-only sobre `web-complete`, nunca sobre `neutral-base` ni un Design System arbitrario").
// Un pack es, mecánicamente, otra entrada del mismo catálogo de presets (motor de `005` sin cambios); este
// registro solo añade la precondición de "preset base ya aplicado" antes de delegar en el motor existente.
import type { PresetId } from "./preset-id.js";

export const PACK_BASE_PRESET: Readonly<Record<string, PresetId>> = {
  commerce: "web-complete" as PresetId,
};

export function requiredBasePreset(packId: string): PresetId | null {
  return PACK_BASE_PRESET[packId] ?? null;
}

export function isKnownPack(packId: string): boolean {
  return packId in PACK_BASE_PRESET;
}
