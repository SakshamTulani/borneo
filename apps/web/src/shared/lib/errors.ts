/** The API's stable error code, if `e` carries one (ApiError from shared/lib/http). */
export function errorCode(e: unknown): string | undefined {
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : undefined;
}

/**
 * Text to show for a failed request: the API's own message (written for customers), or a
 * connection message when the API never answered.
 */
export function errorMessage(e: unknown): string {
  const api = e as { status?: unknown; message?: unknown } | null;
  if (typeof api?.status === 'number' && typeof api.message === 'string' && api.status < 500) {
    return api.message;
  }
  return 'Something went wrong. Check your connection and try again.';
}
