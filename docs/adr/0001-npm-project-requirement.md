# ADR 0001 — Requisito de proyecto npm para `init`

- **Estado**: Aceptado
- **Fecha**: 2026-06-25
- **Contexto**: Feature 001-ds-init. Constitución VI, XIV.

## Decisión

La inicialización **requiere** un `package.json` válido dentro del límite autorizado (raíz
anfitriona resuelta). En consecuencia, `init`:

- **NO** crea un `package.json` ni ejecuta `npm init`.
- **NO** instala dependencias.
- **NO** modifica scripts ni ningún campo de `package.json`.
- **NO escribe ningún archivo** si falta el `package.json`: se detiene con un error claro pidiendo
  inicializar el proyecto npm e instalar el gestor.
- La ausencia de `package.json` **no** se considera un proyecto vacío válido.

Mensaje (texto exacto a afinar):

```text
No se encontró package.json en el proyecto anfitrión.
Inicializa primero el proyecto npm e instala Neuraz Design System Manager.
No se realizaron cambios.
```

## Consecuencias

- El gestor se distribuye e instala como dependencia npm; exigir `package.json` es coherente con
  ese modelo y con la seguridad de no tocar el proyecto anfitrión (Constitución XIV).
- Exit code `5` (`INVALID_HOST`) cuando falta el manifiesto npm.

## Alternativas rechazadas

- Crear `package.json` automáticamente: viola la regla de no modificar el proyecto anfitrión y
  añade efectos colaterales inesperados.
- Permitir proyectos no-npm: amplía el alcance y rompe el modelo de distribución.
