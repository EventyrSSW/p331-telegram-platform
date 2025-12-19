export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isAuthError() {
    return this.statusCode === 401;
  }

  get isNotFound() {
    return this.statusCode === 404;
  }

  get isRateLimited() {
    return this.statusCode === 429;
  }
}

export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isAuthError) return 'Please reconnect your wallet';
    if (error.isRateLimited) return 'Too many requests. Please wait a moment.';
    if (error.isNotFound) return 'Resource not found';
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}
