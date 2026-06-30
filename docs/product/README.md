# Neuraz Design System Studio — documentación de producto

El Core actual (features `001`–`006`, cerradas) es la base sobre la que se construirá **Neuraz Design
System Studio**: un producto completo para crear, visualizar, editar e importar Design Systems locales,
versionables y portables, manteniendo el repositorio anfitrión como única fuente de verdad.

Esta carpeta documenta **la visión y las reglas**, no implementaciones. Ninguna capacidad futura aquí
descrita está implementada salvo lo que el [mapa de capacidades](capability-map.md) marca como
`implemented`.

## Documentos

- [vision.md](vision.md) — qué es el Studio, a quién sirve y cómo evoluciona desde el Core headless.
- [architecture-guardrails.md](architecture-guardrails.md) — las 15 reglas arquitectónicas obligatorias
  que cualquier capacidad futura debe respetar.
- [capability-map.md](capability-map.md) — capacidades del producto con su estado real
  (`implemented` / `planned` / `exploratory` / `out-of-scope`), módulo y feature actual/futura.

## Estado del Core (base del Studio)

- `001`–`006` **completadas**: init, validate/inspect, salida JSON, foundations, presets y build/export.
- `006-build-export`: **COMPLETADA** (158/158 tareas; commit final `47409b5`; 1576/1576 tests).
- El Core es **local-first, Git-first y headless-first**, sin React, navegador, Figma, scraping ni
  proveedores de IA.

## Cómo leer esta documentación

1. Empieza por [vision.md](vision.md) para el porqué y el alcance.
2. Consulta [architecture-guardrails.md](architecture-guardrails.md) antes de proponer cualquier feature.
3. Usa [capability-map.md](capability-map.md) para ubicar una capacidad y su madurez antes de planificar.
