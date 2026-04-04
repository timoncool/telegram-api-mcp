/**
 * Circuit breaker to prevent cascading failures when Telegram API is down.
 *
 * States:
 * - CLOSED: normal operation, requests pass through
 * - OPEN: too many failures, requests fail immediately
 * - HALF_OPEN: cooldown expired, allow one probe request
 *
 * 429 (rate limit) does NOT count as a failure — it's expected behavior.
 */
export type CircuitState = "closed" | "open" | "half_open";

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private threshold: number;
  private cooldownMs: number;

  constructor(threshold: number, cooldownMs: number) {
    this.threshold = threshold;
    this.cooldownMs = cooldownMs;
  }

  /** Check if request is allowed. Throws if circuit is open. */
  check(): void {
    if (this.state === "closed") return;

    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime >= this.cooldownMs) {
        this.state = "half_open";
        return; // Allow probe request
      }
      throw new CircuitOpenError(
        `Circuit breaker is OPEN. ${this.failureCount} consecutive failures. ` +
          `Will retry in ${Math.ceil((this.cooldownMs - (Date.now() - this.lastFailureTime)) / 1000)}s.`
      );
    }

    // half_open — allow through
  }

  /** Record a successful response. Resets the breaker. */
  recordSuccess(): void {
    this.failureCount = 0;
    this.state = "closed";
  }

  /**
   * Record a failure. Does NOT count 429 as failure.
   * Returns true if the circuit just opened.
   */
  recordFailure(statusCode?: number): boolean {
    // 429 is rate limiting, not a server failure
    if (statusCode === 429) return false;

    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = "open";
      return true;
    }

    return false;
  }

  getState(): CircuitState {
    return this.state;
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircuitOpenError";
  }
}
