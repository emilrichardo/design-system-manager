// T017–T019 (008) — Validación determinista del comando contra una simulación del estado (las
// operaciones se evalúan en orden; una operación posterior puede depender de una anterior). Detecta
// invalid-path, token-exists, token-not-found, group-not-found, alias-not-found, invalid-dtcg-value,
// alias-cycle, alias-to-group, type-mismatch, rename/move collision, parent-descendant-conflict,
// removal-with-dependents y group-removal-non-empty. Nunca resuelve en silencio. Puro.
import type { TokenMutationCommandV1 } from "../../domain/token-mutations/command.js";
import { issue, type MutationIssue } from "../../domain/token-mutations/outcome.js";
import { isSafeTokenPath, isWithin, joinPath, lastSegment, parentPath, rewritePrefix } from "../../domain/token-mutations/paths.js";
import { groupPaths, type PlainDoc } from "./document-model.js";
import { checkGroupRemoval, checkRemovalDependents } from "./removal-policy.js";
import type { AnalyzedTokenSource } from "./ports.js";

interface TokenState {
  declaredType: string | null;
  aliasTarget: string | null;
}

/** Estado mutable simulado durante la validación. */
class WorkingState {
  readonly tokens = new Map<string, TokenState>();
  readonly groups = new Set<string>();

  static from(source: AnalyzedTokenSource): WorkingState {
    const s = new WorkingState();
    for (const p of source.tokenPaths()) s.tokens.set(p, { declaredType: source.effectiveType(p), aliasTarget: source.aliasTargetOf(p) });
    for (const g of groupPaths(source.document as PlainDoc)) s.groups.add(g);
    return s;
  }

  hasAny(p: string): boolean {
    return this.tokens.has(p) || this.groups.has(p);
  }

  allPaths(): string[] {
    return [...this.tokens.keys(), ...this.groups];
  }

  /** Reescribe todos los paths (token y grupo) con prefijo `from`→`to` (rename/move de token o grupo). */
  rewritePrefixState(from: string, to: string): void {
    for (const [p, st] of [...this.tokens]) {
      const np = rewritePrefix(p, from, to);
      if (np !== p) {
        this.tokens.delete(p);
        this.tokens.set(np, st);
      }
    }
    for (const g of [...this.groups]) {
      const ng = rewritePrefix(g, from, to);
      if (ng !== g) {
        this.groups.delete(g);
        this.groups.add(ng);
      }
    }
  }

  effectiveType(path: string): string | null {
    const seen = new Set<string>();
    let cur = path;
    for (;;) {
      if (seen.has(cur)) return null;
      seen.add(cur);
      const st = this.tokens.get(cur);
      if (st === undefined) return null;
      if (st.aliasTarget === null) return st.declaredType;
      cur = st.aliasTarget;
    }
  }

  /** ¿Aliasar `path`→`target` crea un ciclo? */
  aliasCreatesCycle(path: string, target: string): boolean {
    const seen = new Set<string>([path]);
    let cur = target;
    for (;;) {
      if (cur === path) return true;
      if (seen.has(cur)) return false;
      seen.add(cur);
      const st = this.tokens.get(cur);
      if (st === undefined || st.aliasTarget === null) return false;
      cur = st.aliasTarget;
    }
  }
}

function isJsonSafe(value: unknown): boolean {
  if (value === undefined) return false;
  const t = typeof value;
  if (t === "function" || t === "symbol" || t === "bigint") return false;
  if (value === null || t === "string" || t === "number" || t === "boolean") return true;
  if (Array.isArray(value)) return value.every(isJsonSafe);
  if (t === "object") return Object.values(value as Record<string, unknown>).every(isJsonSafe);
  return false;
}

/** Valida el comando completo; devuelve issues ordenados (por code, luego path). */
export function validateCommand(source: AnalyzedTokenSource, command: TokenMutationCommandV1): MutationIssue[] {
  const state = WorkingState.from(source);
  const removedInCommand = new Set<string>();
  const issues: MutationIssue[] = [];
  const add = (i: MutationIssue | null): void => {
    if (i) issues.push(i);
  };
  const badPath = (p: string): boolean => {
    if (!isSafeTokenPath(p)) {
      add(issue("invalid-path", p, `Path lógico inseguro: ${p}.`));
      return true;
    }
    return false;
  };

  for (const op of command.operations) {
    switch (op.kind) {
      case "create-token": {
        if (badPath(op.path)) break;
        if (state.hasAny(op.path)) add(issue("token-exists", op.path, `Ya existe un nodo en ${op.path}.`));
        else {
          if (!isJsonSafe(op.value)) add(issue("invalid-dtcg-value", op.path, `Valor DTCG no serializable en ${op.path}.`));
          state.tokens.set(op.path, { declaredType: op.type, aliasTarget: null });
        }
        break;
      }
      case "update-value": {
        if (!state.tokens.has(op.path)) add(issue("token-not-found", op.path, `Token inexistente: ${op.path}.`));
        else if (!isJsonSafe(op.value)) add(issue("invalid-dtcg-value", op.path, `Valor DTCG no serializable en ${op.path}.`));
        break;
      }
      case "update-type": {
        const st = state.tokens.get(op.path);
        if (!st) add(issue("token-not-found", op.path, `Token inexistente: ${op.path}.`));
        else st.declaredType = op.type;
        break;
      }
      case "update-description":
      case "update-category": {
        if (!state.tokens.has(op.path)) add(issue("token-not-found", op.path, `Token inexistente: ${op.path}.`));
        break;
      }
      case "set-alias": {
        const st = state.tokens.get(op.path);
        if (!st) {
          add(issue("token-not-found", op.path, `Token inexistente: ${op.path}.`));
          break;
        }
        if (state.groups.has(op.target)) add(issue("alias-to-group", op.path, `El target ${op.target} es un grupo, no un token.`));
        else if (!state.tokens.has(op.target)) add(issue("alias-not-found", op.path, `Alias target inexistente: ${op.target}.`));
        else if (state.aliasCreatesCycle(op.path, op.target)) add(issue("alias-cycle", op.path, `El alias ${op.path}→${op.target} crearía un ciclo.`));
        else {
          const targetType = state.effectiveType(op.target);
          if (st.declaredType !== null && targetType !== null && st.declaredType !== targetType) {
            add(issue("type-mismatch", op.path, `Tipo incompatible: ${op.path} (${st.declaredType}) vs ${op.target} (${targetType}).`));
          }
          st.aliasTarget = op.target;
        }
        break;
      }
      case "remove-alias": {
        const st = state.tokens.get(op.path);
        if (!st) add(issue("token-not-found", op.path, `Token inexistente: ${op.path}.`));
        else if (st.aliasTarget === null) add(issue("alias-not-found", op.path, `${op.path} no es un alias.`));
        else st.aliasTarget = null;
        break;
      }
      case "rename-token": {
        if (!state.tokens.has(op.path)) {
          add(issue("token-not-found", op.path, `Token inexistente: ${op.path}.`));
          break;
        }
        const dest = joinPath(parentPath(op.path), op.newName);
        if (badPath(dest)) break;
        if (state.hasAny(dest)) add(issue("rename-collision", dest, `El destino ${dest} ya existe.`));
        else state.rewritePrefixState(op.path, dest);
        break;
      }
      case "move-token": {
        if (!state.tokens.has(op.path)) {
          add(issue("token-not-found", op.path, `Token inexistente: ${op.path}.`));
          break;
        }
        if (!state.groups.has(op.newParent)) add(issue("group-not-found", op.newParent, `Grupo destino inexistente: ${op.newParent}.`));
        else {
          const dest = joinPath(op.newParent, lastSegment(op.path));
          if (state.hasAny(dest)) add(issue("move-collision", dest, `El destino ${dest} ya existe.`));
          else state.rewritePrefixState(op.path, dest);
        }
        break;
      }
      case "duplicate-token": {
        if (!state.tokens.has(op.path)) add(issue("token-not-found", op.path, `Token inexistente: ${op.path}.`));
        else if (badPath(op.destinationPath)) break;
        else if (state.hasAny(op.destinationPath)) add(issue("token-exists", op.destinationPath, `Ya existe un nodo en ${op.destinationPath}.`));
        else state.tokens.set(op.destinationPath, { declaredType: state.tokens.get(op.path)?.declaredType ?? null, aliasTarget: state.tokens.get(op.path)?.aliasTarget ?? null });
        break;
      }
      case "remove-token": {
        if (!state.tokens.has(op.path)) {
          add(issue("token-not-found", op.path, `Token inexistente: ${op.path}.`));
          break;
        }
        add(checkRemovalDependents(op.path, source.dependentsOf(op.path), removedInCommand));
        removedInCommand.add(op.path);
        state.tokens.delete(op.path);
        break;
      }
      case "create-group": {
        if (badPath(op.path)) break;
        if (state.tokens.has(op.path)) add(issue("token-exists", op.path, `Existe un token en ${op.path}; no es un grupo.`));
        else state.groups.add(op.path);
        break;
      }
      case "rename-group": {
        if (!state.groups.has(op.path)) {
          add(issue("group-not-found", op.path, `Grupo inexistente: ${op.path}.`));
          break;
        }
        const dest = joinPath(parentPath(op.path), op.newName);
        if (badPath(dest)) break;
        if (state.hasAny(dest)) add(issue("rename-collision", dest, `El destino ${dest} ya existe.`));
        else state.rewritePrefixState(op.path, dest);
        break;
      }
      case "move-group": {
        if (!state.groups.has(op.path)) {
          add(issue("group-not-found", op.path, `Grupo inexistente: ${op.path}.`));
          break;
        }
        const dest = joinPath(op.newParent, lastSegment(op.path));
        if (isWithin(op.path, op.newParent)) add(issue("parent-descendant-conflict", op.path, `No se puede mover ${op.path} dentro de sí mismo.`));
        else if (!state.groups.has(op.newParent)) add(issue("group-not-found", op.newParent, `Grupo destino inexistente: ${op.newParent}.`));
        else if (state.hasAny(dest)) add(issue("move-collision", dest, `El destino ${dest} ya existe.`));
        else state.rewritePrefixState(op.path, dest);
        break;
      }
      case "remove-empty-group": {
        if (!state.groups.has(op.path)) add(issue("group-not-found", op.path, `Grupo inexistente: ${op.path}.`));
        else {
          add(checkGroupRemoval(op.path, state.allPaths()));
          state.groups.delete(op.path);
        }
        break;
      }
      default: {
        const _exhaustive: never = op;
        void _exhaustive;
      }
    }
  }

  return issues.sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : a.path === b.path ? 0 : (a.path ?? "") < (b.path ?? "") ? -1 : 1));
}
