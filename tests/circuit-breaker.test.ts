import { describe, it, expect } from "vitest";
import { CircuitBreaker, CircuitOpenError } from "../src/circuit-breaker.js";

describe("CircuitBreaker", () => {
  it("starts in closed state", () => {
    const cb = new CircuitBreaker(3, 1000);
    expect(cb.getState()).toBe("closed");
    expect(() => cb.check()).not.toThrow();
  });

  it("opens after threshold failures", () => {
    const cb = new CircuitBreaker(3, 1000);
    cb.recordFailure(500);
    cb.recordFailure(500);
    const opened = cb.recordFailure(500);
    expect(opened).toBe(true);
    expect(cb.getState()).toBe("open");
    expect(() => cb.check()).toThrow(CircuitOpenError);
  });

  it("does not count 429 as failure", () => {
    const cb = new CircuitBreaker(2, 1000);
    cb.recordFailure(429);
    cb.recordFailure(429);
    cb.recordFailure(429);
    expect(cb.getState()).toBe("closed");
    expect(cb.getFailureCount()).toBe(0);
  });

  it("resets on success", () => {
    const cb = new CircuitBreaker(3, 1000);
    cb.recordFailure(500);
    cb.recordFailure(500);
    cb.recordSuccess();
    expect(cb.getFailureCount()).toBe(0);
    expect(cb.getState()).toBe("closed");
  });

  it("transitions to half-open after cooldown", async () => {
    const cb = new CircuitBreaker(1, 50); // 50ms cooldown
    cb.recordFailure(500);
    expect(cb.getState()).toBe("open");

    await new Promise((r) => setTimeout(r, 60));
    expect(() => cb.check()).not.toThrow(); // half-open
    expect(cb.getState()).toBe("half_open");
  });

  it("closes from half-open on success", async () => {
    const cb = new CircuitBreaker(1, 50);
    cb.recordFailure(500);
    await new Promise((r) => setTimeout(r, 60));
    cb.check(); // half-open
    cb.recordSuccess();
    expect(cb.getState()).toBe("closed");
  });

  it("reopens from half-open on failure", async () => {
    const cb = new CircuitBreaker(3, 50);
    // Open the circuit
    cb.recordFailure(500);
    cb.recordFailure(500);
    cb.recordFailure(500);
    expect(cb.getState()).toBe("open");

    // Wait for cooldown → half-open
    await new Promise((r) => setTimeout(r, 60));
    cb.check();
    expect(cb.getState()).toBe("half_open");

    // Failure in half-open → immediately back to open
    const opened = cb.recordFailure(500);
    expect(opened).toBe(true);
    expect(cb.getState()).toBe("open");
  });
});
