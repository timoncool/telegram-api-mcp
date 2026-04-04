import { describe, it, expect } from "vitest";
import { RateLimiter } from "../src/rate-limiter.js";

describe("RateLimiter", () => {
  it("allows immediate request when bucket is full", async () => {
    const limiter = new RateLimiter(30, 20);
    const waited = await limiter.acquire("chat1");
    expect(waited).toBe(0);
  });

  it("delays when global bucket is empty", async () => {
    const limiter = new RateLimiter(1, 20); // 1 req/sec
    await limiter.acquire(); // drain the token
    const start = Date.now();
    await limiter.acquire(); // should wait
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(500); // at least some delay
  });

  it("tracks per-chat rate independently", async () => {
    const limiter = new RateLimiter(100, 1); // 1 msg/min per chat
    await limiter.acquire("chatA"); // drain chatA
    // chatB should still be immediate
    const waited = await limiter.acquire("chatB");
    expect(waited).toBe(0);
  });

  it("cleans up stale chat buckets", async () => {
    const limiter = new RateLimiter(30, 20);
    await limiter.acquire("stale-chat");
    // Manually age the bucket
    const buckets = (limiter as any).chatBuckets as Map<string, { lastRefill: number }>;
    buckets.get("stale-chat")!.lastRefill = Date.now() - 200_000;
    limiter.cleanup();
    expect(buckets.has("stale-chat")).toBe(false);
  });

  it("works without chat_id (global only)", async () => {
    const limiter = new RateLimiter(30, 20);
    const waited = await limiter.acquire();
    expect(waited).toBe(0);
  });
});
