/** Mirrors backend ErrorResponse (backend/.../infrastructure/web/ErrorResponse.java). */
export class ApiError extends Error {
  readonly status: number;
  readonly correlationId: string | undefined;

  constructor(message: string, status: number, correlationId: string | undefined) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.correlationId = correlationId;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
