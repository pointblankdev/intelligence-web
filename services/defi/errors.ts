/**
 * Error types for price service operations
 */
export enum PriceErrorCode {
  FETCH_FAILED = 'FETCH_FAILED',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  RATE_LIMITED = 'RATE_LIMITED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
}

/**
 * Custom error class for price operations
 */
export class PriceError extends Error {
  constructor(
    message: string,
    public code: PriceErrorCode,
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'PriceError';
  }
}
