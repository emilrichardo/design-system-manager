// T023 (011) — Proyección pública `ViewerComponentGroupV1` (data-model.md `ComponentTokenGroupV1`).
// Agrupa los tokens con `layer === "component"` (TokenLayerV1 de T002) por `component`/`part`/
// `variant`/`state`/`size` ya declarados en `$extensions`. Esta vista todavía representa component
// tokens, NO el catálogo anatómico completo de `012` (sin slots/behaviors/anatomy files).
//
// Es PURA sobre insumos ya cargados por la misma sesión (snapshot de 006 + capas derivadas por
// `projectTokenLayers` de T013). Nunca reescribe tokens ni recomputa aliases.
import type { TokenLayerV1 } from "../../domain/token-mutations/token-layer.js";
import type { ViewerTokenV1 } from "./token.js";

/** Token component individual dentro de un grupo (path + metadata declarada + valor resuelto). */
export interface ViewerComponentTokenV1 {
  readonly path: string;
  readonly component: string;
  readonly part: string | null;
  readonly variant: string | null;
  readonly state: string | null;
  readonly size: string | null;
  readonly property: string | null;
  readonly token: ViewerTokenV1;
}

/** Una celda de una matriz (variant×state, size×variant, part×property). `paths` contiene los tokens
 * que caen en la combinación de esta celda (puede ser >1 o 0 — nunca se fabrica cartesiano). */
export interface ViewerComponentMatrixCellV1 {
  readonly row: string;
  readonly column: string;
  readonly paths: readonly string[];
}

export interface ViewerComponentMatrixV1 {
  readonly kind: "variant-state" | "size-variant" | "part-property";
  readonly rows: readonly string[];
  readonly columns: readonly string[];
  readonly cells: readonly ViewerComponentMatrixCellV1[];
}

/** Un grupo de component tokens (por `component`). `variants`/`states`/`sizes` contienen SOLO los
 * valores declarados (nunca el cartesiano completo); las matrices se generan solo cuando aportan
 * claridad (≥1 fila y ≥1 columna con al menos una celda poblada). */
export interface ViewerComponentGroupV1 {
  readonly component: string;
  readonly parts: readonly string[];
  readonly variants: readonly string[];
  readonly states: readonly string[];
  readonly sizes: readonly string[];
  readonly tokens: readonly ViewerComponentTokenV1[];
  readonly matrices: readonly ViewerComponentMatrixV1[];
}

/** Insumos para `projectComponents`. `layersByPath` ya calculado por `projectTokenLayers` (T013);
 * `tokensByPath` ya proyectados por `projectToken` (T003/009) para la misma sesión. */
export interface ProjectComponentsInput {
  readonly layersByPath: ReadonlyMap<string, TokenLayerV1 | null>;
  readonly tokensByPath: ReadonlyMap<string, ViewerTokenV1>;
}

function dedupeSorted(values: readonly string[]): readonly string[] {
  return Object.freeze(Array.from(new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0))).sort());
}

function componentOf(layer: TokenLayerV1 | null): string | null {
  if (layer === null) return null;
  return typeof layer.component === "string" && layer.component.length > 0 ? layer.component : null;
}

/** Proyecta los grupos de component tokens. Un token SIN metadata de capa o con `layer !== "component"`
 * nunca aparece aquí (no es un component token); los component tokens SIN `component` declarado se
 * agrupan bajo el placeholder `"(unspecified)"` para que la UI pueda señalar el gap (sin fallar). */
export function projectComponents(input: ProjectComponentsInput): readonly ViewerComponentGroupV1[] {
  const { layersByPath, tokensByPath } = input;
  const componentTokens: ViewerComponentTokenV1[] = [];

  for (const [path, layer] of layersByPath) {
    if (layer === null || layer.layer !== "component") continue;
    const token = tokensByPath.get(path);
    if (token === undefined) continue;
    componentTokens.push({
      path,
      component: componentOf(layer) ?? "(unspecified)",
      part: layer.part,
      variant: layer.variant,
      state: layer.state,
      size: layer.size,
      property: layer.property,
      token,
    });
  }

  if (componentTokens.length === 0) return Object.freeze([]);

  const byComponent = new Map<string, ViewerComponentTokenV1[]>();
  for (const token of componentTokens) {
    const bucket = byComponent.get(token.component) ?? [];
    bucket.push(token);
    byComponent.set(token.component, bucket);
  }

  const groups: ViewerComponentGroupV1[] = [];
  for (const [component, tokens] of byComponent) {
    const parts = dedupeSorted(tokens.map((token) => token.part ?? ""));
    const variants = dedupeSorted(tokens.map((token) => token.variant ?? ""));
    const states = dedupeSorted(tokens.map((token) => token.state ?? ""));
    const sizes = dedupeSorted(tokens.map((token) => token.size ?? ""));
    const properties = dedupeSorted(tokens.map((token) => token.property ?? ""));

    const matrices: ViewerComponentMatrixV1[] = [];
    const variantState = buildMatrix(tokens, "variant-state", (token) => token.variant ?? "", (token) => token.state ?? "");
    if (variantState !== null) matrices.push(variantState);
    const sizeVariant = buildMatrix(tokens, "size-variant", (token) => token.size ?? "", (token) => token.variant ?? "");
    if (sizeVariant !== null) matrices.push(sizeVariant);
    const partProperty = buildMatrix(tokens, "part-property", (token) => token.part ?? "", (token) => token.property ?? "");
    if (partProperty !== null) matrices.push(partProperty);

    groups.push(
      Object.freeze({
        component,
        parts,
        variants,
        states,
        sizes,
        tokens: Object.freeze(tokens),
        matrices: Object.freeze(matrices),
      }),
    );
  }

  // Orden canónico: por nombre de componente (determinista, sin depender del orden de inserción del Map).
  groups.sort((left, right) => left.component.localeCompare(right.component));
  return Object.freeze(groups);
}

function buildMatrix(
  tokens: readonly ViewerComponentTokenV1[],
  kind: ViewerComponentMatrixV1["kind"],
  rowOf: (token: ViewerComponentTokenV1) => string,
  columnOf: (token: ViewerComponentTokenV1) => string,
): ViewerComponentMatrixV1 | null {
  const rows = dedupeSorted(tokens.map(rowOf));
  const columns = dedupeSorted(tokens.map(columnOf));
  if (rows.length === 0 || columns.length === 0) return null;
  const cells: ViewerComponentMatrixCellV1[] = [];
  for (const row of rows) {
    for (const column of columns) {
      const paths = tokens
        .filter((token) => rowOf(token) === row && columnOf(token) === column)
        .map((token) => token.path);
      if (paths.length === 0) continue;
      cells.push(Object.freeze({ row, column, paths: Object.freeze(paths) }));
    }
  }
  if (cells.length === 0) return null;
  return Object.freeze({ kind, rows, columns, cells: Object.freeze(cells) });
}
