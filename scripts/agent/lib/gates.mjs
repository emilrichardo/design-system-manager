// Gates: lista CERRADA de comandos permitidos. NUNCA se ejecutan comandos provenientes de tasks.md ni
// de configuración arbitraria; solo estas claves fijas. La configuración únicamente habilita/inhabilita.
import { execFileSync } from "node:child_process";
import { REPO_ROOT } from "./repo.mjs";

/** Definición cerrada de gates (clave → argv exacto). */
export const GATE_DEFS = Object.freeze({
  typecheck: ["npm", "run", "typecheck"],
  lint: ["npm", "run", "lint"],
  test: ["npm", "test"],
  build: ["npm", "run", "build"],
  diffcheck: ["git", "diff", "--check"],
});

export const GATE_ORDER = ["typecheck", "lint", "test", "build", "diffcheck"];

/**
 * Selecciona los gates a ejecutar y los omitidos (con motivo).
 * @param {{config?:{gates?:Record<string,boolean>}, skipTests?:boolean, skipBuild?:boolean, quick?:boolean}} opts
 */
export function selectGates(opts = {}) {
  const enabled = opts.config?.gates ?? {};
  const run = [];
  const skipped = [];
  for (const key of GATE_ORDER) {
    if (enabled[key] === false) {
      skipped.push({ key, reason: "deshabilitado en configuración" });
      continue;
    }
    if (opts.quick && (key === "test" || key === "build")) {
      skipped.push({ key, reason: "--quick" });
      continue;
    }
    if (opts.skipTests && key === "test") {
      skipped.push({ key, reason: "--skip-tests" });
      continue;
    }
    if (opts.skipBuild && key === "build") {
      skipped.push({ key, reason: "--skip-build" });
      continue;
    }
    run.push(key);
  }
  return { run, skipped };
}

/** Ejecuta un gate por su clave (solo de la lista cerrada). Devuelve {key,passed,tail}. */
export function runGate(key, cwd = REPO_ROOT) {
  const argv = GATE_DEFS[key];
  if (!argv) return { key, passed: false, tail: `gate desconocido: ${key}` };
  try {
    execFileSync(argv[0], argv.slice(1), { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { key, passed: true, tail: "" };
  } catch (e) {
    const out = `${String(e?.stdout ?? "")}${String(e?.stderr ?? "")}`;
    const tail = out.split("\n").slice(-12).join("\n").slice(-1200);
    return { key, passed: false, tail };
  }
}

/** Ejecuta una lista de gates en orden; corta-circuito opcional desactivado (ejecuta todos). */
export function runGates(keys, cwd = REPO_ROOT) {
  return keys.map((k) => runGate(k, cwd));
}
