export type ApiErrorCode =
  | "configuration"
  | "http"
  | "network"
  | "timeout"
  | "aborted"
  | "invalid_response";

/** Common failure shape for the frontend's backend request helpers. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status?: number;
  readonly details?: unknown;

  constructor(
    message: string,
    code: ApiErrorCode,
    options: { status?: number; details?: unknown; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.code = code;
    this.status = options.status;
    this.details = options.details;
  }
}
