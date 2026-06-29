// T023 (003) — Helper de frontera CLI para el error interno en modo JSON. Conoce `command` (lo provee
// el handler, sin husmear `process.argv`) y escribe UNA vez el envelope seguro en stderr. Reutiliza el
// mapper headless (application) y el serializer (infrastructure). No expone el error original
// (stack/cause/path/mensaje crudo) — el mapper ya garantiza un mensaje fijo (ADR-0013).
import { toJsonInternalErrorEnvelope } from "../application/json/map-internal-error.js";
import type { JsonCommand } from "../application/json/dto.js";
import { serializeJsonV1 } from "../infrastructure/reporter/json-serializer.js";
import { toPresetsInternalErrorEnvelope } from "../application/presets/json/map-internal-error.js";
import type { PresetsJsonCommandV1 } from "../application/presets/json/dto.js";
import { serializePresetsJsonV1 } from "../infrastructure/reporter/presets-json-serializer.js";
import type { CliIO } from "./io.js";

/** Escribe el envelope de error interno JSON en stderr (una sola escritura). */
export function writeInternalErrorJson(io: CliIO, command: JsonCommand): void {
  io.err(serializeJsonV1(toJsonInternalErrorEnvelope(command)));
}

// T096 (005) — Error interno JSON PROPIO de presets (envelope/serializer separados de 003/004; sin cast
// a sus uniones). Escribe una sola vez en stderr; stdout queda vacío; el exit 70 lo decide el llamador.
export function writePresetsInternalErrorJson(io: CliIO, command: PresetsJsonCommandV1): void {
  io.err(serializePresetsJsonV1(toPresetsInternalErrorEnvelope(command)));
}
