// T020 (009) — Mappers explícitos hacia `ViewerJsonEnvelopeV1` (sin cast estructural). `formatVersion`
// es la primera clave (orden de inserción del objeto). Nunca expone bytes crudos, paths absolutos,
// `Error`/stack ni secretos — hereda las exclusiones de cada `ViewerXxxV1` anidado.
import type { ViewerSessionV1 } from "../session.js";
import type { ViewerSectionSummary } from "../navigation.js";
import { VIEWER_JSON_FORMAT_VERSION } from "./format-version.js";
import type { ViewerJsonEnvelopeV1 } from "./dto.js";

const NOTHING_TO_PROJECT = new Set(["not-found", "read-error"]);

/** Envelope de la sesión completa (`GET /api/session`); `data` es la sesión salvo not-found/read-error. */
export function toViewerSessionJsonEnvelope(session: ViewerSessionV1): ViewerJsonEnvelopeV1<ViewerSessionV1> {
  return {
    formatVersion: VIEWER_JSON_FORMAT_VERSION,
    section: "session",
    state: session.state,
    data: NOTHING_TO_PROJECT.has(session.state) ? null : session,
  };
}

/**
 * Envelope de una sección (`GET /api/section/:id`). En este checkpoint (C) solo se sirve el resumen ya
 * calculado en `navigation` (id/count/state); el detalle completo por categoría (tokens, swatches,
 * assets…) llega en los Checkpoints D/E sin cambiar esta forma de envelope, solo enriqueciendo `data`.
 */
export function toViewerSectionSummaryJsonEnvelope(summary: ViewerSectionSummary): ViewerJsonEnvelopeV1<ViewerSectionSummary> {
  return {
    formatVersion: VIEWER_JSON_FORMAT_VERSION,
    section: summary.id,
    state: summary.state,
    data: NOTHING_TO_PROJECT.has(summary.state) ? null : summary,
  };
}

/** Envelope de error interno (adapter): sin stack/cause/path absoluto; `internal-error` nunca es un
 * estado de dominio (nunca se representa como `read-error`; ver `ViewerJsonStateV1`). */
export function toViewerInternalErrorJsonEnvelope(section: ViewerJsonEnvelopeV1<unknown>["section"]): ViewerJsonEnvelopeV1<null> {
  return { formatVersion: VIEWER_JSON_FORMAT_VERSION, section, state: "internal-error", data: null };
}
