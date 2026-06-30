# Visión — Neuraz Design System Studio

> Documento de visión. No implementa ni compromete fechas. Describe el destino del producto y cómo el
> Core actual (`001`–`006`) es su fundamento. Las reglas no negociables viven en
> [architecture-guardrails.md](architecture-guardrails.md); el estado real de cada capacidad, en
> [capability-map.md](capability-map.md).

## 1. Qué es

**Neuraz Design System Studio** es el producto completo para administrar un Design System local. Hoy
existe su **Core headless** (un paquete npm con CLI: init, validate/inspect, JSON, foundations, presets,
build/export). El Studio añadirá, alrededor de ese mismo Core, un visualizador, un editor visual,
gestión de assets e importadores — sin cambiar la naturaleza local-first del sistema.

El Design System siempre permanece como **archivos en el repositorio anfitrión** (DTCG como formato
canónico de tokens). El Studio nunca se convierte en la fuente de verdad: es un cliente del Core.

## 2. A quién sirve

- Equipos de producto y diseño que quieren un Design System versionado junto al código.
- Desarrolladores que consumen tokens deterministas (CSS/JSON/TypeScript) en cualquier framework.
- Agentes y automatizaciones que operan el Design System de forma headless (CLI, MCP, CI/CD).

## 3. Desde el Core headless hacia el Studio

El Core ya garantiza los invariantes que hacen seguro construir UI encima:

- una sola lectura/análisis semántico por ejecución;
- escritura transaccional con backup y recuperación explícita;
- ownership explícito del output y preservación de contenido desconocido;
- salidas deterministas y paths públicos lógicos y relativos;
- contratos públicos estables (outcomes, exit codes, envelopes JSON).

El Studio reutiliza **los mismos casos de uso** que la CLI. La UI no introduce una segunda lógica de
negocio: invoca el Core y presenta resultados. Esto permite que CLI, MCP y Studio se comporten igual.

## 4. Alcance del producto completo

El producto contempla, además del Core headless:

- **Visualizador** del Design System (tokens, foundations, categorías, estados).
- **Editor visual** que escribe a través del Core (nunca directo al filesystem).
- **Gestión manual de fuentes** (tipografías) con respeto explícito de licencias.
- **Assets**: logos, SVG, iconos e imágenes, separados de los tokens DTCG.
- **Importadores**: desde Figma, extracción desde URL, análisis de imágenes y capturas.
- **Inferencia** de tokens y presets (asistida por IA, opcional y fuera del Core determinista).
- **Revisión y aprobación de candidatos**: todo lo importado/inferido entra como candidato con diff,
  validación y aprobación humana antes de tocar la fuente.
- **Interfaces de automatización**: CLI, MCP, skills, e integración con Git y CI/CD.

## 5. Principios de evolución

1. El Core determinista no depende de la UI, de la IA ni de servicios externos.
2. Cada nueva capacidad se ancla a los [guardrails](architecture-guardrails.md); si los viola, se
   rediseña antes de implementarse.
3. Las capacidades probabilísticas (IA, importación, inferencia) producen **candidatos**, nunca cambios
   directos en la fuente.
4. La portabilidad y la ausencia de lock-in son requisitos, no aspiraciones: el Design System debe poder
   sobrevivir sin el Studio.

## 6. No-objetivos (de momento)

- No ser un servicio cloud ni un backend multi-tenant.
- No incorporar IA dentro del Core determinista.
- No asumir un framework de UI concreto como dependencia del Core.
- No reemplazar el control de versiones: Git sigue siendo la línea de tiempo del Design System.
