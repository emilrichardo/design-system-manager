// T040 (005) — Mapeo del preset (resúmenes de token ya validados por el Checkpoint C) al modelo
// genérico reutilizable `TokenChangeSet` (capa de aplicación). Es una NORMALIZACIÓN sin host: proyecta
// la contribución del preset como candidatos `create` (grupos padre antes que los tokens), de forma
// determinista. NO compara contra un Design System, NO calcula diff, NO clasifica unchanged/conflict/
// update (eso es el planner del Checkpoint E); el mismo modelo podrá producirlo un importador futuro.
import type { PresetTokenNode } from "./preset-ports.js";
import type { FoundationCategoryId } from "../../domain/foundations/foundation-category.js";
import type { TokenChange } from "../../domain/changes/token-change.js";
import { createTokenChangeSet } from "../../domain/changes/token-change-set.js";
import type { TokenChangeSetResult } from "../../domain/changes/token-change-set.js";

/**
 * Normaliza los nodos de un preset validado a un conjunto de cambios candidatos `create` (grupos
 * padre + tokens). Devuelve el resultado tipado de `createTokenChangeSet` (ordenado/validado). No
 * adjunta el fragmento DTCG (`proposedToken: null`): la construcción del documento candidato con
 * valores reales corresponde al Checkpoint H. Los nodos sin categoría resoluble se omiten (un preset
 * válido no los tiene).
 */
export function normalizePresetChangeSet(nodes: readonly PresetTokenNode[]): TokenChangeSetResult {
  const changes: TokenChange[] = [];
  const groupSeen = new Set<string>();

  for (const node of nodes) {
    if (node.category === "unresolved") continue;
    const category: FoundationCategoryId = node.category;
    const segments = node.path.split(".");

    for (let i = 1; i < segments.length; i += 1) {
      const groupPath = segments.slice(0, i).join(".");
      if (groupSeen.has(groupPath)) continue;
      groupSeen.add(groupPath);
      changes.push({
        path: groupPath,
        nodeKind: "group",
        category,
        level: "unclassified",
        operation: "create",
        reason: "preset-group-candidate",
        blocksWrite: false,
        conflict: null,
        proposedToken: null,
      });
    }

    changes.push({
      path: node.path,
      nodeKind: "token",
      category,
      level: node.level,
      operation: "create",
      reason: "preset-token-candidate",
      blocksWrite: false,
      conflict: null,
      proposedToken: null,
    });
  }

  return createTokenChangeSet(changes);
}
