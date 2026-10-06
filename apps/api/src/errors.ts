/** A failure with a stable API code (api-design.md). Services throw these; the error plugin renders them. */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (code: string, message: string) => new AppError(404, code, message);
