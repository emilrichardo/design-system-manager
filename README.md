# Neuraz Design System Manager

> Nombre provisional. Producto en fase de **especificación**.

Neuraz Design System Manager será un **gestor local de Design Systems** distribuido
como **paquete npm**.

## Idea fundamental

- Se instala como dependencia de desarrollo **dentro de un proyecto concreto** (el
  proyecto anfitrión).
- El **Design System permanece en el repositorio anfitrión** como fuente de verdad
  versionable; el gestor no lo guarda en una base de datos interna.
- El gestor actúa como visualizador, editor, validador, documentador, generador de
  salidas e interfaz para agentes.

## Dirección técnica prevista

- **DTCG** como formato canónico de tokens (previsto).
- **Style Dictionary** como generador de salidas (previsto).
- Funcionamiento **local-first**, con archivos versionables como almacenamiento
  principal.
- Independiente del framework del proyecto anfitrión (WordPress, Astro, Next.js, etc.).

## Estado

El proyecto está en **fase de especificación** mediante
[GitHub Spec Kit](https://github.com/github/spec-kit) (Spec-Driven Development).

**Todavía no se ha elegido el stack definitivo** ni se ha implementado código de
producto. Las decisiones se formalizarán en la constitución y las especificaciones.
