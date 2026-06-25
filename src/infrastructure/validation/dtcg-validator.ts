// T028 — Validador DTCG 2025.10 (ajv 2020-12 + comprobación de referencias y ciclos).
// Acotado al subconjunto necesario para `init`. No es un motor universal de resolución de tokens.
import type { Issue } from "../../domain/issue.js";
import { dtcgSchema } from "../../schemas/dtcg.schema.js";
import { compileSchema, toIssues } from "./json-schema-validator.js";

const validateStructure = compileSchema(dtcgSchema);

const ALIAS_RE = /^\{([^{}]+)\}$/;

interface Collected {
  /** path → $value (solo nodos token; el valor puede ser objeto de color o string de alias). */
  readonly tokens: Map<string, unknown>;
  /** paths de grupos (objetos sin $value). */
  readonly groups: Set<string>;
}

function collect(
  node: Record<string, unknown>,
  prefix: readonly string[],
  acc: Collected,
): void {
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith("$")) continue; // metadatos ($type/$value/$description)
    if (child === null || typeof child !== "object") continue;
    const obj = child as Record<string, unknown>;
    const path = [...prefix, key];
    if ("$value" in obj) {
      acc.tokens.set(path.join("."), obj.$value);
    } else {
      acc.groups.add(path.join("."));
      collect(obj, path, acc);
    }
  }
}

/** Valida estructura DTCG + referencias (existencia, malformación, ciclos). Devuelve Issues. */
export function validateDtcgDocument(doc: unknown): Issue[] {
  if (!validateStructure(doc)) {
    return toIssues(validateStructure.errors, "tokens");
  }

  const acc: Collected = { tokens: new Map(), groups: new Set() };
  collect(doc as Record<string, unknown>, [], acc);

  const issues: Issue[] = [];
  const edges = new Map<string, string>();

  for (const [path, value] of acc.tokens) {
    // Valor concreto de color: objeto sRGB (ya validado por el schema). No es referencia.
    if (typeof value === "object" && value !== null) continue;

    if (typeof value !== "string") {
      issues.push({ code: "dtcg-color-value-invalid", message: `El valor del token "${path}" debe ser un objeto de color sRGB o un alias.`, path });
      continue;
    }

    // Un valor concreto de color DEBE ser objeto: una cadena solo es válida como alias `{...}`.
    if (!value.includes("{") && !value.includes("}")) {
      issues.push({
        code: "dtcg-color-value-invalid",
        message: `Valor de color concreto inválido en "${path}": debe ser un objeto sRGB, no la cadena "${value}".`,
        path,
      });
      continue;
    }

    const m = ALIAS_RE.exec(value);
    if (m === null) {
      issues.push({ code: "dtcg-alias-malformed", message: `Alias malformado en "${path}": ${value}`, path });
      continue;
    }
    const target = m[1] as string;
    if (acc.tokens.has(target)) {
      edges.set(path, target);
    } else if (acc.groups.has(target)) {
      issues.push({ code: "dtcg-ref-not-token", message: `La referencia {${target}} en "${path}" apunta a un grupo, no a un token.`, path });
    } else {
      issues.push({ code: "dtcg-ref-missing", message: `Referencia inexistente {${target}} en "${path}".`, path });
    }
  }

  // Ciclos (directos e indirectos): seguir la cadena de aliases desde cada origen.
  for (const start of edges.keys()) {
    const seen = new Set<string>();
    let cur: string | undefined = start;
    while (cur !== undefined && edges.has(cur)) {
      if (seen.has(cur)) {
        issues.push({ code: "dtcg-cycle", message: `Ciclo de alias detectado desde "${start}".`, path: start });
        break;
      }
      seen.add(cur);
      cur = edges.get(cur);
    }
  }

  return issues;
}
