// T020 (009) — Format version propio del envelope JSON del Viewer; independiente de `003`/`004`/`006`/
// `007`/`008` (mismo patrón que la decisión D9 de `008`).
export const VIEWER_JSON_FORMAT_VERSION = "1.0.0";

export type ViewerJsonFormatVersion = typeof VIEWER_JSON_FORMAT_VERSION;
