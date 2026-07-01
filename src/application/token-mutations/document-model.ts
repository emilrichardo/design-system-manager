// T009 (008) — Navegación y extracción sobre el documento DTCG (objeto plano). Puro: clona, nunca muta
// la entrada. Un token es un objeto con `$value`; un grupo es un objeto sin `$value`. Preserva claves
// desconocidas (`$extensions`, propiedades no gestionadas) y el orden de inserción.
import { joinPath, parentPath, segments } from "../../domain/token-mutations/paths.js";

export const NEURAZ_NS = "ar.neuraz.design-system-manager";

export type PlainDoc = Record<string, unknown>;

export function isPlainObject(value: unknown): value is PlainDoc {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function isTokenNode(node: unknown): node is PlainDoc {
  return isPlainObject(node) && Object.prototype.hasOwnProperty.call(node, "$value");
}

export function isGroupNode(node: unknown): node is PlainDoc {
  return isPlainObject(node) && !Object.prototype.hasOwnProperty.call(node, "$value");
}

/** Clona el documento de forma estructural (preserva orden de claves). */
export function cloneDoc(document: unknown): PlainDoc {
  return structuredClone(isPlainObject(document) ? document : {});
}

/** Devuelve el nodo en `path` o `undefined`. */
export function getNode(document: PlainDoc, path: string): unknown {
  let cur: unknown = document;
  for (const seg of segments(path)) {
    if (!isPlainObject(cur) || !Object.prototype.hasOwnProperty.call(cur, seg)) return undefined;
    cur = cur[seg];
  }
  return cur;
}

/** Crea (si faltan) los grupos ancestros de `path` y devuelve el contenedor del último segmento. */
export function ensureParent(document: PlainDoc, path: string): PlainDoc {
  let cur: PlainDoc = document;
  const segs = segments(path);
  for (let i = 0; i < segs.length - 1; i += 1) {
    const seg = segs[i] as string;
    const next = cur[seg];
    if (!isPlainObject(next)) {
      const created: PlainDoc = {};
      cur[seg] = created;
      cur = created;
    } else {
      cur = next;
    }
  }
  return cur;
}

/** Asigna `node` en `path` (creando grupos ancestros). */
export function setNode(document: PlainDoc, path: string, node: unknown): void {
  const container = ensureParent(document, path);
  const segs = segments(path);
  container[segs[segs.length - 1] as string] = node;
}

/** Elimina el nodo en `path` (si existe). Devuelve true si se eliminó. */
export function deleteNode(document: PlainDoc, path: string): boolean {
  const parent = parentPath(path);
  const container = parent === null ? document : getNode(document, parent);
  if (!isPlainObject(container)) return false;
  const name = segments(path).pop() as string;
  if (!Object.prototype.hasOwnProperty.call(container, name)) return false;
  delete container[name];
  return true;
}

/** ¿El grupo en `path` no tiene descendientes (token/grupo)? Solo claves `$…` cuentan como metadata. */
export function isEmptyGroup(node: PlainDoc): boolean {
  return Object.keys(node).every((k) => k.startsWith("$"));
}

export interface TokenSummary {
  readonly value: unknown;
  readonly type: string | null;
  readonly description: string | null;
  readonly aliasTarget: string | null;
  readonly category: string | null;
  readonly foundationLevel: string | null;
}

const ALIAS_RE = /^\{([^}]+)\}$/;

/** Extrae el target de alias de un `$value` con forma `{a.b.c}`, o `null`. */
export function aliasTargetOfValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = ALIAS_RE.exec(value.trim());
  return m ? (m[1] as string) : null;
}

function neurazCategory(node: PlainDoc): string | null {
  const ext = node.$extensions;
  if (!isPlainObject(ext)) return null;
  const ns = ext[NEURAZ_NS];
  if (!isPlainObject(ns)) return null;
  return typeof ns.category === "string" ? ns.category : null;
}

function neurazFoundationLevel(node: PlainDoc): string | null {
  const ext = node.$extensions;
  if (!isPlainObject(ext)) return null;
  const ns = ext[NEURAZ_NS];
  if (!isPlainObject(ns)) return null;
  const foundation = ns.foundation;
  if (!isPlainObject(foundation)) return null;
  return typeof foundation.level === "string" ? foundation.level : null;
}

/** Mapa plano path→resumen de cada token del documento, en orden del documento. */
export function tokenSummaryMap(document: PlainDoc): Map<string, TokenSummary> {
  const out = new Map<string, TokenSummary>();
  function walk(node: PlainDoc, prefix: string | null): void {
    for (const key of Object.keys(node)) {
      if (key.startsWith("$")) continue;
      const child = node[key];
      const path = joinPath(prefix, key);
      if (isTokenNode(child)) {
        out.set(path, {
          value: child.$value,
          type: typeof child.$type === "string" ? child.$type : null,
          description: typeof child.$description === "string" ? child.$description : null,
          aliasTarget: aliasTargetOfValue(child.$value),
          category: neurazCategory(child),
          foundationLevel: neurazFoundationLevel(child),
        });
      } else if (isGroupNode(child)) {
        walk(child, path);
      }
    }
  }
  walk(document, null);
  return out;
}

/** Conjunto de paths de grupos del documento. */
export function groupPaths(document: PlainDoc): Set<string> {
  const out = new Set<string>();
  function walk(node: PlainDoc, prefix: string | null): void {
    for (const key of Object.keys(node)) {
      if (key.startsWith("$")) continue;
      const child = node[key];
      if (isGroupNode(child)) {
        const path = joinPath(prefix, key);
        out.add(path);
        walk(child, path);
      }
    }
  }
  walk(document, null);
  return out;
}

/** Asigna la categoría Neuraz bajo `$extensions[NEURAZ_NS].category` (o la limpia con `null`). */
export function setNeurazCategory(node: PlainDoc, category: string | null): void {
  if (category === null) {
    const ext = node.$extensions;
    if (isPlainObject(ext) && isPlainObject(ext[NEURAZ_NS])) {
      delete (ext[NEURAZ_NS] as PlainDoc).category;
    }
    return;
  }
  const ext = isPlainObject(node.$extensions) ? (node.$extensions as PlainDoc) : (node.$extensions = {});
  const ns = isPlainObject(ext[NEURAZ_NS]) ? (ext[NEURAZ_NS] as PlainDoc) : (ext[NEURAZ_NS] = {});
  ns.category = category;
}

/** Asigna `$extensions[NEURAZ_NS].foundation.level` (o lo limpia con `null`). */
export function setFoundationLevel(node: PlainDoc, level: "primitive" | "semantic" | null): void {
  if (level === null) {
    const ext = node.$extensions;
    if (isPlainObject(ext) && isPlainObject(ext[NEURAZ_NS])) {
      const ns = ext[NEURAZ_NS] as PlainDoc;
      if (isPlainObject(ns.foundation)) {
        delete (ns.foundation as PlainDoc).level;
        if (Object.keys(ns.foundation as PlainDoc).length === 0) delete ns.foundation;
      }
    }
    return;
  }
  const ext = isPlainObject(node.$extensions) ? (node.$extensions as PlainDoc) : (node.$extensions = {});
  const ns = isPlainObject(ext[NEURAZ_NS]) ? (ext[NEURAZ_NS] as PlainDoc) : (ext[NEURAZ_NS] = {});
  const foundation = isPlainObject(ns.foundation) ? (ns.foundation as PlainDoc) : (ns.foundation = {});
  foundation.level = level;
}
