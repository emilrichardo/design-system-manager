import ts from "typescript";
import { describe, expect, it } from "vitest";
import { renderTypeScriptTokensArtifact } from "../../../src/infrastructure/build-export/ts-renderer.js";
import { setOf, tokenOf } from "../../infrastructure/build-export/ts-renderer-helpers.js";

function exportedNames(source: ts.SourceFile): string[] {
  const names: string[] = [];
  for (const statement of source.statements) {
    const isExported = statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    if (!isExported) continue;
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text);
      }
    } else if (ts.isTypeAliasDeclaration(statement)) {
      names.push(statement.name.text);
    } else {
      names.push(statement.kind.toString());
    }
  }
  return names;
}

describe("typescript artifact validation without execution (T065)", () => {
  it("parsea y transpila tokens.ts sin eval, imports dinámicos ni dependencias runtime", () => {
    const result = renderTypeScriptTokensArtifact(
      setOf([
        tokenOf({ path: "color.base", effectiveType: "color", value: "#0066ff", category: "color", foundationLevel: "primitive" }),
        tokenOf({ path: "spacing.md", effectiveType: "dimension", value: { value: 16, unit: "px" }, category: "spacing" }),
      ]),
    );
    expect(result.outcome).toBe("rendered");
    if (result.outcome !== "rendered") return;

    const text = new TextDecoder().decode(result.artifact.bytes);
    const diagnostics = ts.transpileModule(text, {
      reportDiagnostics: true,
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
      fileName: "tokens.ts",
    }).diagnostics ?? [];
    expect(diagnostics.map((diagnostic) => diagnostic.messageText)).toEqual([]);

    const source = ts.createSourceFile("tokens.ts", text, ts.ScriptTarget.ES2023, true, ts.ScriptKind.TS);
    expect(exportedNames(source)).toEqual(["tokens", "tokenMetadata", "TokenPath"]);
    expect(source.statements.some(ts.isImportDeclaration)).toBe(false);
    expect(source.statements.some(ts.isExportDeclaration)).toBe(false);
    expect(source.statements.some(ts.isFunctionDeclaration)).toBe(false);
    expect(source.statements.some(ts.isClassDeclaration)).toBe(false);
    expect(text).not.toContain("import(");
    expect(text).not.toContain("require(");
    expect(text).not.toContain("eval(");
    expect(text).not.toContain("Function(");
    expect(text).not.toContain("JSON.parse");
    expect(text).toContain("export type TokenPath = keyof typeof tokens;");
  });
});
