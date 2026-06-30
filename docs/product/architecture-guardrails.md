# Guardrails arquitectónicos — Neuraz Design System Studio

> Reglas **obligatorias** para cualquier capacidad presente o futura del producto. Son condiciones de
> diseño, no sugerencias: una propuesta que viole un guardrail se rediseña antes de implementarse.
> Complementan (no reemplazan) la constitución del proyecto y los ADR en [`docs/adr/`](../adr/).

Las capacidades y su estado real están en [capability-map.md](capability-map.md); el porqué, en
[vision.md](vision.md).

## Reglas

1. **Core local-first, Git-first y headless-first.** El Design System son archivos en el repositorio
   anfitrión; el Core opera sin servicios cloud, sin base de datos interna y sin requerir UI. Git es la
   línea de tiempo del Design System.

2. **Core sin React, navegador, Figma, scraping ni proveedores de IA.** El Core determinista no importa
   frameworks de UI, APIs de navegador, clientes de Figma, scrapers ni SDKs de IA. Esas dependencias
   viven en capas externas.

3. **CLI, MCP y Studio reutilizan los mismos casos de uso.** No se duplica lógica de negocio por
   interfaz: las tres son adaptadores delgados sobre los casos de uso de aplicación.

4. **UI como cliente, no como autoridad.** El visualizador y el editor presentan e invocan; la autoridad
   sobre la fuente y las reglas vive en el Core. La UI nunca es la fuente de verdad.

5. **Filesystem siempre detrás de puertos.** Ninguna capa de dominio/aplicación toca `node:fs`
   directamente; el acceso a disco se inyecta mediante puertos, lo que permite simular fallos y aislar
   plataformas.

6. **Assets separados de los tokens DTCG.** Fuentes, logos, SVG, iconos e imágenes se modelan y almacenan
   aparte del documento de tokens; no contaminan el formato canónico DTCG.

7. **Importadores generan candidatos, nunca escriben directamente.** Figma, URL, imágenes y capturas
   producen propuestas; jamás modifican la fuente de forma directa.

8. **Todo candidato requiere revisión, diff, validación y aprobación.** Ningún candidato (importado o
   inferido) entra a la fuente sin diff explícito, validación del Core y aprobación humana.

9. **IA opcional y fuera del Core determinista.** La inferencia es opt-in, vive fuera del Core y solo
   produce candidatos; el comportamiento determinista no depende de ella.

10. **Paths públicos lógicos y relativos.** Resultados, reportes y errores exponen rutas lógicas
    relativas; nunca rutas absolutas, cwd, hostname ni datos del entorno.

11. **Escrituras transaccionales.** Toda mutación del filesystem es todo-o-nada, con verificación,
    backup y recuperación explícita; sin publicaciones parciales.

12. **Ownership explícito.** El sistema solo administra lo que declara como propio (p. ej. vía manifest);
    la autoridad de pertenencia es explícita y verificable, no inferida.

13. **Contenido desconocido se preserva o bloquea.** Lo no administrado se conserva intacto o bloquea la
    operación con un conflicto; nunca se borra ni se sobrescribe silenciosamente.

14. **Licencias de fuentes y assets nunca se asumen.** La procedencia y los términos de licencia de
    tipografías y assets se registran y respetan; no se asume permiso de uso/redistribución.

15. **SVG debe sanitizarse antes de incorporarse.** Todo SVG entrante se sanitiza (scripts, handlers,
    referencias externas) antes de incorporarse al Design System.

## Cómo se aplican

- Antes de planificar una feature, verifica que respeta las 15 reglas. Si alguna obliga a relajar una
  regla, eso es una decisión arquitectónica que requiere un ADR, no una excepción tácita.
- Las reglas 1–5 protegen la **forma** del sistema (capas, autoridad, portabilidad).
- Las reglas 6–9 y 14–15 protegen la **entrada de contenido** (assets, importadores, IA, licencias).
- Las reglas 10–13 protegen la **integridad de la escritura** (paths, transaccionalidad, ownership).
