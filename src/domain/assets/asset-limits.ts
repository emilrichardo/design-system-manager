// T029 (007) — Límites canónicos del Asset Manager (dominio puro). Acotan tamaño por archivo, total del
// store, cantidad de assets y longitud de path. Surfacing como `too-large`/`path-unsafe` en el plan.
export interface AssetLimits {
  readonly maxFileBytes: number;
  readonly maxTotalBytes: number;
  readonly maxAssets: number;
  readonly maxPathLength: number;
}

/** Límites por defecto v1 (alineados con el orden de magnitud de los límites de análisis). */
export const ASSET_LIMITS: AssetLimits = Object.freeze({
  maxFileBytes: 16 * 1024 * 1024, // 16 MiB por archivo
  maxTotalBytes: 128 * 1024 * 1024, // 128 MiB de store administrado
  maxAssets: 1000,
  maxPathLength: 1024,
});
