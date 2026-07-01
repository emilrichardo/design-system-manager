// T020 (009) — DTO público del envelope JSON del Viewer (`contracts/viewer-json-envelope-v1.contract.md`).
// Independiente del `JsonEnvelopeV1` de `003` y de los envelopes de `004`/`006`/`007`/`008`.
import type { ViewerSectionId } from "../navigation.js";
import type { ViewerStateV1 } from "../session.js";
import type { ViewerJsonFormatVersion } from "./format-version.js";

/** `"session"` cuando el envelope transporta la sesión completa; una `ViewerSectionId` para un detalle. */
export type ViewerJsonSection = ViewerSectionId | "session";

/** `internal-error` existe SOLO en la frontera del adapter HTTP (excepción inesperada), nunca como
 * estado de dominio — mismo patrón que `002`–`008` (nunca se representa como `read-error`/otro estado). */
export type ViewerJsonStateV1 = ViewerStateV1 | "internal-error";

/**
 * Envelope JSON del Viewer. `data` es `null` cuando `state` es `not-found`/`read-error`/`internal-error`
 * (nada que proyectar), o cuando el detalle de una sección todavía no está disponible en este checkpoint.
 */
export interface ViewerJsonEnvelopeV1<Data> {
  readonly formatVersion: ViewerJsonFormatVersion;
  readonly section: ViewerJsonSection;
  readonly state: ViewerJsonStateV1;
  readonly data: Data | null;
}
