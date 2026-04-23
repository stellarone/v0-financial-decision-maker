/**
 * Error types and error codes returned by the platform-acumatica HTTP service.
 *
 * This file is a verbatim copy to ship with the consumer client. Keep it in
 * sync with `data/constants/error-codes.ts` in the platform-acumatica repo.
 */

export const ACUMATICA_ERROR_CODES = [
  "AUTH_FAILED",
  "ORG_NOT_FOUND",
  "CREDENTIALS_MISSING",
  "CREDENTIALS_INVALID",
  "ACUMATICA_UNAVAILABLE",
  "ACUMATICA_CREATE_FAILED",
  "ACUMATICA_TIMEOUT",
  "IMPORT_SCENARIO_NOT_FOUND",
  "IMPORT_SCENARIO_FAILED",
  "MIGRATION_MODE_CONFLICT",
  "MAINTENANCE_MODE_CONFLICT",
  "NOT_IMPLEMENTED",
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "INTERNAL_ERROR",
] as const;

export type AcumaticaErrorCode = (typeof ACUMATICA_ERROR_CODES)[number];

/**
 * Thrown by {@link AcumaticaClient} whenever the service responds with
 * `{ success: false, error: { code, message } }`. `status` is the raw HTTP
 * response status so callers can branch on 401/404/502/etc. when needed.
 */
export class AcumaticaError extends Error {
  public readonly code: AcumaticaErrorCode | string;
  public readonly status: number;

  constructor(
    code: AcumaticaErrorCode | string,
    message: string,
    status: number
  ) {
    super(message);
    this.name = "AcumaticaError";
    this.code = code;
    this.status = status;
  }
}
