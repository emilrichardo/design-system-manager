// T019 (004) — Validador foundation de dependencias. Usa exclusivamente la proyección de tokens
// ya enriquecida por 002 (aliasTarget/aliasState); no lee `$value` ni resuelve aliases desde el AST.
import { analysisError } from "../../domain/analysis/analysis-issue.js";
import { FOUNDATION_ISSUE_CODES, type FoundationIssue } from "../../domain/foundations/foundation-issue.js";
import type { FoundationTokenInspection } from "./foundations-ports.js";

function issueKey(sourcePath: string, targetPath: string): string {
  return `${FOUNDATION_ISSUE_CODES.forbiddenDependency}\u0000${sourcePath}\u0000${targetPath}`;
}

/**
 * Prohíbe que un token `primitive` dependa de un `semantic`, incluso si la relación es transitiva vía
 * una cadena de aliases primitive. Los alias problemáticos quedan en 002; aquí se corta la caminata.
 */
export function validateFoundationDependencies(
  tokens: readonly FoundationTokenInspection[],
): readonly FoundationIssue[] {
  const byPath = new Map(tokens.map((token) => [token.path, token]));
  const emitted = new Set<string>();
  const issues: FoundationIssue[] = [];

  for (const source of tokens) {
    if (
      source.level !== "primitive" ||
      source.kind !== "alias" ||
      source.aliasState !== "valid" ||
      source.aliasTarget === null
    ) {
      continue;
    }

    const visited = new Set<string>([source.path]);
    let targetPath: string | null = source.aliasTarget;
    while (targetPath !== null) {
      if (visited.has(targetPath)) break;
      visited.add(targetPath);

      const target = byPath.get(targetPath);
      if (target === undefined) break;

      if (target.level === "semantic" && target.category !== "unresolved") {
        const key = issueKey(source.path, target.path);
        if (!emitted.has(key)) {
          emitted.add(key);
          issues.push(analysisError(
            FOUNDATION_ISSUE_CODES.forbiddenDependency,
            `Token foundation primitive "${source.path}" no puede depender de semantic "${target.path}".`,
            { document: "tokens", path: source.path },
          ));
        }
        break;
      }

      if (
        target.level !== "primitive" ||
        target.kind !== "alias" ||
        target.aliasState !== "valid" ||
        target.aliasTarget === null
      ) {
        break;
      }

      targetPath = target.aliasTarget;
    }
  }

  return issues;
}
