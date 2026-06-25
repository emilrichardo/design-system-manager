// Errores de dominio discriminables y un tipo Result puro (sin excepciones genéricas).
// El dominio nunca lanza para errores esperados: devuelve Result<T>.

export type DomainErrorCode =
  | "name-empty"
  | "slug-invalid"
  | "slug-empty-derivation"
  | "version-invalid"
  | "incoherent-state"
  | "plan-duplicate-files"
  | "plan-not-executable";

export interface DomainError {
  readonly code: DomainErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Err {
  readonly ok: false;
  readonly error: DomainError;
}

export type Result<T> = Ok<T> | Err;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err(
  code: DomainErrorCode,
  message: string,
  details?: Record<string, unknown>,
): Err {
  return {
    ok: false,
    error: details === undefined ? { code, message } : { code, message, details },
  };
}
