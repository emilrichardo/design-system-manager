// Resolución de la raíz del repositorio para el supervisor de agentes.
// Esta lib vive en scripts/agent/lib/, por lo que la raíz está 3 niveles arriba. Puede sobreescribirse
// con AGENT_SUPERVISOR_ROOT (útil para tests sobre repos temporales y para operar otro checkout).
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const envRoot = process.env.AGENT_SUPERVISOR_ROOT;

/** Raíz del repositorio (absoluta). */
export const REPO_ROOT = envRoot ? resolve(envRoot) : fileURLToPath(new URL("../../../", import.meta.url));

/** Error de uso/estado del supervisor (se reporta de forma limpia, sin stack en salida pública). */
export class AgentError extends Error {
  /** @param {string} message @param {Record<string, unknown>} [details] */
  constructor(message, details = {}) {
    super(message);
    this.name = "AgentError";
    this.details = details;
  }
}
