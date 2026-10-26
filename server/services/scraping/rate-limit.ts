/**
 * Shared rate limiter utility for scraping operations.
 *
 * Provides per-domain request throttling with exponential backoff,
 * jitter, and Retry-After header support.
 */

/** Configuration options for a {@link RateLimiter} instance. */
export interface RateLimiterOptions {
  /** Minimum delay (ms) between consecutive requests to the same domain. */
  baseDelay: number;
  /** Maximum number of retry attempts for failed requests. */
  maxRetries: number;
  /** Multiplier applied to the delay on each backoff step. */
  backoffMultiplier: number;
  /** Upper bound (ms) for any single delay. */
  maxDelay: number;
}

const DEFAULT_OPTIONS: RateLimiterOptions = {
  baseDelay: 500,
  maxRetries: 3,
  backoffMultiplier: 2,
  maxDelay: 30_000,
};

/**
 * Per-domain rate limiter with exponential backoff and retry logic.
 *
 * - Tracks the last request timestamp per domain to enforce a minimum delay.
 * - Wraps request functions with automatic retry on 429 / 5xx responses.
 * - Adds ±20 % jitter to every calculated delay to avoid thundering-herd effects.
 * - Honours the `Retry-After` response header when present.
 */
export class RateLimiter {
  private readonly options: RateLimiterOptions;
  private readonly lastRequestTime = new Map<string, number>();

  constructor(options: Partial<RateLimiterOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Wait until the minimum delay has elapsed since the last request to `domain`.
   *
   * This method is safe to call concurrently — the domain map entry is updated
   * atomically before the first `await` so that parallel callers queue correctly.
   */
  async waitForSlot(domain: string): Promise<void> {
    const now = Date.now();
    const lastTime = this.lastRequestTime.get(domain) ?? 0;
    const elapsed = now - lastTime;

    // Reserve the slot immediately to block concurrent callers.
    this.lastRequestTime.set(domain, now);

    const remaining = this.options.baseDelay - elapsed;
    if (remaining > 0) {
      await this.sleep(remaining);
    }
  }

  /**
   * Execute `fn` with automatic retry on transient failures (HTTP 429 / 5xx).
   *
   * On each failure the delay is calculated as:
   * ```
   * min(baseDelay * multiplier ^ attempt, maxDelay)  ± 20 % jitter
   * ```
   * If the error exposes a `Retry-After` header (in seconds), that value is
   * used instead of the calculated back-off.
   *
   * @returns The value returned by `fn`.
   * @throws The last error encountered after all retries are exhausted.
   */
  async executeWithRetry<T>(fn: () => Promise<T>, domain: string): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        await this.waitForSlot(domain);
        return await fn();
      } catch (err: unknown) {
        lastError = err;

        if (attempt >= this.options.maxRetries) {
          break;
        }

        if (!isTransientError(err)) {
          throw err;
        }

        const retryAfterMs = extractRetryAfterMs(err);
        const backoffMs = retryAfterMs ?? this.calculateBackoff(attempt);
        const jitteredMs = this.addJitter(backoffMs);

        await this.sleep(jitteredMs);
      }
    }

    throw lastError;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private calculateBackoff(attempt: number): number {
    const raw = this.options.baseDelay * this.options.backoffMultiplier ** attempt;
    return Math.min(raw, this.options.maxDelay);
  }

  /** Add ±20 % jitter to a delay value. */
  private addJitter(delay: number): number {
    return delay * (1 + (Math.random() * 0.4 - 0.2));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ---------------------------------------------------------------------------
// Error classification helpers
// ---------------------------------------------------------------------------

interface ErrorWithStatus {
  status?: number;
  statusCode?: number;
  headers?: { get(name: string): string | null } | Record<string, string>;
}

function isErrorWithStatus(err: unknown): err is ErrorWithStatus {
  return (
    typeof err === "object" &&
    err !== null &&
    ("status" in err || "statusCode" in err || "headers" in err)
  );
}

function isTransientError(err: unknown): boolean {
  if (!isErrorWithStatus(err)) {
    // Non-structured errors (network timeouts, etc.) are treated as transient.
    return true;
  }

  const status = err.status ?? err.statusCode;
  if (status === 429 || (status !== undefined && status >= 500)) {
    return true;
  }

  return false;
}

/**
 * Extract a `Retry-After` value (in ms) from an error's headers, if present.
 *
 * The header may be a number of seconds or an HTTP-date string.
 */
function extractRetryAfterMs(err: unknown): number | undefined {
  if (!isErrorWithStatus(err)) {
    return undefined;
  }

  const headers = err.headers;
  if (!headers) {
    return undefined;
  }

  let headerValue: string | null;

  if (typeof headers.get === "function") {
    headerValue = headers.get("retry-after");
  } else {
    headerValue = (headers as Record<string, string>)["retry-after"] ?? null;
  }

  if (!headerValue) {
    return undefined;
  }

  // Numeric seconds.
  const numeric = Number(headerValue);
  if (!Number.isNaN(numeric)) {
    return numeric * 1000;
  }

  // HTTP-date fallback.
  const dateMs = Date.parse(headerValue);
  if (!Number.isNaN(dateMs)) {
    return Math.max(0, dateMs - Date.now());
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a new {@link RateLimiter} with the given (or default) options.
 *
 * @example
 * ```ts
 * const limiter = createRateLimiter({ baseDelay: 1000, maxRetries: 5 })
 * const html = await limiter.executeWithRetry(() => fetchPage(url), 'example.com')
 * ```
 */
export function createRateLimiter(options: Partial<RateLimiterOptions> = {}): RateLimiter {
  return new RateLimiter(options);
}
