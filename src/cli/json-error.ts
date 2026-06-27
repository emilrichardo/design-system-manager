// T023 (003) — Helper de frontera CLI para el error interno en modo JSON. Conoce `command` (lo provee
// el handler, sin husmear `process.argv`) y escribe UNA vez el envelope seguro en stderr. Reutiliza el
// mapper headless (application) y el serializer (infrastructure). No expone el error original
// (stack/cause/path/mensaje crudo) — el mapper ya garantiza un mensaje fijo (ADR-0013).
import { toJsonInternalErrorEnvelope } from "../application/json/map-internal-error.js";
import type { JsonCommand } from "../application/json/dto.js";
import { serializeJsonV1 } from "../infrastructure/reporter/json-serializer.js";
import type { CliIO } from "./io.js";

/** Escribe el envelope de error interno JSON en stderr (una sola escritura). */
export function writeInternalErrorJson(io: CliIO, command: JsonCommand): void {
  io.err(serializeJsonV1(toJsonInternalErrorEnvelope(command)));
}
