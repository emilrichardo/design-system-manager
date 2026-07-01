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
  if (entry.family !== null) preview.style.fontFamily = entry.family;
  if (entry.size !== null) preview.style.fontSize = describeValue(entry.size);
  preview.textContent = entry.token.path;
  const details = document.createElement("p");
  details.textContent = `family=${entry.family ?? "(none)"} weight=${entry.weight ?? "(none)"} style=${entry.style ?? "(none)"} license=${entry.licenseState}`;
  li.append(preview, details);
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

function renderDraftPreview(status: HTMLElement, output: HTMLPreElement, command: Record<string, unknown>): void {
  status.textContent = "Draft ready. Use the plan route to review the diff before approval.";
  output.textContent = JSON.stringify(command, null, 2);
  output.focus();
}

function editorForm(titleText: string): HTMLFormElement {
  const form = document.createElement("form");
  const title = document.createElement("h3");
  title.textContent = titleText;
  form.append(title);
  return form;
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
  formStatus.textContent = "Editor forms create drafts only; unsupported or composite values remain read-only in this checkpoint.";
  const output = document.createElement("pre");
  output.tabIndex = -1;
  output.setAttribute("aria-label", "Editor draft JSON");

  const valueForm = editorForm("Value editor");
  const valuePath = labeledInput("editor-token-path", "Token path", "text", "color.brand.primary");
  const valueType = labeledSelect("editor-value-type", "Value type", EDITOR_VALUE_TYPES);
  const valueInput = labeledInput("editor-value-input", "Value");
  const unitInput = labeledInput("editor-value-unit", "Unit for dimension or duration", "text", "px");
  const boolInput = labeledInput("editor-value-boolean", "Boolean value", "checkbox");
  appendFormField(valueForm, valuePath);
  appendFormField(valueForm, valueType);
  appendFormField(valueForm, valueInput);
  appendFormField(valueForm, unitInput);
  appendFormField(valueForm, boolInput);
  const valueButton = document.createElement("button");
  valueButton.type = "submit";
  valueButton.textContent = "Preview update value";
  valueForm.append(valueButton);
  valueForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renderDraftPreview(
      formStatus,
      output,
      editorCommand([{ kind: "update-value", path: valuePath.value, value: parseTypedValue(valueType.value, valueInput.value, unitInput.value, boolInput.checked) }]),
    );
  });

  const metaForm = editorForm("Type and metadata");
  const metaPath = labeledInput("editor-meta-path", "Token path", "text", "color.brand.primary");
  const metaType = labeledSelect("editor-meta-type", "Declared type", EDITOR_VALUE_TYPES);
  const description = labeledInput("editor-description", "Description");
  const category = labeledInput("editor-category", "Neuraz category metadata");
  appendFormField(metaForm, metaPath);
  appendFormField(metaForm, metaType);
  appendFormField(metaForm, description);
  appendFormField(metaForm, category);
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
      renderDraftPreview(formStatus, output, editorCommand([{ kind, path: metaPath.value, [field]: value }]));
    });
    metaForm.append(button);
  }

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
    button.addEventListener("click", () => renderDraftPreview(formStatus, output, editorCommand([operation()])));
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
    button.addEventListener("click", () => renderDraftPreview(formStatus, output, editorCommand([operation()])));
    adminForm.append(button);
  }

  section.append(formStatus, valueForm, metaForm, aliasForm, adminForm, output);
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
  renderSection(el, envelope);
  el.focus(); // el contenido cambió: mueve el foco al landmark principal (navegación por teclado, FR accessibility)
}

function wireNavigation(): void {
  const links = document.querySelectorAll<HTMLAnchorElement>("nav a[data-section]");
  for (const link of links) {
    link.addEventListener("click", (event) => {
      const id = link.dataset["section"];
      if (id === undefined) return;
      event.preventDefault();
      void loadSection(id);
    });
  }
}

wireNavigation();
void loadSession();
