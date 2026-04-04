import { describe, it, expect, vi, beforeEach } from "vitest";
import { TelegramClient, TelegramApiError } from "../src/telegram-client.js";
import { Config } from "../src/config.js";

function makeConfig(overrides: Partial<Config> = {}): Config {
  return {
    botToken: "123:test-token",
    globalRateLimit: 100,
    perChatRateLimit: 100,
    maxRetries: 1,
    circuitBreakerThreshold: 5,
    circuitBreakerCooldown: 30000,
    allowedUploadDirs: [],
    maxFileSize: 50 * 1024 * 1024,
    metaMode: false,
    ...overrides,
  };
}

describe("TelegramClient", () => {
  let client: TelegramClient;

  beforeEach(() => {
    client = new TelegramClient(makeConfig());
  });

  it("applies default chat_id", async () => {
    const clientWithDefault = new TelegramClient(makeConfig({ defaultChatId: "-100999" }));

    // Mock fetch to capture the request
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true, result: { message_id: 1 } }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await clientWithDefault.call("sendMessage", { text: "hello" });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.chat_id).toBe("-100999");

    vi.unstubAllGlobals();
    clientWithDefault.destroy();
  });

  it("does not override explicit chat_id with default", async () => {
    const clientWithDefault = new TelegramClient(makeConfig({ defaultChatId: "-100999" }));

    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true, result: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await clientWithDefault.call("sendMessage", { chat_id: 42, text: "hello" });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.chat_id).toBe(42);

    vi.unstubAllGlobals();
    clientWithDefault.destroy();
  });

  it("throws TelegramApiError on API error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        ok: false,
        error_code: 400,
        description: "Bad Request: chat not found",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(client.call("sendMessage", { chat_id: 1, text: "hi" }))
      .rejects.toThrow(TelegramApiError);

    vi.unstubAllGlobals();
  });

  it("masks token in error messages", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        ok: false,
        error_code: 400,
        description: "Unauthorized: token 123:test-token is invalid",
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    try {
      await client.call("getMe", {});
    } catch (e) {
      expect((e as Error).message).not.toContain("123:test-token");
      expect((e as Error).message).toContain("***");
    }

    vi.unstubAllGlobals();
  });

  it("retries on 429 with retry_after", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          json: () => Promise.resolve({
            ok: false,
            error_code: 429,
            description: "Too Many Requests",
            parameters: { retry_after: 0 }, // 0 seconds for fast test
          }),
        });
      }
      return Promise.resolve({
        json: () => Promise.resolve({ ok: true, result: true }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const clientRetry = new TelegramClient(makeConfig({ maxRetries: 3 }));
    const result = await clientRetry.call("getMe", {});
    expect(result).toBe(true);
    expect(callCount).toBe(2);

    vi.unstubAllGlobals();
    clientRetry.destroy();
  });

  afterEach(() => {
    client.destroy();
  });
});
