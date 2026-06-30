// Parser de argumentos del supervisor. Lista cerrada de flags; rechaza valores ambiguos.
import { AgentError } from "./repo.mjs";

const VALUE_FLAGS = new Set(["--feature", "--checkpoint", "--output", "--message", "--range"]);
const BOOL_FLAGS = new Set(["--json", "--commit", "--skip-tests", "--skip-build", "--quick"]);
const REPEATABLE = new Set(["--path"]);

/** Parsea argv (sin node/script). Devuelve { feature, checkpoint, json, ... , paths: [] }. */
export function parseArgs(argv) {
  const out = { json: false, commit: false, skipTests: false, skipBuild: false, quick: false, paths: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (BOOL_FLAGS.has(arg)) {
      out[camel(arg)] = true;
      continue;
    }
    if (REPEATABLE.has(arg)) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) throw new AgentError(`Falta valor para ${arg}.`);
      out.paths.push(value);
      i += 1;
      continue;
    }
    if (VALUE_FLAGS.has(arg)) {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith("--")) throw new AgentError(`Falta valor para ${arg}.`);
      out[camel(arg)] = value;
      i += 1;
      continue;
    }
    // Soporte `--flag=value`.
    const eq = arg.indexOf("=");
    if (arg.startsWith("--") && eq > 2) {
      const key = arg.slice(0, eq);
      const value = arg.slice(eq + 1);
      if (VALUE_FLAGS.has(key)) {
        out[camel(key)] = value;
        continue;
      }
      if (REPEATABLE.has(key)) {
        out.paths.push(value);
        continue;
      }
    }
    throw new AgentError(`Argumento no reconocido o ambiguo: ${arg}`);
  }
  return out;
}

function camel(flag) {
  return flag.replace(/^--/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
