// T022/T032/T033/T045 (009) — UI del Viewer: TypeScript vanilla + DOM, SIN framework ni dependencia
// runtime nueva (ADR-0026). Compilado por el mismo `tsc` del proyecto (ESM válido para `<script
// type="module">`, sin bundler). `fetch` solo contra `http://127.0.0.1:<port>/api/**` (mismo origen —
// nunca CDN/host remoto, ver offline). Los tipos importados son SOLO de tipo (`import type`, se borran en
// compilación): no crean una dependencia en tiempo de ejecución de esta UI hacia la capa de aplicación.
import type { ViewerColorV1 } from "../../../application/viewer/color.js";
import type { ViewerTypographyV1 } from "../../../application/viewer/typography.js";
import type { ViewerFoundationV1 } from "../../../application/viewer/foundation.js";
import type { ViewerTokenV1 } from "../../../application/viewer/token.js";
import type { ViewerIssueV1 } from "../../../application/viewer/issue.js";
import type { ViewerBrandV1, ViewerBrandAssetGroupV1, ViewerBrandProfileV1 } from "../../../application/viewer/brand.js";
import type { ViewerComponentGroupV1, ViewerComponentMatrixV1 } from "../../../application/viewer/components.js";
import type { ViewerQualityV1 } from "../../../application/viewer/quality.js";
import type { EditorReviewV1, EditorIssueV1 } from "../../../application/editor/review.js";
import type { TokenMutationDiffEntry } from "../../../domain/token-mutations/diff.js";

interface ViewerJsonEnvelopeLike {
  readonly formatVersion: string;
  readonly section: string;
  readonly state: string;
  readonly data: unknown;
}

interface EditorJsonEnvelopeLike {
  readonly formatVersion: string;
  readonly action: string;
  readonly state: string;
  readonly data: unknown;
  readonly error: { readonly code: string; readonly message: string } | null;
}

function contentRegion(): HTMLElement | null {
  return document.getElementById("content");
}

function clear(el: HTMLElement): void {
  el.replaceChildren();
}

function heading(text: string): HTMLHeadingElement {
  const h = document.createElement("h2");
  h.textContent = text;
  return h;
}

function statusParagraph(text: string): HTMLParagraphElement {
  const p = document.createElement("p");
  p.textContent = text;
  return p;
}

async function fetchJson(path: string): Promise<ViewerJsonEnvelopeLike | null> {
  try {
    const res = await fetch(path, { method: "GET" });
    if (!res.ok) return null;
    return (await res.json()) as ViewerJsonEnvelopeLike;
  } catch {
    return null;
  }
}

async function fetchEditorJson(path: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<EditorJsonEnvelopeLike | null> {
  try {
    const init: RequestInit = { method };
    if (body !== undefined) {
      init.headers = { "content-type": "application/json" };
      init.body = JSON.stringify(body);
    }
    const res = await fetch(path, init);
    if (!res.ok) return null;
    return (await res.json()) as EditorJsonEnvelopeLike;
  } catch {
    return null;
  }
}

/** Texto para un valor DTCG resuelto sin asumir su forma (JSON compacto como último recurso). */
function describeValue(value: unknown): string {
  if (value === null || value === undefined) return "(none)";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "(unrepresentable value)";
  }
}

/** Fila accesible para un token genérico (spacing/radius/borders/shadows/motion): nunca depende solo del color. */
function tokenRow(token: ViewerTokenV1): HTMLLIElement {
  const li = document.createElement("li");
  const label = document.createElement("span");
  label.className = "token-path";
  label.textContent = token.path;
  const level = document.createElement("span");
  level.className = "token-level";
  level.textContent = ` [${token.level}]`;
  const value = document.createElement("span");
  value.className = "token-value";
  value.textContent = ` = ${describeValue(token.resolvedValue)}`;
  li.append(label, level, value);
  if (token.description !== null) {
    const desc = document.createElement("p");
    desc.className = "token-description";
    desc.textContent = token.description;
    li.append(desc);
  }
  return li;
}

function renderFoundationCategory(el: HTMLElement, foundation: ViewerFoundationV1): void {
  el.append(heading(`${foundation.id} (${foundation.state})`));
  if (foundation.tokens.length === 0) {
    el.append(statusParagraph("No tokens in this category yet."));
    return;
  }
  const list = document.createElement("ul");
  list.setAttribute("aria-label", `${foundation.id} tokens`);
  for (const token of foundation.tokens) list.append(tokenRow(token));
  el.append(list);
  if (foundation.issues.length > 0) el.append(renderIssuesList(foundation.issues));
}

function swatchRow(color: ViewerColorV1): HTMLLIElement {
  const li = document.createElement("li");
  const swatch = document.createElement("span");
  swatch.className = "swatch";
  swatch.setAttribute("aria-hidden", "true"); // decorativo: el texto siguiente ya transmite el valor
  if (color.swatch.sRgb !== null) {
    const { r, g, b } = color.swatch.sRgb;
    swatch.style.backgroundColor = `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`;
  }
  const label = document.createElement("span");
  label.textContent = ` ${color.token.path} — ${describeValue(color.swatch.resolvedValue)}`;
  if (color.swatch.sRgb === null) label.textContent += " (not computable as sRGB)";
  li.append(swatch, label);
  return li;
}

function renderColors(el: HTMLElement, colors: readonly ViewerColorV1[]): void {
  el.append(heading("Colors"));
  if (colors.length === 0) {
    el.append(statusParagraph("No color tokens yet."));
    return;
  }
  const list = document.createElement("ul");
  list.setAttribute("aria-label", "Color tokens");
  for (const color of colors) list.append(swatchRow(color));
  el.append(list);
}

function typographyRow(entry: ViewerTypographyV1): HTMLLIElement {
  const li = document.createElement("li");
  const preview = document.createElement("p");
  preview.className = "typography-preview";
  preview.textContent = entry.token.path;
  const details = document.createElement("p");
  if (entry.kind === "font-family") {
    if (entry.family !== null) preview.style.fontFamily = entry.family;
    details.textContent = `family=${entry.family ?? "(none)"} match=${entry.matchState}`;
  } else if (entry.kind === "typography-composite") {
    if (entry.family !== null) preview.style.fontFamily = entry.family;
    if (entry.size !== null) preview.style.fontSize = describeValue(entry.size);
    details.textContent = `family=${entry.family ?? "(none)"} weight=${entry.weight ?? "(none)"} style=${entry.style ?? "(none)"} match=${entry.matchState}`;
  } else {
    details.textContent = `value=${describeValue(entry.value)}`;
  }
  li.append(preview, details);
  if ("matchedAssets" in entry && entry.matchedAssets.length > 0) {
    const assets = document.createElement("p");
    assets.textContent = `assets=${entry.matchedAssets.map((asset) => asset.logicalPath).join(", ")}`;
    li.append(assets);
  }
  return li;
}

function renderTypography(el: HTMLElement, entries: readonly ViewerTypographyV1[]): void {
  el.append(heading("Typography"));
  if (entries.length === 0) {
    el.append(statusParagraph("No typography tokens yet."));
    return;
  }
  const list = document.createElement("ul");
  list.setAttribute("aria-label", "Typography tokens");
  for (const entry of entries) list.append(typographyRow(entry));
  el.append(list);
}

function renderIssuesList(issues: readonly ViewerIssueV1[]): HTMLUListElement {
  const list = document.createElement("ul");
  list.setAttribute("aria-label", "Issues");
  for (const issue of issues) {
    const li = document.createElement("li");
    li.textContent = `[${issue.severity}] ${issue.code}${issue.path !== null ? ` (${issue.path})` : ""} — ${issue.message}`;
    list.append(li);
  }
  return list;
}

function renderGeneric(el: HTMLElement, id: string, state: string, data: unknown): void {
  el.append(heading(`${id} (${state})`));
  if (data === null) {
    el.append(statusParagraph("No data available for this section yet."));
    return;
  }
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(data, null, 2);
  el.append(pre);
}

const EDITOR_VALUE_TYPES = ["color", "number", "dimension", "fontFamily", "fontWeight", "duration", "cubicBezier", "string", "boolean"] as const;

function labeledInput(id: string, labelText: string, type = "text", value = ""): HTMLInputElement {
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = labelText;
  const input = document.createElement("input");
  input.id = id;
  input.name = id;
  input.type = type;
  input.value = value;
  label.append(input);
  return input;
}

function labeledSelect(id: string, labelText: string, values: readonly string[]): HTMLSelectElement {
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = labelText;
  const select = document.createElement("select");
  select.id = id;
  select.name = id;
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  }
  label.append(select);
  return select;
}

function appendFormField(form: HTMLFormElement, control: HTMLElement): void {
  form.append(control.parentElement ?? control);
}

function editorCommand(operations: readonly Record<string, unknown>[]): Record<string, unknown> {
  return { formatVersion: "1.0.0", operations };
}

// T025/T026/T027/T028 — Diff visual (read-only, determinista), paneles de conflicts/warnings y controles
// de aprobación (approve/cancel/back-to-edit). El diff/plan SIEMPRE viene de `planTokenMutation` (008) vía
// `/api/editor/plan`; esta UI nunca reconstruye ni recalcula nada, solo lo presenta.
function diffEntryRow(entry: TokenMutationDiffEntry): HTMLLIElement {
  const li = document.createElement("li");
  const from = entry.previousPath !== null ? ` (from ${entry.previousPath})` : "";
  const refs = entry.references.length > 0 ? ` — updates references: ${entry.references.join(", ")}` : "";
  const before = entry.before !== null ? ` before=${describeValue(entry.before)}` : "";
  const after = entry.after !== null ? ` after=${describeValue(entry.after)}` : "";
  li.textContent = `[${entry.kind}] ${entry.path}${from}${before}${after}${refs}`;
  return li;
}

function issueRow(issue: EditorIssueV1): HTMLLIElement {
  const li = document.createElement("li");
  const deps = issue.dependents.length > 0 ? ` — dependents: ${issue.dependents.join(", ")}` : "";
  li.textContent = `[${issue.severity}] ${issue.code}${issue.path !== null ? ` (${issue.path})` : ""} — ${issue.message}${deps}`;
  return li;
}

/**
 * Renderiza el panel de revisión completo: resumen del diff (por categoría, igual que
 * `TokenMutationDiffSummary`), entradas del diff (por operación/por token), conflicts (bloqueantes) y
 * warnings (no bloqueantes, visibles hasta la aprobación), y los controles approve/cancel/back-to-edit.
 * `approve` queda deshabilitado salvo `review.canApprove` (nunca aplica automáticamente).
 */
function renderReviewPanel(
  container: HTMLElement,
  review: EditorReviewV1,
  callbacks: { readonly onApprove: () => void | Promise<void>; readonly onCancel: () => void; readonly onBackToEdit: () => void },
): void {
  clear(container);
  const heading3 = document.createElement("h3");
  heading3.id = "editor-review-title";
  heading3.textContent = `Plan review: ${review.state}`;
  container.setAttribute("aria-labelledby", heading3.id);
  container.setAttribute("aria-live", "polite");
  container.append(heading3);

  const outcome = document.createElement("p");
  outcome.textContent = `Outcome: ${review.plan.outcome}. Writable: ${review.plan.writable ? "yes" : "no"}. Operations: ${review.plan.operationsCount}.`;
  container.append(outcome);

  if (review.expiredPlan) {
    container.append(statusParagraph("This plan is expired: the source may have changed. Generate a new plan before approving."));
  }

  const diff = review.diff;
  if (diff === null || diff.isEmpty) {
    container.append(statusParagraph(diff === null ? "No diff available for this plan." : "This command produces no changes (empty diff)."));
  } else {
    const s = diff.summary;
    container.append(
      statusParagraph(
        `Diff summary: added=${s.added} updated=${s.updated} renamed=${s.renamed} moved=${s.moved} removed=${s.removed} aliasChanged=${s.aliasChanged} metadataChanged=${s.metadataChanged} groupChanged=${s.groupChanged}`,
      ),
    );
    const list = document.createElement("ul");
    list.setAttribute("aria-label", "Diff entries (read-only)");
    for (const entry of diff.entries) list.append(diffEntryRow(entry));
    container.append(list);
  }

  const blocking = review.plan.issues.filter((i) => i.blocksApply);
  const warnings = review.plan.issues.filter((i) => !i.blocksApply);
  if (blocking.length > 0) {
    const blockingHeading = document.createElement("h4");
    blockingHeading.textContent = "Conflicts (blocking)";
    const list = document.createElement("ul");
    list.setAttribute("aria-label", "Blocking conflicts");
    for (const issue of blocking) list.append(issueRow(issue));
    container.append(blockingHeading, list);
  }
  if (warnings.length > 0) {
    // Los warnings no bloqueantes permanecen visibles hasta la aprobación (nunca se ocultan).
    const warningsHeading = document.createElement("h4");
    warningsHeading.textContent = "Warnings (non-blocking)";
    const list = document.createElement("ul");
    list.setAttribute("aria-label", "Non-blocking warnings");
    for (const issue of warnings) list.append(issueRow(issue));
    container.append(warningsHeading, list);
  }

  const actions = document.createElement("div");
  const approveButton = document.createElement("button");
  approveButton.type = "button";
  approveButton.textContent = "Approve";
  approveButton.disabled = !review.canApprove; // los planes bloqueados/expirados nunca pueden aprobarse
  approveButton.addEventListener("click", callbacks.onApprove);
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", callbacks.onCancel);
  const backButton = document.createElement("button");
  backButton.type = "button";
  backButton.textContent = "Back to edit";
  backButton.addEventListener("click", callbacks.onBackToEdit);
  actions.append(approveButton, cancelButton, backButton);
  container.append(actions);
}

function renderDraftPreview(status: HTMLElement, output: HTMLPreElement, command: Record<string, unknown>, reviewPanel: HTMLElement): void {
  status.textContent = "Draft ready. Generate a plan to review the diff before approval.";
  output.textContent = JSON.stringify(command, null, 2);
  output.focus();
  // T028 — cualquier cambio de draft invalida un review previo: nunca se deja un plan obsoleto visible
  // junto a un draft distinto del que lo produjo; hay que generar un plan nuevo.
  clear(reviewPanel);
}

function editorForm(titleText: string): HTMLFormElement {
  const form = document.createElement("form");
  const title = document.createElement("h3");
  title.textContent = titleText;
  form.append(title);
  return form;
}

// T041/T042 — validación local mínima (sin dependencia runtime hacia `application/editor`: la UI
// importa esa capa SOLO por tipo, ver cabecera del archivo) para asociar errores por control con
// `aria-describedby`/`aria-invalid`, alineada con las mismas reglas de `parseEditorValueInput` (008/010).
function validateTypedValue(valueType: string, value: string, unit: string): { readonly ok: boolean; readonly message: string } {
  if (valueType === "color") return value.trim().length > 0 ? { ok: true, message: "" } : { ok: false, message: "Color value is required." };
  if (valueType === "number" || valueType === "fontWeight") {
    return Number.isFinite(Number(value)) && value.trim() !== "" ? { ok: true, message: "" } : { ok: false, message: "Enter a finite number." };
  }
  if (valueType === "dimension") {
    if (!Number.isFinite(Number(value)) || value.trim() === "") return { ok: false, message: "Enter a finite dimension value." };
    return ["px", "rem", "em", "%"].includes(unit) ? { ok: true, message: "" } : { ok: false, message: "Choose a supported dimension unit (px, rem, em, %)." };
  }
  if (valueType === "duration") {
    if (!Number.isFinite(Number(value)) || value.trim() === "") return { ok: false, message: "Enter a finite duration value." };
    return ["ms", "s"].includes(unit) ? { ok: true, message: "" } : { ok: false, message: "Choose a supported duration unit (ms, s)." };
  }
  if (valueType === "cubicBezier") {
    const parts = value.split(",").map((part) => Number(part.trim()));
    return parts.length === 4 && parts.every(Number.isFinite) ? { ok: true, message: "" } : { ok: false, message: "Enter exactly 4 comma-separated numbers (x1,y1,x2,y2)." };
  }
  if (valueType === "fontFamily" || valueType === "string") {
    return value.trim().length > 0 ? { ok: true, message: "" } : { ok: false, message: "A value is required." };
  }
  return { ok: true, message: "" };
}

function parseTypedValue(valueType: string, value: string, unit: string, booleanValue: boolean): unknown {
  if (valueType === "number" || valueType === "fontWeight") {
    const number = Number(value);
    return Number.isFinite(number) ? number : value;
  }
  if (valueType === "dimension" || valueType === "duration") {
    const number = Number(value);
    return { value: Number.isFinite(number) ? number : value, unit };
  }
  if (valueType === "cubicBezier") return value.split(",").map((part) => Number(part.trim()));
  if (valueType === "boolean") return booleanValue;
  return value;
}

function renderEditorDraftForms(section: HTMLElement): void {
  const formStatus = document.createElement("p");
  formStatus.id = "editor-form-status";
  formStatus.setAttribute("aria-live", "polite");
  formStatus.textContent = "Editor forms create drafts only. Generate a plan to review the diff before approval.";
  const output = document.createElement("pre");
  output.tabIndex = -1;
  output.setAttribute("aria-label", "Editor draft JSON");

  const reviewPanel = document.createElement("div");
  reviewPanel.id = "editor-review-panel";

  let currentCommand: Record<string, unknown> | null = null;
  const preview = (command: Record<string, unknown>): void => {
    currentCommand = command;
    renderDraftPreview(formStatus, output, command, reviewPanel);
  };

  const planForm = editorForm("Plan review");
  const planStatus = document.createElement("p");
  planStatus.id = "editor-plan-status";
  planStatus.setAttribute("aria-live", "polite");
  const planButton = document.createElement("button");
  planButton.type = "button";
  planButton.textContent = "Generate plan";
  planButton.addEventListener("click", async () => {
    if (currentCommand === null) {
      planStatus.textContent = "Create a draft above before generating a plan.";
      return;
    }
    planStatus.textContent = "Generating plan...";
    const envelope = await fetchEditorJson("/api/editor/plan", "POST", currentCommand);
    if (envelope === null || envelope.data === null) {
      planStatus.textContent = "Could not generate a plan for this draft.";
      clear(reviewPanel);
      return;
    }
    planStatus.textContent = "";
    const review = envelope.data as EditorReviewV1;
    renderReviewPanel(reviewPanel, review, {
      onApprove: async () => {
        if (currentCommand === null) return;
        planStatus.textContent = "Applying...";
        const applyEnvelope = await fetchEditorJson("/api/editor/apply", "POST", currentCommand);
        if (applyEnvelope === null || applyEnvelope.data === null) {
          planStatus.textContent = "Could not apply this plan. The draft and any earlier commit are unaffected.";
          return;
        }
        const data = applyEnvelope.data as {
          readonly apply: {
            readonly state: string;
            readonly recovery: { readonly sourceAvailable: boolean; readonly backupRelativePath: string | null; readonly recoveryRequired: boolean } | null;
          };
          readonly refresh: { readonly state: string };
        };
        let message = EDITOR_APPLY_STATE_MESSAGES[data.apply.state] ?? `Apply result: ${data.apply.state}.`;
        // T036 — backup/recovery visibles como texto explícito, nunca solo mediante un estado codificado por color.
        if (data.apply.recovery !== null) {
          const r = data.apply.recovery;
          message += r.backupRelativePath !== null ? ` A backup is available at "${r.backupRelativePath}".` : "";
          message += r.recoveryRequired ? " Recovery is required before further edits." : "";
          message += !r.sourceAvailable ? " The token source is currently unavailable." : "";
        }
        planStatus.textContent = message;
        if (data.apply.state === "applied" || data.apply.state === "unchanged") {
          clear(reviewPanel);
          currentCommand = null;
          output.textContent = "";
          if (data.refresh.state === "reloaded") {
            await refreshCurrentView();
          } else if (data.refresh.state === "failed") {
            // T035 — el resultado de apply exitoso permanece visible aunque el refresh falle.
            planStatus.textContent = `${message} The Viewer could not refresh automatically; reload the page to see the latest values.`;
          }
        }
      },
      onCancel: () => {
        currentCommand = null;
        output.textContent = "";
        clear(reviewPanel);
        planStatus.textContent = "Draft cancelled.";
      },
      onBackToEdit: () => {
        clear(reviewPanel);
        planStatus.textContent = "Back to editing. Adjust the draft and generate a new plan.";
      },
    });
  });
  planForm.append(planStatus, planButton, reviewPanel);

  const valueForm = editorForm("Value editor");
  const valuePath = labeledInput("editor-token-path", "Token path", "text", "color.brand.primary");
  const valueType = labeledSelect("editor-value-type", "Value type", EDITOR_VALUE_TYPES);
  const valueInput = labeledInput("editor-value-input", "Value");
  const unitInput = labeledInput("editor-value-unit", "Unit for dimension or duration", "text", "px");
  const boolInput = labeledInput("editor-value-boolean", "Boolean value", "checkbox");
  appendFormField(valueForm, valuePath);
  appendFormField(valueForm, valueType);
  appendFormField(valueForm, valueInput);
  // T041/T042 — error asociado por control: `aria-describedby` apunta al `<p role="alert">` y
  // `aria-invalid` se activa/desactiva solo cuando la validación falla, nunca solo por color/icono.
  const valueError = document.createElement("p");
  valueError.id = "editor-value-input-error";
  valueError.setAttribute("role", "alert");
  valueInput.setAttribute("aria-describedby", valueError.id);
  valueForm.append(valueError);
  appendFormField(valueForm, unitInput);
  appendFormField(valueForm, boolInput);
  const valueButton = document.createElement("button");
  valueButton.type = "submit";
  valueButton.textContent = "Preview update value";
  valueForm.append(valueButton);
  valueForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const validation = validateTypedValue(valueType.value, valueInput.value, unitInput.value);
    if (!validation.ok) {
      valueInput.setAttribute("aria-invalid", "true");
      valueError.textContent = validation.message;
      valueInput.focus();
      return;
    }
    valueInput.removeAttribute("aria-invalid");
    valueError.textContent = "";
    preview(editorCommand([{ kind: "update-value", path: valuePath.value, value: parseTypedValue(valueType.value, valueInput.value, unitInput.value, boolInput.checked) }]));
  });

  const metaForm = editorForm("Type and metadata");
  const metaPath = labeledInput("editor-meta-path", "Token path", "text", "color.brand.primary");
  const metaType = labeledSelect("editor-meta-type", "Declared type", EDITOR_VALUE_TYPES);
  const description = labeledInput("editor-description", "Description");
  const category = labeledInput("editor-category", "Neuraz category metadata");
  const foundationLevel = labeledSelect("editor-foundation-level", "Foundation level", ["none", "primitive", "semantic", "component"]);
  appendFormField(metaForm, metaPath);
  appendFormField(metaForm, metaType);
  appendFormField(metaForm, description);
  appendFormField(metaForm, category);
  appendFormField(metaForm, foundationLevel);
  for (const [label, kind, field] of [
    ["Preview update type", "update-type", "type"],
    ["Preview update description", "update-description", "description"],
    ["Preview update category", "update-category", "category"],
  ] as const) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => {
      const value = field === "type" ? metaType.value : field === "description" ? description.value || null : category.value || null;
      preview(editorCommand([{ kind, path: metaPath.value, [field]: value }]));
    });
    metaForm.append(button);
  }
  const foundationButton = document.createElement("button");
  foundationButton.type = "button";
  foundationButton.textContent = "Preview update foundation level";
  foundationButton.addEventListener("click", () => {
    preview(editorCommand([{ kind: "update-foundation-level", path: metaPath.value, level: foundationLevel.value === "none" ? null : foundationLevel.value }]));
  });
  metaForm.append(foundationButton);

  // T025 (011) — Campos de metadata de component token. Sólo preview: el plano real usa el motor de
  // 008 existente sin cambios. Los campos component/part/variant/state/size/property se exponen en el
  // formulario y se incluyen en el draft JSON para inspección, señalando al usuario que su escritura
  // requiere el operador de 008 correspondiente (actualmente `update-foundation-level` escribe solo
  // `layer`; los demás campos son visibles pero no escritos por 008 en esta feature).
  const componentMetaHeading = document.createElement("h4");
  componentMetaHeading.textContent = "Component token metadata (preview)";
  metaForm.append(componentMetaHeading);
  const componentComponent = labeledInput("editor-component-component", "Component (e.g. button)");
  const componentPart = labeledInput("editor-component-part", "Part (e.g. container)");
  const componentVariant = labeledInput("editor-component-variant", "Variant");
  const componentState = labeledInput("editor-component-state", "State");
  const componentSize = labeledInput("editor-component-size", "Size");
  const componentProperty = labeledInput("editor-component-property", "Property");
  appendFormField(metaForm, componentComponent);
  appendFormField(metaForm, componentPart);
  appendFormField(metaForm, componentVariant);
  appendFormField(metaForm, componentState);
  appendFormField(metaForm, componentSize);
  appendFormField(metaForm, componentProperty);
  const componentPreviewButton = document.createElement("button");
  componentPreviewButton.type = "button";
  componentPreviewButton.textContent = "Preview component metadata draft";
  componentPreviewButton.addEventListener("click", () => {
    const layer = foundationLevel.value === "none" ? null : foundationLevel.value;
    preview(
      editorCommand([
        {
          kind: "update-foundation-level",
          path: metaPath.value,
          level: layer,
          // Component metadata fields are surfaced for review; 008 writes `level` only (sin cambios).
          component: componentComponent.value || null,
          part: componentPart.value || null,
          variant: componentVariant.value || null,
          state: componentState.value || null,
          size: componentSize.value || null,
          property: componentProperty.value || null,
        },
      ]),
    );
  });
  metaForm.append(componentPreviewButton);

  const aliasForm = editorForm("Alias editor");
  const aliasPath = labeledInput("editor-alias-path", "Alias token path", "text", "color.brand.primary");
  const aliasTarget = labeledInput("editor-alias-target", "Alias target path", "text", "color.base.blue-500");
  appendFormField(aliasForm, aliasPath);
  appendFormField(aliasForm, aliasTarget);
  for (const [label, operation] of [
    ["Preview create alias", () => ({ kind: "set-alias", path: aliasPath.value, target: aliasTarget.value })],
    ["Preview remove alias", () => ({ kind: "remove-alias", path: aliasPath.value })],
  ] as const) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => preview(editorCommand([operation()])));
    aliasForm.append(button);
  }

  const adminForm = editorForm("Token and group administration");
  const adminPath = labeledInput("editor-admin-path", "Token or group path", "text", "color.brand.primary");
  const adminDestination = labeledInput("editor-admin-destination", "New name, parent or destination path");
  const adminType = labeledSelect("editor-admin-type", "New token type", EDITOR_VALUE_TYPES);
  const adminValue = labeledInput("editor-admin-value", "New token value");
  appendFormField(adminForm, adminPath);
  appendFormField(adminForm, adminDestination);
  appendFormField(adminForm, adminType);
  appendFormField(adminForm, adminValue);
  const adminActions: readonly [string, () => Record<string, unknown>][] = [
    ["Preview create token", () => ({ kind: "create-token", path: adminPath.value, type: adminType.value, value: adminValue.value })],
    ["Preview rename token", () => ({ kind: "rename-token", path: adminPath.value, newName: adminDestination.value })],
    ["Preview move token", () => ({ kind: "move-token", path: adminPath.value, newParent: adminDestination.value })],
    ["Preview duplicate token", () => ({ kind: "duplicate-token", path: adminPath.value, destinationPath: adminDestination.value })],
    ["Preview remove token", () => ({ kind: "remove-token", path: adminPath.value })],
    ["Preview create group", () => ({ kind: "create-group", path: adminPath.value })],
    ["Preview rename group", () => ({ kind: "rename-group", path: adminPath.value, newName: adminDestination.value })],
    ["Preview move group", () => ({ kind: "move-group", path: adminPath.value, newParent: adminDestination.value })],
    ["Preview remove empty group", () => ({ kind: "remove-empty-group", path: adminPath.value })],
  ];
  for (const [label, operation] of adminActions) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", () => preview(editorCommand([operation()])));
    adminForm.append(button);
  }

  section.append(formStatus, valueForm, metaForm, aliasForm, adminForm, output, planForm);
}

// T025 (011) — Brand Editor. Flujo draft → plan → approval → apply propio (no reutiliza
// 008-token-mutations para contenido narrativo no-token, FR-015). Campos narrativos como textareas.
function labeledTextArea(id: string, labelText: string, value = ""): HTMLTextAreaElement {
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = labelText;
  const area = document.createElement("textarea");
  area.id = id;
  area.name = id;
  area.rows = 3;
  area.value = value;
  area.setAttribute("aria-label", labelText);
  label.append(area);
  return area;
}

interface BrandPlanFileEntry {
  readonly relativePath: string;
  readonly status: "create" | "update" | "unchanged";
}

interface BrandPlanEnvelopeData {
  readonly plan: { readonly files: readonly BrandPlanFileEntry[]; readonly writable: boolean };
  readonly outcome: "planned" | "unchanged";
  readonly documents: Record<string, unknown>;
}

interface BrandApplyEnvelopeData {
  readonly apply: {
    readonly outcome: "applied" | "unchanged" | "conflict" | "write-error" | "verification-error";
    readonly wrote: boolean;
    readonly error: { readonly code: string; readonly message: string } | null;
  };
  readonly refresh: { readonly state: "reloaded" | "failed" };
}

function readTextareaLines(area: HTMLTextAreaElement): readonly string[] {
  return area.value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function renderBrandPlanReview(container: HTMLElement, data: BrandPlanEnvelopeData, command: Record<string, unknown>, onApplied: () => void): void {
  clear(container);
  const heading3 = document.createElement("h4");
  heading3.textContent = `Brand plan review: ${data.outcome}`;
  container.setAttribute("aria-live", "polite");
  container.append(heading3);
  if (!data.plan.writable) {
    container.append(statusParagraph("This brand command produces no changes (all documents unchanged)."));
    return;
  }
  const list = document.createElement("ul");
  list.setAttribute("aria-label", "Brand document changes (read-only)");
  for (const file of data.plan.files) {
    const li = document.createElement("li");
    li.textContent = `${file.relativePath}: ${file.status}`;
    list.append(li);
  }
  container.append(list);
  const actions = document.createElement("div");
  const approveButton = document.createElement("button");
  approveButton.type = "button";
  approveButton.textContent = "Approve brand changes";
  approveButton.addEventListener("click", async () => {
    approveButton.disabled = true;
    const envelope = await fetchEditorJson("/api/editor/brand/apply", "POST", command);
    if (envelope === null || envelope.data === null) {
      approveButton.disabled = false;
      container.append(statusParagraph("Could not apply this brand plan. The previous brand files are unaffected."));
      return;
    }
    const applyData = envelope.data as BrandApplyEnvelopeData;
    let message = `Brand apply: ${applyData.apply.outcome}.`;
    if (applyData.apply.error !== null) message += ` ${applyData.apply.error.code} — ${applyData.apply.error.message}`;
    if (applyData.refresh.state === "reloaded") message += " Viewer refreshed.";
    else if (applyData.apply.outcome === "applied" || applyData.apply.outcome === "unchanged") message += " Viewer could not refresh automatically; reload the page.";
    container.append(statusParagraph(message));
    if (applyData.apply.outcome === "applied" || applyData.apply.outcome === "unchanged") {
      onApplied();
    }
  });
  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.textContent = "Cancel brand plan";
  cancelButton.addEventListener("click", () => {
    clear(container);
  });
  actions.append(approveButton, cancelButton);
  container.append(actions);
}

function renderBrandEditorForms(section: HTMLElement): void {
  const wrapper = document.createElement("section");
  wrapper.setAttribute("aria-labelledby", "brand-editor-title");
  const title = document.createElement("h3");
  title.id = "brand-editor-title";
  title.textContent = "Brand editor";
  const intro = document.createElement("p");
  intro.textContent = "Brand edits use a separate plan→apply flow and never touch tokens. Narrative fields accept Markdown.";
  wrapper.append(title, intro);

  const form = document.createElement("form");
  const formHeading = document.createElement("h4");
  formHeading.textContent = "Brand profile";
  form.append(formHeading);

  const name = labeledInput("brand-profile-name", "Name");
  const purpose = labeledTextArea("brand-profile-purpose", "Purpose");
  const mission = labeledTextArea("brand-profile-mission", "Mission");
  const vision = labeledTextArea("brand-profile-vision", "Vision");
  const positioning = labeledTextArea("brand-profile-positioning", "Positioning");
  const values = labeledTextArea("brand-profile-values", "Values (one per line)");
  const differentiators = labeledTextArea("brand-profile-differentiators", "Differentiators (one per line)");
  appendFormField(form, name);
  form.append(purpose.parentElement ?? purpose);
  form.append(mission.parentElement ?? mission);
  form.append(vision.parentElement ?? vision);
  form.append(positioning.parentElement ?? positioning);
  form.append(values.parentElement ?? values);
  form.append(differentiators.parentElement ?? differentiators);

  const voiceHeading = document.createElement("h4");
  voiceHeading.textContent = "Voice and tone";
  form.append(voiceHeading);
  const voicePrinciples = labeledTextArea("brand-voice-principles", "Voice principles (one per line)");
  const errorMessageGuidance = labeledTextArea("brand-voice-error-guidance", "Error-message guidance");
  const ctaGuidance = labeledTextArea("brand-voice-cta-guidance", "CTA guidance");
  form.append(voicePrinciples.parentElement ?? voicePrinciples);
  form.append(errorMessageGuidance.parentElement ?? errorMessageGuidance);
  form.append(ctaGuidance.parentElement ?? ctaGuidance);

  const visualHeading = document.createElement("h4");
  visualHeading.textContent = "Visual language";
  form.append(visualHeading);
  const iconStyle = labeledInput("brand-vl-icon", "Icon style");
  const shapeLanguage = labeledInput("brand-vl-shape", "Shape language");
  const motionLanguage = labeledInput("brand-vl-motion", "Motion language");
  const brandColors = labeledTextArea("brand-vl-brand-colors", "Brand color token paths (one per line)");
  appendFormField(form, iconStyle);
  appendFormField(form, shapeLanguage);
  appendFormField(form, motionLanguage);
  form.append(brandColors.parentElement ?? brandColors);

  const status = document.createElement("p");
  status.id = "brand-editor-status";
  status.setAttribute("aria-live", "polite");
  status.textContent = "Brand editor idle.";

  const reviewPanel = document.createElement("div");
  reviewPanel.id = "brand-editor-review";

  const planButton = document.createElement("button");
  planButton.type = "button";
  planButton.textContent = "Generate brand plan";
  planButton.addEventListener("click", async () => {
    const command: Record<string, unknown> = {};
    const profile: Record<string, unknown> = { formatVersion: "1.0.0", status: "partial" };
    if (name.value.trim().length > 0) profile.name = name.value.trim();
    if (purpose.value.trim().length > 0) profile.purpose = purpose.value.trim();
    if (mission.value.trim().length > 0) profile.mission = mission.value.trim();
    if (vision.value.trim().length > 0) profile.vision = vision.value.trim();
    if (positioning.value.trim().length > 0) profile.positioning = positioning.value.trim();
    const valuesList = readTextareaLines(values);
    if (valuesList.length > 0) profile.values = valuesList;
    const differentiatorsList = readTextareaLines(differentiators);
    if (differentiatorsList.length > 0) profile.differentiators = differentiatorsList;
    if (Object.keys(profile).length > 2) command.brandProfile = profile;

    const voice: Record<string, unknown> = { formatVersion: "1.0.0" };
    const voicePrinciplesList = readTextareaLines(voicePrinciples);
    if (voicePrinciplesList.length > 0) voice.voicePrinciples = voicePrinciplesList;
    if (errorMessageGuidance.value.trim().length > 0) voice.errorMessageGuidance = errorMessageGuidance.value.trim();
    if (ctaGuidance.value.trim().length > 0) voice.ctaGuidance = ctaGuidance.value.trim();
    if (Object.keys(voice).length > 1) command.voice = voice;

    const visualLanguage: Record<string, unknown> = { formatVersion: "1.0.0" };
    if (iconStyle.value.trim().length > 0) visualLanguage.iconStyle = iconStyle.value.trim();
    if (shapeLanguage.value.trim().length > 0) visualLanguage.shapeLanguage = shapeLanguage.value.trim();
    if (motionLanguage.value.trim().length > 0) visualLanguage.motionLanguage = motionLanguage.value.trim();
    const brandColorsList = readTextareaLines(brandColors);
    if (brandColorsList.length > 0) visualLanguage.brandColors = brandColorsList;
    if (Object.keys(visualLanguage).length > 1) command.visualLanguage = visualLanguage;

    if (Object.keys(command).length === 0) {
      status.textContent = "Fill in at least one field before generating a brand plan.";
      return;
    }
    status.textContent = "Generating brand plan...";
    const envelope = await fetchEditorJson("/api/editor/brand/plan", "POST", command);
    if (envelope === null || envelope.data === null) {
      status.textContent = "Could not generate a brand plan.";
      clear(reviewPanel);
      return;
    }
    status.textContent = `Brand plan ready (${envelope.state}). Review and approve.`;
    renderBrandPlanReview(reviewPanel, envelope.data as BrandPlanEnvelopeData, command, () => {
      status.textContent = "Brand applied. Reloading the current view.";
      void refreshCurrentView();
    });
  });

  form.append(status, planButton, reviewPanel);
  wrapper.append(form);
  section.append(wrapper);
}

function renderEditorEntry(el: HTMLElement): void {
  const section = document.createElement("section");
  section.setAttribute("aria-labelledby", "editor-entry-title");
  const title = document.createElement("h2");
  title.id = "editor-entry-title";
  title.textContent = "Visual Token Editor";
  const status = document.createElement("p");
  status.id = "editor-entry-status";
  status.setAttribute("aria-live", "polite");
  status.textContent = "Editor idle. Viewer data remains read-only until you enter edit mode.";
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Enter edit mode";
  button.setAttribute("aria-describedby", status.id);
  button.addEventListener("click", async () => {
    status.textContent = "Loading editor session...";
    const envelope = await fetchEditorJson("/api/editor/session");
    if (envelope === null) {
      status.textContent = "Could not load the editor session.";
      return;
    }
    status.textContent = `Editor state: ${envelope.state}. Drafts are separate from the Viewer projection.`;
  });
  section.append(title, status, button);
  renderEditorDraftForms(section);
  renderBrandEditorForms(section);
  el.append(section);
}

// T044 — mensaje explícito por estado (nunca solo el nombre crudo del estado; nunca pantalla en blanco
// en `partial`, donde `data` SIGUE presente — ver invariantes de `contracts/viewer-session-outcomes-v1`).
const STATE_MESSAGES: Readonly<Record<string, string>> = {
  empty: "This Design System has no tokens, assets or presets yet.",
  "invalid-design-system": "The Design System is not valid. Showing whatever could be recovered.",
  "not-found": "No Design System was found at this location.",
  "read-error": "The Design System could not be read.",
  partial: "This Design System is only partially set up. Showing available data.",
};

// T036 — un mensaje explícito y distinto por cada estado de apply (nunca solo el nombre crudo del
// estado; nunca depende solo de color). `recovery-required`/backup se comunican junto a este mensaje
// leyendo `apply.recovery` directamente (ver `renderReviewPanel`'s onApprove handler).
const EDITOR_APPLY_STATE_MESSAGES: Readonly<Record<string, string>> = {
  applied: "The plan was applied. The Viewer now reflects the updated tokens.",
  unchanged: "The candidate is identical to the current source. Nothing was written.",
  conflict: "The plan could not be applied: it is no longer valid against the current source.",
  "source-changed-concurrently": "The token source changed since this plan was generated. Generate a new plan to continue.",
  "source-unavailable": "The token source is no longer available. Nothing was written.",
  "write-error": "The write could not be completed. Nothing was applied; the previous source is unaffected or recoverable.",
  "verification-error": "The write could not be verified after publishing. Check recovery information before retrying.",
  "recovery-required": "A previous write requires recovery before continuing. Nothing new was applied.",
};

// T022 (011) — Vista Brand. Sólo proyecciones públicas; nunca revalida assets desde la UI (007 sigue
// siendo la autoridad). Estados explícitos en texto (no sólo color). `absent` se muestra tal cual.
function brandAssetGroup(group: ViewerBrandAssetGroupV1): HTMLLIElement {
  const li = document.createElement("li");
  const groupHeading = document.createElement("h4");
  groupHeading.textContent = `${group.kind} (${group.references.length})`;
  li.append(groupHeading);
  if (group.references.length === 0) {
    li.append(statusParagraph("No references declared in this group."));
    return li;
  }
  const list = document.createElement("ul");
  list.setAttribute("aria-label", `${group.kind} references`);
  for (const reference of group.references) {
    const refLi = document.createElement("li");
    const role = reference.variantRole ?? "(unspecified)";
    const resolutionText =
      reference.resolution === "resolved" ? "resolved" : reference.resolution === "missing" ? "missing — link this asset via Asset Manager" : "placeholder";
    refLi.textContent = `${role}: ${reference.logicalPath ?? "(no logical path)"} [${reference.assetKind}${reference.required ? "; required" : ""}] — ${resolutionText}`;
    list.append(refLi);
  }
  li.append(list);
  return li;
}

function renderBrand(el: HTMLElement, brand: ViewerBrandV1): void {
  el.append(heading(`Brand System: ${brand.status}`));
  if (brand.status === "absent") {
    el.append(statusParagraph("No Brand System found in this project (design-system/brand/ is absent). Use the brand editor below to add one."));
    return;
  }
  const profile: ViewerBrandProfileV1 | null = brand.profile;
  if (profile !== null) {
    const identity = document.createElement("section");
    const identityHeading = document.createElement("h3");
    identityHeading.textContent = "Identity";
    identity.append(identityHeading);
    const fields: readonly [string, string | null][] = [
      ["Name", profile.name],
      ["Short name", profile.shortName],
      ["Description", profile.description],
      ["Purpose", profile.purpose],
      ["Mission", profile.mission],
      ["Vision", profile.vision],
      ["Positioning", profile.positioning],
      ["Promise", profile.promise],
    ];
    const list = document.createElement("dl");
    for (const [label, value] of fields) {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value ?? "(not set)";
      list.append(dt, dd);
    }
    if (profile.values.length > 0) {
      const dt = document.createElement("dt");
      dt.textContent = "Values";
      const dd = document.createElement("dd");
      dd.textContent = profile.values.join(", ");
      list.append(dt, dd);
    }
    if (profile.differentiators.length > 0) {
      const dt = document.createElement("dt");
      dt.textContent = "Differentiators";
      const dd = document.createElement("dd");
      dd.textContent = profile.differentiators.join(", ");
      list.append(dt, dd);
    }
    identity.append(list);
    if (profile.audiences.length > 0) {
      const audiencesHeading = document.createElement("h4");
      audiencesHeading.textContent = "Audiences";
      const audiencesList = document.createElement("ul");
      for (const audience of profile.audiences) {
        const li = document.createElement("li");
        li.textContent = `${audience.name}${audience.description !== null ? ` — ${audience.description}` : ""}`;
        audiencesList.append(li);
      }
      identity.append(audiencesHeading, audiencesList);
    }
    if (profile.personality !== null) {
      const personalityHeading = document.createElement("h4");
      personalityHeading.textContent = "Personality";
      const personalityP = document.createElement("p");
      personalityP.textContent = `Attributes: ${profile.personality.attributes.join(", ")}${profile.personality.narrative !== null ? `\n${profile.personality.narrative}` : ""}`;
      identity.append(personalityHeading, personalityP);
    }
    if (profile.principles.length > 0) {
      const principlesHeading = document.createElement("h4");
      principlesHeading.textContent = "Principles";
      const principlesList = document.createElement("ul");
      for (const principle of profile.principles) {
        const li = document.createElement("li");
        li.textContent = `${principle.id}: ${principle.statement}${principle.rationale !== null ? ` — ${principle.rationale}` : ""}`;
        principlesList.append(li);
      }
      identity.append(principlesHeading, principlesList);
    }
    el.append(identity);
  }

  if (brand.voice !== null) {
    const voiceSection = document.createElement("section");
    const voiceHeading = document.createElement("h3");
    voiceHeading.textContent = "Voice and tone";
    voiceSection.append(voiceHeading);
    if (brand.voice.voicePrinciples.length > 0) {
      const p = document.createElement("p");
      p.textContent = `Voice principles: ${brand.voice.voicePrinciples.join("; ")}`;
      voiceSection.append(p);
    }
    if (brand.voice.toneDimensions.length > 0) {
      const dimsHeading = document.createElement("h4");
      dimsHeading.textContent = "Tone dimensions";
      const dimsList = document.createElement("ul");
      for (const dimension of brand.voice.toneDimensions) {
        const li = document.createElement("li");
        const completeness = dimension.complete ? "complete" : "incomplete (needs do/don't examples)";
        li.textContent = `${dimension.axis}: ${dimension.position ?? "(unspecified)"} [${completeness}]`;
        if (dimension.examples.do.length > 0 || dimension.examples.dont.length > 0) {
          const examples = document.createElement("ul");
          for (const example of dimension.examples.do) {
            const ex = document.createElement("li");
            ex.textContent = `do: ${example}`;
            examples.append(ex);
          }
          for (const example of dimension.examples.dont) {
            const ex = document.createElement("li");
            ex.textContent = `don't: ${example}`;
            examples.append(ex);
          }
          li.append(examples);
        }
        dimsList.append(li);
      }
      voiceSection.append(dimsHeading, dimsList);
    }
    if (brand.voice.terminology.preferred.length > 0 || brand.voice.terminology.forbidden.length > 0) {
      const termP = document.createElement("p");
      termP.textContent = `Preferred: ${brand.voice.terminology.preferred.join(", ") || "(none)"} — Avoided: ${brand.voice.terminology.forbidden.join(", ") || "(none)"}`;
      voiceSection.append(termP);
    }
    for (const [label, value] of [
      ["Microcopy guidance", brand.voice.microcopyGuidance],
      ["Error-message guidance", brand.voice.errorMessageGuidance],
      ["CTA guidance", brand.voice.ctaGuidance],
    ] as const) {
      if (value !== null) {
        const p = document.createElement("p");
        p.textContent = `${label}: ${value}`;
        voiceSection.append(p);
      }
    }
    el.append(voiceSection);
  }

  if (brand.visualLanguage !== null) {
    const vl = brand.visualLanguage;
    const vlSection = document.createElement("section");
    const vlHeading = document.createElement("h3");
    vlHeading.textContent = "Visual language";
    vlSection.append(vlHeading);
    const fields: readonly [string, string | null][] = [
      ["Icon style", vl.iconStyle],
      ["Illustration style", vl.illustrationStyle],
      ["Photography style", vl.photographyStyle],
      ["Image treatment", vl.imageTreatment],
      ["Composition guidance", vl.compositionGuidance],
      ["Shape language", vl.shapeLanguage],
      ["Border language", vl.borderLanguage],
      ["Shadow language", vl.shadowLanguage],
      ["Motion language", vl.motionLanguage],
      ["Clear space", vl.clearSpace],
      ["Minimum size", vl.minimumSize],
    ];
    const list = document.createElement("dl");
    for (const [label, value] of fields) {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value ?? "(not set)";
      list.append(dt, dd);
    }
    vlSection.append(list);
    if (vl.brandColors.length > 0 || vl.supportingColors.length > 0) {
      const colorsP = document.createElement("p");
      colorsP.textContent = `Brand colors: ${vl.brandColors.join(", ") || "(none)"} — Supporting: ${vl.supportingColors.join(", ") || "(none)"}`;
      vlSection.append(colorsP);
    }
    if (vl.typographicRoles.length > 0) {
      const rolesP = document.createElement("p");
      rolesP.textContent = `Typographic roles: ${vl.typographicRoles.map((role) => `${role.role} → ${role.tokenPath}`).join("; ")}`;
      vlSection.append(rolesP);
    }
    if (vl.usageRules.length > 0) {
      const rulesHeading = document.createElement("h4");
      rulesHeading.textContent = "Usage rules";
      const rulesList = document.createElement("ul");
      for (const rule of vl.usageRules) {
        const li = document.createElement("li");
        li.textContent = `[${rule.kindLabel}] ${rule.description}${rule.relatedAsset !== null ? ` (related: ${rule.relatedAsset})` : ""}`;
        rulesList.append(li);
      }
      vlSection.append(rulesHeading, rulesList);
    }
    el.append(vlSection);
  }

  if (brand.assetGroups.length > 0) {
    const assetsSection = document.createElement("section");
    const assetsHeading = document.createElement("h3");
    assetsHeading.textContent = "Brand asset references";
    assetsSection.append(assetsHeading);
    const groupsList = document.createElement("ul");
    for (const group of brand.assetGroups) groupsList.append(brandAssetGroup(group));
    assetsSection.append(groupsList);
    el.append(assetsSection);
  }

  const qualitySection = document.createElement("section");
  const qualityHeading = document.createElement("h3");
  qualityHeading.textContent = "Brand quality";
  qualitySection.append(qualityHeading);
  const qualityP = document.createElement("p");
  qualityP.textContent = `Fields completed: ${brand.quality.fieldsCompleted}/${brand.quality.fieldsTotal}. Provenance: ${Object.entries(brand.quality.provenanceBreakdown).map(([status, count]) => `${status}=${count}`).join(", ")}.`;
  qualitySection.append(qualityP);
  if (brand.quality.missingAssets.length > 0) {
    const missingHeading = document.createElement("h4");
    missingHeading.textContent = "Missing required assets";
    const missingList = document.createElement("ul");
    for (const missing of brand.quality.missingAssets) {
      const li = document.createElement("li");
      li.textContent = `${missing.variantRole} — ${missing.reason}`;
      missingList.append(li);
    }
    qualitySection.append(missingHeading, missingList);
  }
  el.append(qualitySection);

  if (brand.standards.length > 0) {
    const standardsP = document.createElement("p");
    standardsP.textContent = `Standards: ${brand.standards.map((standard) => `${standard.id} (${standard.alignment})`).join(", ")}`;
    el.append(standardsP);
  }
}

// T023 (011) — Vista Components. Component tokens agrupados (no anatomía completa de 012).
function renderMatrix(matrix: ViewerComponentMatrixV1): HTMLElement {
  const section = document.createElement("section");
  const heading3 = document.createElement("h4");
  heading3.textContent = `Matrix ${matrix.kind}`;
  section.append(heading3);
  const table = document.createElement("table");
  table.setAttribute("role", "table");
  table.setAttribute("aria-label", `${matrix.kind} matrix for component`);
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  const corner = document.createElement("th");
  corner.scope = "col";
  corner.textContent = matrix.kind === "variant-state" ? "variant \\ state" : matrix.kind === "size-variant" ? "size \\ variant" : "part \\ property";
  headerRow.append(corner);
  for (const column of matrix.columns) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = column;
    headerRow.append(th);
  }
  thead.append(headerRow);
  table.append(thead);
  const tbody = document.createElement("tbody");
  for (const row of matrix.rows) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = row;
    tr.append(th);
    for (const column of matrix.columns) {
      const cell = matrix.cells.find((candidate) => candidate.row === row && candidate.column === column);
      const td = document.createElement("td");
      td.textContent = cell === undefined ? "—" : `${cell.paths.length} token${cell.paths.length === 1 ? "" : "s"}`;
      if (cell !== undefined) td.textContent += `: ${cell.paths.join(", ")}`;
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(tbody);
  section.append(table);
  return section;
}

function renderComponents(el: HTMLElement, groups: readonly ViewerComponentGroupV1[]): void {
  el.append(heading("Components"));
  if (groups.length === 0) {
    el.append(statusParagraph("No component tokens declared yet. Component tokens require layer metadata ($extensions) with layer: \"component\"."));
    return;
  }
  for (const group of groups) {
    const section = document.createElement("section");
    const heading3 = document.createElement("h3");
    heading3.textContent = group.component;
    section.append(heading3);
    const summary = document.createElement("p");
    summary.textContent = `parts: ${group.parts.join(", ") || "(none)"} — variants: ${group.variants.join(", ") || "(none)"} — states: ${group.states.join(", ") || "(none)"} — sizes: ${group.sizes.join(", ") || "(none)"}`;
    section.append(summary);
    const tokensList = document.createElement("ul");
    tokensList.setAttribute("aria-label", `Tokens for ${group.component}`);
    for (const token of group.tokens) {
      const li = document.createElement("li");
      const meta = [token.part, token.variant, token.state, token.size, token.property].filter((value) => value !== null && value.length > 0);
      li.textContent = `${token.path}${meta.length > 0 ? ` [${meta.join(" / ")}]` : ""}`;
      tokensList.append(li);
    }
    section.append(tokensList);
    for (const matrix of group.matrices) section.append(renderMatrix(matrix));
    el.append(section);
  }
}

// T024 (011) — Vista Quality. Resumen integral de calidad.
function renderQuality(el: HTMLElement, quality: ViewerQualityV1): void {
  el.append(heading("Design System quality"));
  const counters = quality.counters;
  const summary = document.createElement("p");
  summary.textContent = `Brand: ${counters.brand.overallStatus}. Tokens: ${counters.tokens.total} (primitive=${counters.tokens.primitive}, semantic=${counters.tokens.semantic}, component=${counters.tokens.component}, brandRole=${counters.tokens.brandRole}, unclassified=${counters.tokens.unclassified}). Assets: ${counters.assets.total} (licenseMissing=${counters.assets.licenseMissing}, fontsMatched=${counters.assets.fontsMatched}/${counters.assets.fontAssets}). Components: ${counters.components.groups} groups, ${counters.components.componentTokens} tokens. Build: ${counters.build.hasBuild ? (counters.build.stale ? "stale" : "current") : "absent"}.`;
  el.append(summary);

  const tokensSection = document.createElement("section");
  const tokensHeading = document.createElement("h3");
  tokensHeading.textContent = "Token health";
  tokensSection.append(tokensHeading);
  const tokensList = document.createElement("ul");
  const tokenMetrics: readonly [string, number][] = [
    ["Unresolved aliases", counters.tokens.unresolvedAliases],
    ["Broken aliases", counters.tokens.brokenAliases],
    ["Alias cycles", counters.tokens.aliasCycles],
    ["Component → primitive bypasses", counters.tokens.componentBypassesSemantic],
    ["Brand → component bypasses", counters.tokens.brandBypassesSemantic],
    ["Unknown token types", counters.tokens.unknownTypes],
    ["Deep validation coverage", counters.tokens.deepValidationCoverage],
    ["Total deep-validatable tokens", counters.tokens.totalDeepValidatable],
  ];
  for (const [label, value] of tokenMetrics) {
    const li = document.createElement("li");
    li.textContent = `${label}: ${value}`;
    tokensList.append(li);
  }
  tokensSection.append(tokensList);
  el.append(tokensSection);

  if (quality.issueGroups.length > 0) {
    const issuesSection = document.createElement("section");
    const issuesHeading = document.createElement("h3");
    issuesHeading.textContent = "Issues grouped by cause";
    issuesSection.append(issuesHeading);
    const issuesList = document.createElement("ul");
    for (const group of quality.issueGroups) {
      const li = document.createElement("li");
      li.textContent = `[${group.severity}] ${group.code}: ${group.count} occurrence(s). ${group.cause}${group.samplePaths.length > 0 ? ` — e.g. ${group.samplePaths.join(", ")}` : ""}`;
      issuesList.append(li);
    }
    issuesSection.append(issuesList);
    el.append(issuesSection);
  } else {
    el.append(statusParagraph("No issues detected."));
  }

  if (quality.standards.length > 0) {
    const standardsP = document.createElement("p");
    standardsP.textContent = `Standards references: ${quality.standards.map((standard) => `${standard.id} (${standard.alignment})`).join(", ")}`;
    el.append(standardsP);
  }
}

function renderSection(el: HTMLElement, envelope: ViewerJsonEnvelopeLike): void {
  clear(el);
  if (envelope.data === null) {
    el.append(heading(`${envelope.section} (${envelope.state})`), statusParagraph(STATE_MESSAGES[envelope.state] ?? `State: ${envelope.state}`));
    return;
  }
  if (envelope.state in STATE_MESSAGES) {
    // partial (u otro estado degradado) con datos disponibles: aviso + contenido, nunca solo uno de los dos.
    el.append(statusParagraph(STATE_MESSAGES[envelope.state] as string));
  }
  if (envelope.section === "colors") {
    renderColors(el, envelope.data as readonly ViewerColorV1[]);
  } else if (envelope.section === "typography") {
    renderTypography(el, envelope.data as readonly ViewerTypographyV1[]);
  } else if (["spacing", "radius", "borders", "shadows", "motion"].includes(envelope.section)) {
    renderFoundationCategory(el, envelope.data as ViewerFoundationV1);
  } else if (envelope.section === "issues") {
    el.append(heading("Issues"));
    el.append(renderIssuesList(envelope.data as readonly ViewerIssueV1[]));
  } else if (envelope.section === "brand") {
    renderBrand(el, envelope.data as ViewerBrandV1);
  } else if (envelope.section === "components") {
    renderComponents(el, envelope.data as readonly ViewerComponentGroupV1[]);
  } else if (envelope.section === "quality") {
    renderQuality(el, envelope.data as ViewerQualityV1);
  } else {
    renderGeneric(el, envelope.section, envelope.state, envelope.data);
  }
}

async function loadSession(): Promise<void> {
  const el = contentRegion();
  if (el === null) return;
  const envelope = await fetchJson("/api/session");
  if (envelope === null) {
    clear(el);
    el.append(statusParagraph("Could not load the Design System session."));
    return;
  }
  clear(el);
  el.append(heading("Overview"));
  el.append(statusParagraph(STATE_MESSAGES[envelope.state] ?? `Session state: ${envelope.state}`));
  if (envelope.data !== null && typeof envelope.data === "object") {
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(envelope.data, null, 2);
    el.append(pre);
  }
  renderEditorEntry(el);
}

// T035 — recuerda la sección visible (o `null` para overview) para poder recargarla EN EL MISMO LUGAR
// tras un apply exitoso, en vez de forzar siempre de vuelta al overview (preserva navegación cuando es posible).
let currentSectionId: string | null = null;

async function loadSection(id: string): Promise<void> {
  const el = contentRegion();
  if (el === null) return;
  const envelope = await fetchJson(`/api/section/${encodeURIComponent(id)}`);
  if (envelope === null) {
    clear(el);
    el.append(statusParagraph(`Could not load section "${id}".`));
    el.focus();
    return;
  }
  currentSectionId = id;
  renderSection(el, envelope);
  el.focus(); // el contenido cambió: mueve el foco al landmark principal (navegación por teclado, FR accessibility)
}

/** T035 — recarga la vista actual (Viewer) con una sesión NUEVA e independiente, tras un apply exitoso. */
async function refreshCurrentView(): Promise<void> {
  if (currentSectionId === null) {
    await loadSession();
    return;
  }
  await loadSection(currentSectionId);
}

function wireNavigation(): void {
  const links = document.querySelectorAll<HTMLAnchorElement>("nav a[data-section]");
  for (const link of links) {
    link.addEventListener("click", (event) => {
      const id = link.dataset["section"];
      if (id === undefined) return;
      event.preventDefault();
      currentSectionId = id;
      void loadSection(id);
    });
  }
}

wireNavigation();
void loadSession();
