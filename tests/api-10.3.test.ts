import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import { TelegramClient } from "../src/telegram-client.js";
import { allMethods, findMethodByApiName } from "../src/methods/index.js";
import { buildZodSchema } from "../src/method-registry.js";
import { collectFileReferences } from "../src/file-uploads.js";
import type { Config } from "../src/config.js";

const config: Config = {
  botToken: "TEST_ONLY", globalRateLimit: 10000, perChatRateLimit: 10000,
  maxRetries: 0, circuitBreakerThreshold: 5, circuitBreakerCooldown: 30000,
  allowedUploadDirs: [], maxFileSize: 52428800, metaMode: false,
};

describe("Bot API 10.3 specification", () => {
  const spec = JSON.parse(readFileSync(new URL("../docs/api-params.json", import.meta.url), "utf8"));
  it.each(allMethods)("$apiMethod exposes every documented parameter with correct requiredness", (method) => {
    expect(method.params.map(({ name, required }) => ({ name, required })).sort((a, b) => a.name.localeCompare(b.name)))
      .toEqual(spec[method.apiMethod].params.map(({ name, required }: { name: string; required: boolean }) => ({ name, required }))
        .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)));
  });

  it("does not silently discard unknown or obsolete parameters", () => {
    const schema = buildZodSchema(findMethodByApiName("sendMessage")!.params);
    expect(schema.safeParse({ chat_id: 1, text: "hello", receiver_user_id: 2 }).success).toBe(false);
  });

  it("requires untyped structured parameters too", () => {
    expect(buildZodSchema(findMethodByApiName("postStory")!.params)
      .safeParse({ business_connection_id: "test", active_period: 86400 }).success).toBe(false);
  });
});

describe.each([false, true])("MCP transport, metaMode=%s", (metaMode) => {
  let telegram: TelegramClient;
  let client: Client;
  let directory: string;
  let file: string;
  let captured: { method: string; body: unknown }[];

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "telegram-coverage-test-"));
    file = join(directory, "fixture.jpg");
    await writeFile(file, "test file bytes");
    captured = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      captured.push({ method: String(url).split("/").pop()!, body: init.body });
      return { json: async () => ({ ok: true, result: true }) };
    }));
    telegram = new TelegramClient({ ...config, metaMode, allowedUploadDirs: [directory] });
    const server = createServer({ ...config, metaMode }, telegram);
    client = new Client({ name: "coverage-test", version: "1" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterEach(async () => {
    await client.close();
    telegram.destroy();
    vi.unstubAllGlobals();
    await rm(directory, { recursive: true, force: true });
  });

  async function call(method: string, params: Record<string, unknown>) {
    const result = await client.callTool(metaMode
      ? { name: "telegram_call", arguments: { method, params } }
      : { name: findMethodByApiName(method)!.toolName, arguments: params });
    expect(result.isError, JSON.stringify(result)).not.toBe(true);
    return result;
  }

  it("preserves ephemeral recipient settings in the actual HTTP request", async () => {
    const params = { chat_id: 1, text: "hello", ephemeral_message_parameters: {
      receiver_user_id: 2, callback_query_id: "callback", replace_callback_query_message: true,
    } };
    await call("sendMessage", params);
    expect(JSON.parse(captured[0].body as string)).toEqual(params);
  });

  it("accepts an empty draft and forwards generation controls", async () => {
    const params = { chat_id: 1, draft_id: 5, text: "", can_stop: true, keep_on_stop: true };
    await call("sendMessageDraft", params);
    expect(JSON.parse(captured[0].body as string)).toEqual(params);
  });

  it.each([
    ["sendRichMessageDraft", { chat_id: 1, draft_id: 5, rich_message: { markdown: "Partial" }, can_stop: true, keep_on_stop: true }],
    ["promoteChatMember", { chat_id: 1, user_id: 2, can_send_welcome_messages: true }],
    ["editEphemeralMessageCaption", { chat_id: 1, receiver_user_id: 2, ephemeral_message_id: 3, caption: "Updated", show_caption_above_media: true }],
  ] as [string, Record<string, unknown>][])("%s forwards its new options", async (method, params) => {
    await call(method, params);
    expect(JSON.parse(captured[0].body as string)).toEqual(params);
  });

  it("edits ephemeral messages with rich content and no plain text", async () => {
    const params = { chat_id: 1, receiver_user_id: 2, ephemeral_message_id: 3, rich_message: { markdown: "# Updated" } };
    await call("editEphemeralMessageText", params);
    expect(JSON.parse(captured[0].body as string)).toEqual(params);
  });

  it("rejects unknown parameters before making a request", async () => {
    const request = metaMode
      ? { name: "telegram_call", arguments: { method: "sendMessage", params: { chat_id: 1, text: "test", unsupported: true } } }
      : { name: "send_message", arguments: { chat_id: 1, text: "test", unsupported: true } };
    const result = await client.callTool(request);
    expect(result.isError).toBe(true);
    expect(captured).toHaveLength(0);
  });

  const uploads: [string, (path: string) => Record<string, unknown>, string][] = [
    ["postStory", (photo) => ({ business_connection_id: "test", content: { type: "photo", photo }, active_period: 86400 }), "content"],
    ["editStory", (video) => ({ business_connection_id: "test", story_id: 1, content: { type: "video", video } }), "content"],
    ["setMyProfilePhoto", (photo) => ({ photo: { type: "static", photo } }), "photo"],
    ["setBusinessAccountProfilePhoto", (animation) => ({ business_connection_id: "test", photo: { type: "animated", animation } }), "photo"],
    ["createNewStickerSet", (sticker) => ({ user_id: 1, name: "test_by_bot", title: "Test", stickers: [{ sticker, format: "static", emoji_list: ["🙂"] }] }), "stickers"],
    ["addStickerToSet", (sticker) => ({ user_id: 1, name: "test_by_bot", sticker: { sticker, format: "static", emoji_list: ["🙂"] } }), "sticker"],
    ["replaceStickerInSet", (sticker) => ({ user_id: 1, name: "test_by_bot", old_sticker: "existing-id", sticker: { sticker, format: "static", emoji_list: ["🙂"] } }), "sticker"],
    ["sendPoll", (media) => ({ chat_id: 1, question: "Choose", options: [{ text: "One", media: { type: "photo", media } }] }), "options"],
    ["sendPaidMedia", (media) => ({ chat_id: 1, star_count: 1, media: [{ type: "photo", media }] }), "media"],
    ["editEphemeralMessageMedia", (media) => ({ chat_id: 1, receiver_user_id: 2, ephemeral_message_id: 3, media: { type: "photo", media } }), "media"],
    ["sendRichMessage", (media) => ({ chat_id: 1, rich_message: { blocks: [{ type: "details", blocks: [{ type: "document", document: { type: "document", media } }] }] } }), "rich_message"],
  ];
  it.each(uploads)("%s transmits nested file bytes through MCP", async (method, params, container) => {
    await call(method, params(file));
    const body = captured[0].body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(await (body.get("file0") as Blob).text()).toBe("test file bytes");
    expect(body.get(container)).toContain("attach://file0");
    expect(body.get(container)).not.toContain(file);
  });

  it("uploads both halves of live photos with distinct attachment names", async () => {
    await call("sendMediaGroup", { chat_id: 1, media: [
      { type: "live_photo", media: file, photo: file }, { type: "photo", media: "existing-file-id" },
    ] });
    const form = captured[0].body as FormData;
    expect(form.get("file0")).toBeInstanceOf(Blob);
    expect(form.get("file1")).toBeInstanceOf(Blob);
    expect(JSON.parse(form.get("media") as string)).toEqual([
      { type: "live_photo", media: "attach://file0", photo: "attach://file1" }, { type: "photo", media: "existing-file-id" },
    ]);
  });

  it("preserves the new rich-message block and keyboard fields", async () => {
    const params = { chat_id: 1, rich_message: { blocks: [
      { type: "buttons", buttons: [{ text: "Wait", disabled: {} }] },
    ] }, ephemeral_message_parameters: { receiver_user_id: 2 },
    reply_markup: { inline_keyboard: [[{ text: "Wait", disabled: {} }]], force_reply: true } };
    await call("sendRichMessage", params);
    expect(JSON.parse(captured[0].body as string)).toEqual(params);
  });

  it("does not mix concurrent URL downloads with the same filename", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).startsWith("https://cdn.example.com")) {
        return new Response(new URL(url).searchParams.get("id"), { headers: { "content-type": "image/jpeg" } });
      }
      captured.push({ method: String(url).split("/").pop()!, body: init!.body });
      return { json: async () => ({ ok: true, result: true }) };
    }));
    await Promise.all(["first", "second"].map((id) => call("postStory", {
      business_connection_id: id, active_period: 86400,
      content: { type: "photo", photo: `https://cdn.example.com/photo.jpg?id=${id}` },
    })));
    expect(captured).toHaveLength(2);
    for (const request of captured) {
      const body = request.body as FormData;
      expect(await (body.get("file0") as Blob).text()).toBe(body.get("business_connection_id"));
    }
  });

  it("returns large update batches without cutting off their JSON", async () => {
    const updates = [{ update_id: 1, message: { text: "x".repeat(120000) } }];
    vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ ok: true, result: updates }) })));
    const result = await call("getUpdates", {});
    const content = result.content as { type: string; text: string }[];
    expect(JSON.parse(content[0].text)).toEqual(updates);
  });
});

describe("Upload discovery boundaries", () => {
  it("leaves ordinary strings, URLs and file IDs untouched", () => {
    const params = { chat_id: 1, text: "/tmp/private.txt", reply_markup: { inline_keyboard: [[{ text: "Open", url: "https://example.com" }]] } };
    expect(collectFileReferences("sendMessage", params)).toEqual([]);
    expect(collectFileReferences("deleteStickerFromSet", { sticker: "/tmp/private.txt" })).toEqual([]);
  });
});
