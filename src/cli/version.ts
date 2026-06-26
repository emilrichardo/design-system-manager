// Versión de la CLI obtenida del package.json del paquete (fuente coherente).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function readCliVersion(): string {
  try {
    const url = new URL("../../package.json", import.meta.url);
    const pkg = JSON.parse(readFileSync(fileURLToPath(url), "utf8")) as { version?: unknown };
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}
