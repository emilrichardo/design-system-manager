// Alcance de archivos por feature/checkpoint. La política NO es rígida: si no hay configuración ni
// paths explícitos, el alcance es "todo permitido" (null) para no bloquear features nuevas.
// Prioridad: paths explícitos (args) > config.scope[feature][checkpoint|"*"] > null (sin restricción).

/** Convierte un glob sencillo (`**`, `*`) a RegExp anclado. */
export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += ".*";
        i += 1;
        if (glob[i + 1] === "/") i += 1; // `**/` consume la barra
      } else {
        re += "[^/]*";
      }
    } else if ("\\^$.|?+()[]{}".includes(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  return new RegExp(`^${re}$`);
}

/**
 * Resuelve los globs permitidos. Devuelve `null` si no hay restricción.
 * @param {{config?:{scope?:Record<string,Record<string,string[]>>}, feature:string, checkpoint?:string, explicitPaths?:string[]}} opts
 */
export function resolveAllowedGlobs(opts) {
  const explicit = opts.explicitPaths ?? [];
  if (explicit.length > 0) return explicit.slice();
  const scope = opts.config?.scope?.[opts.feature];
  if (scope) {
    if (opts.checkpoint && Array.isArray(scope[opts.checkpoint])) return scope[opts.checkpoint].slice();
    if (Array.isArray(scope["*"])) return scope["*"].slice();
  }
  return null; // sin restricción
}

/**
 * Calcula la deriva de alcance: archivos cambiados que no encajan en ningún glob permitido.
 * tasks.md de la feature y los untracked permitidos quedan siempre exentos.
 * @param {string[]} changedFiles @param {string[]|null} allowedGlobs @param {{alwaysAllow?:string[]}} [opts]
 */
export function computeScopeDrift(changedFiles, allowedGlobs, opts = {}) {
  if (allowedGlobs === null) return [];
  const exempt = new Set(opts.alwaysAllow ?? []);
  const matchers = allowedGlobs.map(globToRegExp);
  return changedFiles.filter((f) => !exempt.has(f) && !matchers.some((m) => m.test(f)));
}
