// Base AJV (JSON Schema 2020-12) compartida por los validadores de infraestructura.
// Normaliza los errores de AJV a `Issue` estables (sin filtrar estructuras internas de AJV).
import { Ajv2020 } from "ajv/dist/2020.js";
import type { ErrorObject, ValidateFunction } from "ajv";
import type { Issue } from "../../domain/issue.js";

const ajv = new Ajv2020({ allErrors: true, strict: false });

export function compileSchema(schema: object): ValidateFunction {
  return ajv.compile(schema);
}

export function toIssues(
  errors: readonly ErrorObject[] | null | undefined,
  source: string,
): Issue[] {
  return (errors ?? []).map((e) => ({
    code: `schema:${source}`,
    message: e.message ?? "estructura inválida",
    path: `${source}${e.instancePath}`,
  }));
}
