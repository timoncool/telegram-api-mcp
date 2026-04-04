import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../src/config.js";

describe("Config", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws without TELEGRAM_BOT_TOKEN", () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    expect(() => loadConfig()).toThrow("TELEGRAM_BOT_TOKEN is required");
  });

  it("loads minimal config with just token", () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    const config = loadConfig();
    expect(config.botToken).toBe("123:abc");
    expect(config.globalRateLimit).toBe(30);
    expect(config.perChatRateLimit).toBe(20);
    expect(config.maxRetries).toBe(3);
    expect(config.metaMode).toBe(false);
    expect(config.allowedUploadDirs).toEqual([]);
  });

  it("loads all optional values", () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:abc";
    process.env.TELEGRAM_DEFAULT_CHAT_ID = "-100123";
    process.env.TELEGRAM_DEFAULT_THREAD_ID = "42";
    process.env.TELEGRAM_META_MODE = "true";
    process.env.TELEGRAM_GLOBAL_RATE_LIMIT = "10";
    process.env.TELEGRAM_PER_CHAT_RATE_LIMIT = "5";
    process.env.TELEGRAM_MAX_RETRIES = "5";
    process.env.TELEGRAM_ALLOWED_UPLOAD_DIRS = "/tmp,/home/user/uploads";

    const config = loadConfig();
    expect(config.defaultChatId).toBe("-100123");
    expect(config.defaultThreadId).toBe(42);
    expect(config.metaMode).toBe(true);
    expect(config.globalRateLimit).toBe(10);
    expect(config.perChatRateLimit).toBe(5);
    expect(config.maxRetries).toBe(5);
    expect(config.allowedUploadDirs).toEqual(["/tmp", "/home/user/uploads"]);
  });
});
