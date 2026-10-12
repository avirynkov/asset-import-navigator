/** Detect thenables without relying on `instanceof Promise` (cross-realm safe). */
export function isThenable(value: unknown): value is Promise<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}

/**
 * Unwrap a sync host return. Throws SyncHostAsyncError if the host returned a Promise
 * (Mode A / resolveAssetSync cannot await).
 */
export class SyncHostAsyncError extends Error {
  constructor(operation: string) {
    super(`AssetResolverHost.${operation} returned a Promise; sync resolution requires sync I/O`);
    this.name = 'SyncHostAsyncError';
  }
}

export function unwrapSync<T>(value: T | Promise<T>, operation: string): T {
  if (isThenable(value)) {
    throw new SyncHostAsyncError(operation);
  }
  return value;
}
