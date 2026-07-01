// T022 (009) — Esqueleto de la UI del Viewer: TypeScript vanilla + DOM, SIN framework ni dependencia
// runtime nueva (ADR-0026). Compilado por el mismo `tsc` del proyecto (ESM válido para `<script
// type="module">`, sin bundler). `fetch` solo contra `http://127.0.0.1:<port>/api/**` (mismo origen —
// nunca un host remoto). Navegación accesible: los `<a href="#id">` del shell ya son focheables/anunciados
// por lectores de pantalla sin JS; este script solo enriquece la interacción (fetch + render de texto).
interface ViewerJsonEnvelopeLike {
  readonly formatVersion: string;
  readonly section: string;
  readonly state: string;
  readonly data: unknown;
}

function contentRegion(): HTMLElement | null {
  return document.getElementById("content");
}

function renderStatus(el: HTMLElement, text: string): void {
  el.textContent = text;
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

async function loadSession(): Promise<void> {
  const el = contentRegion();
  if (el === null) return;
  const envelope = await fetchJson("/api/session");
  if (envelope === null) {
    renderStatus(el, "Could not load the Design System session.");
    return;
  }
  renderStatus(el, `Session state: ${envelope.state}`);
}

async function loadSection(id: string): Promise<void> {
  const el = contentRegion();
  if (el === null) return;
  const envelope = await fetchJson(`/api/section/${encodeURIComponent(id)}`);
  if (envelope === null) {
    renderStatus(el, `Could not load section "${id}".`);
    return;
  }
  renderStatus(el, `Section "${id}": state=${envelope.state}`);
  el.focus();
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
