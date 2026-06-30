// Configuración global opcional del supervisor (.agent-supervisor.json). SOLO defaults y reglas
// globales — NUNCA estado de tareas ni comandos arbitrarios. Si está presente, debe ser un archivo
// regular (no symlink) con una forma validada; cualquier clave desconocida se rechaza.
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT, AgentError } from "./repo.mjs";

export const DEFAULT_ALLOWED_UNTRACKED = [".agents/skills/speckit-agent-context-update/"];

export const DEFAULT_GATES = { typecheck: true, lint: true, test: true, build: true, diffcheck: true };

const ALLOWED_KEYS = new Set(["allowedUntracked", "gates", "scope"]);
const ALLOWED_GATE_KEYS = new Set(["typecheck", "lint", "test", "build", "diffcheck"]);

function defaults() {
  return {
    allowedUntracked: [...DEFAULT_ALLOWED_UNTRACKED],
    gates: { ...DEFAULT_GATES },
    scope: {},
  };
}

/** Carga y valida la configuración. Devuelve defaults si el archivo no existe. */
export function loadConfig(repoRoot = REPO_ROOT) {
  const path = join(repoRoot, ".agent-supervisor.json");
  if (!existsSync(path)) return defaults();

  const st = lstatSync(path);
  if (st.isSymbolicLink()) throw new AgentError(".agent-supervisor.json no puede ser un symlink.");
  if (!st.isFile()) throw new AgentError(".agent-supervisor.json no es un archivo regular.");

  let raw;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new AgentError(".agent-supervisor.json no es JSON válido.");
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new AgentError(".agent-supervisor.json debe ser un objeto.");
  }
  for (const key of Object.keys(raw)) {
    if (!ALLOWED_KEYS.has(key)) throw new AgentError(`Clave no permitida en .agent-supervisor.json: ${key}`);
  }

  const config = defaults();
  if (raw.allowedUntracked !== undefined) {
    if (!Array.isArray(raw.allowedUntracked) || raw.allowedUntracked.some((x) => typeof x !== "string")) {
      throw new AgentError("allowedUntracked debe ser un array de strings.");
    }
    config.allowedUntracked = raw.allowedUntracked.slice();
  }
  if (raw.gates !== undefined) {
    if (typeof raw.gates !== "object" || raw.gates === null || Array.isArray(raw.gates)) {
      throw new AgentError("gates debe ser un objeto de banderas booleanas.");
    }
    for (const [k, v] of Object.entries(raw.gates)) {
      if (!ALLOWED_GATE_KEYS.has(k)) throw new AgentError(`Gate desconocido en config: ${k}`);
      if (typeof v !== "boolean") throw new AgentError(`gates.${k} debe ser booleano.`);
      config.gates[k] = v;
    }
  }
  if (raw.scope !== undefined) {
    if (typeof raw.scope !== "object" || raw.scope === null || Array.isArray(raw.scope)) {
      throw new AgentError("scope debe ser un objeto por feature.");
    }
    // scope: { "<feature>": { "<checkpoint>": ["glob", ...], "*": [...] } }
    config.scope = raw.scope;
  }
  return config;
}
