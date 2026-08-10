import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  it("does not retry on 4xx errors (except 429)", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        json: () => Promise.resolve({
          ok: false,
          error_code: 400,
          description: "Bad Request: chat not found",
        }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(client.call("sendMessage", { chat_id: 1, text: "hi" }))
      .rejects.toThrow(TelegramApiError);
    expect(callCount).toBe(1); // No retry on 400

    vi.unstubAllGlobals();
  });

  it("applies default thread_id", async () => {
    const clientWithThread = new TelegramClient(makeConfig({ defaultThreadId: 42 }));

    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true, result: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await clientWithThread.call("sendMessage", { chat_id: 1, text: "hello" });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.message_thread_id).toBe(42);

    vi.unstubAllGlobals();
    clientWithThread.destroy();
  });

  it("does not override explicit thread_id with default", async () => {
    const clientWithThread = new TelegramClient(makeConfig({ defaultThreadId: 42 }));

    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true, result: true }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await clientWithThread.call("sendMessage", { chat_id: 1, text: "hello", message_thread_id: 99 });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.message_thread_id).toBe(99);

    vi.unstubAllGlobals();
    clientWithThread.destroy();
  });

  it("uploads local files inside sendMediaGroup via attach://", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tg-attach-"));
    const first = join(dir, "a.jpg");
    const second = join(dir, "b.jpg");
    await writeFile(first, Buffer.from([0xff, 0xd8, 0xff]));
    await writeFile(second, Buffer.from([0xff, 0xd8, 0xff]));

    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true, result: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await client.call("sendMediaGroup", {
      chat_id: 1,
      media: [
        { type: "photo", media: first, caption: "a" },
        { type: "photo", media: second },
      ],
    });

    const form = mockFetch.mock.calls[0][1].body as FormData;
    const media = JSON.parse(form.get("media") as string);
    expect(media[0].media).toBe("attach://file0");
    expect(media[1].media).toBe("attach://file1");
    expect(form.get("file0")).toBeInstanceOf(Blob);
    expect(form.get("file1")).toBeInstanceOf(Blob);

    vi.unstubAllGlobals();
    await rm(dir, { recursive: true, force: true });
  });

  it("accepts media passed as a JSON string", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ ok: true, result: [] }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await client.call("sendMediaGroup", {
      chat_id: 1,
      media: JSON.stringify([{ type: "photo", media: "https://example.com/a.jpg" }]),
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(Array.isArray(body.media)).toBe(true);
    expect(body.media[0].media).toBe("https://example.com/a.jpg");

    vi.unstubAllGlobals();
  });

  it("re-uploads a URL that Telegram could not fetch itself", async () => {
    // Telegram caps URL fetching at 20 MB (5 MB for photos); multipart goes to 50 MB.
    const videoBytes = Buffer.alloc(64, 7);
    const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (String(url).startsWith("https://cdn.example.com/")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "video/mp4" }),
          arrayBuffer: () => Promise.resolve(videoBytes.buffer.slice(0)),
        });
      }
      const isUpload = init?.body instanceof FormData;
      return Promise.resolve({
        json: () => Promise.resolve(
          isUpload
            ? { ok: true, result: { message_id: 7 } }
            : { ok: false, error_code: 400, description: "Bad Request: failed to get HTTP URL content" }
        ),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await client.call("sendVideo", {
      chat_id: 1,
      video: "https://cdn.example.com/clip.mp4",
    });

    expect(result).toEqual({ message_id: 7 });
    const uploadCall = mockFetch.mock.calls.find((c) => c[1]?.body instanceof FormData)!;
    expect((uploadCall[1].body as FormData).get("video")).toBeInstanceOf(Blob);

    vi.unstubAllGlobals();
  });

  it("does not re-upload when the failure is unrelated to the URL", async () => {
    let apiCalls = 0;
    const mockFetch = vi.fn().mockImplementation(() => {
      apiCalls++;
      return Promise.resolve({
        json: () => Promise.resolve({ ok: false, error_code: 400, description: "Bad Request: chat not found" }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(client.call("sendVideo", { chat_id: 1, video: "https://cdn.example.com/clip.mp4" }))
      .rejects.toThrow(/chat not found/);
    expect(apiCalls).toBe(1);

    vi.unstubAllGlobals();
  });

  it("refuses to mirror a file larger than the upload limit", async () => {
    const small = new TelegramClient(makeConfig({ maxFileSize: 32 }));
    const mockFetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (String(url).startsWith("https://cdn.example.com/")) {
        return Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "video/mp4" }),
          arrayBuffer: () => Promise.resolve(Buffer.alloc(1024).buffer.slice(0)),
        });
      }
      void init;
      return Promise.resolve({
        json: () => Promise.resolve({ ok: false, error_code: 400, description: "Bad Request: file is too big" }),
      });
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(small.call("sendVideo", { chat_id: 1, video: "https://cdn.example.com/big.mp4" }))
      .rejects.toThrow(/upload limit/);

    vi.unstubAllGlobals();
    small.destroy();
  });

  afterEach(() => {
    client.destroy();
  });
});
