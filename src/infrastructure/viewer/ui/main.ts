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
  const foundationLevel = labeledSelect("editor-foundation-level", "Foundation level", ["none", "primitive", "semantic"]);
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
