/**
 * Two-level rate limiter: global (per second) + per-chat (per minute).
 * Uses token bucket algorithm — no race conditions with async.
 */
export class RateLimiter {
  private globalTokens: number;
  private globalMax: number;
  private globalLastRefill: number;

  private chatBuckets = new Map<string, { tokens: number; lastRefill: number }>();
  private chatMax: number;

  constructor(globalPerSecond: number, perChatPerMinute: number) {
    this.globalMax = globalPerSecond;
    this.globalTokens = globalPerSecond;
    this.globalLastRefill = Date.now();
    this.chatMax = perChatPerMinute;
  }

  /**
   * Wait until a request to the given chat is allowed.
   * Returns the delay in ms that was waited (0 if immediate).
   */
  async acquire(chatId?: string): Promise<number> {
    let totalWait = 0;

    // Global bucket
    totalWait += await this.acquireGlobal();

    // Per-chat bucket (only for send-like operations)
    if (chatId) {
      totalWait += await this.acquireChat(String(chatId));
    }

    return totalWait;
  }

  private async acquireGlobal(): Promise<number> {
    this.refillGlobal();

    if (this.globalTokens >= 1) {
      this.globalTokens -= 1;
      return 0;
    }

    // Wait for one token to refill
    const waitMs = Math.ceil(1000 / this.globalMax);
    await sleep(waitMs);
    this.refillGlobal();
    this.globalTokens = Math.max(0, this.globalTokens - 1);
    return waitMs;
  }

  private refillGlobal(): void {
    const now = Date.now();
    const elapsed = now - this.globalLastRefill;
    const refill = (elapsed / 1000) * this.globalMax;
    this.globalTokens = Math.min(this.globalMax, this.globalTokens + refill);
    this.globalLastRefill = now;
  }

  private async acquireChat(chatId: string): Promise<number> {
    let bucket = this.chatBuckets.get(chatId);
    if (!bucket) {
      bucket = { tokens: this.chatMax, lastRefill: Date.now() };
      this.chatBuckets.set(chatId, bucket);
    }

    // Refill based on elapsed time
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const refill = (elapsed / 60000) * this.chatMax;
    bucket.tokens = Math.min(this.chatMax, bucket.tokens + refill);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return 0;
    }

    // Wait for one token
    const waitMs = Math.ceil(60000 / this.chatMax);
    await sleep(waitMs);
    bucket.tokens = 0;
    bucket.lastRefill = Date.now();
    return waitMs;
  }

  /** Clean up stale per-chat buckets (call periodically). */
  cleanup(): void {
    const cutoff = Date.now() - 120_000; // 2 minutes
    for (const [chatId, bucket] of this.chatBuckets) {
      if (bucket.lastRefill < cutoff) {
        this.chatBuckets.delete(chatId);
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
