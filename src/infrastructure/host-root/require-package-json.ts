// T020 — Verificación de package.json (ADR-0001): presencia, archivo regular, legible, JSON válido.
// NO modifica package.json, NO ejecuta gestores, NO agrega dependencias.
import { readFileSync, statSync } from "node:fs";
import type { HostError } from "../../application/ports.js";

export type VerifyResult = { readonly ok: true } | { readonly ok: false; readonly error: HostError };

function fail(code: HostError["code"], message: string, path: string): VerifyResult {
  return { ok: false, error: { code, message, path } };
}

/** Verifica que `packageJsonPath` exista, sea archivo regular, legible y contenga JSON válido. */
export function verifyPackageJson(packageJsonPath: string): VerifyResult {
  let st;
  try {
    st = statSync(packageJsonPath);
  } catch {
    return fail("package-json-missing", "No se encontró package.json en el proyecto anfitrión.", packageJsonPath);
  }
  if (!st.isFile()) {
    return fail("unexpected-file-type", "package.json no es un archivo regular.", packageJsonPath);
  }
  let text: string;
  try {
    text = readFileSync(packageJsonPath, "utf8");
  } catch {
    return fail("package-json-unreadable", "package.json no se puede leer.", packageJsonPath);
  }
  try {
    JSON.parse(text);
  } catch {
    return fail("package-json-invalid", "package.json no contiene JSON válido.", packageJsonPath);
  }
  return { ok: true };
}
