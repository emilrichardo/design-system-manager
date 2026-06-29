// T062 (006) — Serializer de literales TypeScript JSON-safe. Es puro, no evalúa código generado y
// rechaza cualquier valor que `JSON.stringify` omitiría o degradaría silenciosamente.
export interface TypeScriptLiteralError {
  readonly code: "typescript-literal-invalid";
  readonly tokenPath: string | null;
  readonly message: string;
}

export type TypeScriptLiteralResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly error: TypeScriptLiteralError };

function invalidError(tokenPath: string | null, detail: string): TypeScriptLiteralError {
  return {
    code: "typescript-literal-invalid",
    tokenPath,
    message: tokenPath === null ? detail : `Valor TypeScript no soportado en ${tokenPath}: ${detail}.`,
  };
}

function invalid(tokenPath: string | null, detail: string): TypeScriptLiteralResult {
  return {
    ok: false,
    error: invalidError(tokenPath, detail),
  };
}

function isPlainRecord(value: object): value is Record<string, unknown> {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function isArrayIndexKey(key: string, length: number): boolean {
  if (!/^(0|[1-9]\d*)$/.test(key)) return false;
  const index = Number(key);
  return Number.isSafeInteger(index) && index >= 0 && index < length && String(index) === key;
}

function validateJsonSafeValue(value: unknown, tokenPath: string | null, seen: Set<object>): TypeScriptLiteralError | null {
  if (value === null || typeof value === "string" || typeof value === "boolean") return null;
  if (typeof value === "number") return Number.isFinite(value) ? null : invalidError(tokenPath, "number no finito");
  if (typeof value === "bigint") return invalidError(tokenPath, "bigint no soportado");
  if (typeof value === "symbol") return invalidError(tokenPath, "symbol no soportado");
  if (typeof value === "function") return invalidError(tokenPath, "function no soportada");
  if (value === undefined) return invalidError(tokenPath, "undefined no soportado");

  if (typeof value !== "object") return invalidError(tokenPath, `tipo ${typeof value} no soportado`);
  if (seen.has(value)) return invalidError(tokenPath, "valor cíclico");
  if (Object.getOwnPropertySymbols(value).length > 0) return invalidError(tokenPath, "symbols no soportados");

  seen.add(value);
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if ("get" in descriptor || "set" in descriptor) {
        return invalidError(tokenPath, `accessor no soportado en propiedad ${key}`);
      }
    }

    if (Array.isArray(value)) {
      for (const key of Object.keys(value)) {
        if (!isArrayIndexKey(key, value.length)) return invalidError(tokenPath, `propiedad extra no soportada en array: ${key}`);
      }
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.prototype.hasOwnProperty.call(value, index)) {
          return invalidError(tokenPath, `array sparse en índice ${index}`);
        }
        const entryError = validateJsonSafeValue(value[index], tokenPath, seen);
        if (entryError !== null) return entryError;
      }
      return null;
    }

    if (!isPlainRecord(value)) return invalidError(tokenPath, "instancia no JSON-safe");
    for (const [key, entry] of Object.entries(value)) {
      const entryError = validateJsonSafeValue(entry, tokenPath, seen);
      if (entryError !== null) return invalidError(tokenPath, `propiedad ${key}: ${entryError.message}`);
    }
    return null;
  } finally {
    seen.delete(value);
  }
}

function escapeScriptClosing(text: string): string {
  return text.replace(/<\/script/gi, "<\\/script");
}

function escapeLineSeparators(text: string): string {
  return text.replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

export function serializeTypeScriptLiteral(value: unknown, tokenPath: string | null = null): TypeScriptLiteralResult {
  const validationError = validateJsonSafeValue(value, tokenPath, new Set());
  if (validationError !== null) return { ok: false, error: validationError };

  const json = JSON.stringify(value);
  if (json === undefined) return invalid(tokenPath, "valor no serializable");

  return { ok: true, text: escapeScriptClosing(escapeLineSeparators(json)) };
}
