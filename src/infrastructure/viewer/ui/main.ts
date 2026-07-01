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

function renderSection(el: HTMLElement, envelope: ViewerJsonEnvelopeLike): void {
  clear(el);
  if (envelope.data === null) {
    el.append(heading(`${envelope.section} (${envelope.state})`), statusParagraph("Nothing to show for this state."));
    return;
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
  el.append(heading("Overview"), statusParagraph(`Session state: ${envelope.state}`));
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
