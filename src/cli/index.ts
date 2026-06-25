#!/usr/bin/env node
// Binario `neuraz-ds` (bootstrap mínimo, Fase 1).
// Aún no implementa comandos: el comando `init` y el wiring de Commander llegan en la Fase 7.
// No introduce comportamiento funcional; solo informa el estado del paquete.

const message =
  "neuraz-ds: bootstrap — aún no hay comandos implementados. " +
  "El comando `init` se añadirá en una fase posterior.";

process.stdout.write(`${message}\n`);
process.exitCode = 0;
