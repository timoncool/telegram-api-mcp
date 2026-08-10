import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { allMethods, findMethodByToolName, findMethodByApiName, searchMethods } from "../src/methods/index.js";
import { buildZodSchema, buildJsonSchema, RICH_MESSAGE_LIMITS } from "../src/method-registry.js";

/** Source of truth is the docs mirror, not a hardcoded number that rots on every release. */
const officialMethods = readFileSync(resolve(__dirname, "../docs/official-method-list.txt"), "utf-8")
  .trim().split("\n").map((s) => s.trim()).filter(Boolean);

describe("Method Registry", () => {
  it("implements every method in the docs mirror", () => {
    expect(allMethods.length).toBe(officialMethods.length);
  });

  it("covers 100% of official Bot API methods", () => {
    const official = officialMethods;
    const ourSet = new Set(allMethods.map((m) => m.apiMethod));

    const missing = official.filter((m) => !ourSet.has(m));
    const extra = [...ourSet].filter((m) => !official.includes(m));

    expect(missing, `Missing methods: ${missing.join(", ")}`).toEqual([]);
    expect(extra, `Extra methods not in official API: ${extra.join(", ")}`).toEqual([]);
  });

  it("all methods have unique tool names", () => {
    const names = allMethods.map((m) => m.toolName);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it("all methods have unique API method names", () => {
    const names = allMethods.map((m) => m.apiMethod);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it("all methods have descriptions", () => {
    for (const m of allMethods) {
      expect(m.description.length).toBeGreaterThan(10);
    }
  });

  it("all methods have valid categories", () => {
    const validCategories = new Set([
      "updates", "bot", "messages", "editing", "forwarding", "media", "polls",
      "chat", "members", "invite", "forum", "stickers", "inline", "payments",
      "business", "stories", "gifts", "games", "passport", "managed_bots", "other",
    ]);
    for (const m of allMethods) {
      expect(validCategories.has(m.category), `Invalid category "${m.category}" for ${m.toolName}`).toBe(true);
    }
  });

  it("builds valid Zod schemas for all methods", () => {
    for (const m of allMethods) {
      const schema = buildZodSchema(m.params);
      expect(schema).toBeDefined();
      expect(schema.safeParse).toBeTypeOf("function");
    }
  });

  it("validates sendMessage params correctly", () => {
    const method = findMethodByApiName("sendMessage")!;
    expect(method).toBeDefined();
    const schema = buildZodSchema(method.params);

    // Valid
    const valid = schema.safeParse({ chat_id: 123, text: "hello" });
    expect(valid.success).toBe(true);

    // Missing required text
    const invalid = schema.safeParse({ chat_id: 123 });
    expect(invalid.success).toBe(false);

    // Text too long
    const tooLong = schema.safeParse({ chat_id: 123, text: "x".repeat(4097) });
    expect(tooLong.success).toBe(false);
  });

  it("validates sendPoll with v9.6 params", () => {
    const method = findMethodByApiName("sendPoll")!;
    expect(method).toBeDefined();
    const schema = buildZodSchema(method.params);

    const valid = schema.safeParse({
      chat_id: 123,
      question: "Favorite color?",
      options: [{ text: "Red" }, { text: "Blue" }],
      allows_revoting: true,
      shuffle_options: true,
      description: "Pick your favorite",
    });
    expect(valid.success).toBe(true);
  });

  it("findMethodByToolName works", () => {
    const m = findMethodByToolName("send_message");
    expect(m).toBeDefined();
    expect(m!.apiMethod).toBe("sendMessage");
  });

  it("findMethodByApiName works", () => {
    const m = findMethodByApiName("banChatMember");
    expect(m).toBeDefined();
    expect(m!.toolName).toBe("ban_chat_member");
  });

  it("searchMethods finds by keyword", () => {
    const results = searchMethods("sticker");
    expect(results.length).toBeGreaterThan(5);
  });

  it("searchMethods finds by category", () => {
    const results = searchMethods("forum");
    expect(results.length).toBeGreaterThanOrEqual(12);
  });

  it("all methods have annotations", () => {
    for (const m of allMethods) {
      expect(m.annotations, `Missing annotations for ${m.toolName}`).toBeDefined();
      expect(typeof m.annotations!.readOnlyHint).toBe("boolean");
      expect(typeof m.annotations!.destructiveHint).toBe("boolean");
    }
  });

  it("read-only methods are marked correctly", () => {
    const readOnlyMethods = ["getMe", "getChat", "getFile", "getMyCommands", "getWebhookInfo"];
    for (const name of readOnlyMethods) {
      const m = findMethodByApiName(name)!;
      expect(m.annotations?.readOnlyHint, `${name} should be readOnly`).toBe(true);
      expect(m.annotations?.destructiveHint, `${name} should not be destructive`).toBe(false);
    }
  });

  it("destructive methods are marked correctly", () => {
    const destructiveMethods = ["deleteMessage", "banChatMember", "deleteStickerSet", "leaveChat"];
    for (const name of destructiveMethods) {
      const m = findMethodByApiName(name)!;
      expect(m.annotations?.destructiveHint, `${name} should be destructive`).toBe(true);
    }
  });

  it("send methods are not destructive", () => {
    const sendMethods = ["sendMessage", "sendPhoto", "sendPoll", "forwardMessage"];
    for (const name of sendMethods) {
      const m = findMethodByApiName(name)!;
      expect(m.annotations?.destructiveHint, `${name} should not be destructive`).toBe(false);
    }
  });

  it("validates rich messages against the documented limits", () => {
    const method = findMethodByApiName("sendRichMessage")!;
    expect(method).toBeDefined();
    const schema = buildZodSchema(method.params);

    const markdown = schema.safeParse({
      chat_id: 123,
      rich_message: { markdown: "# Title\n\n| a | b |\n|---|---|\n| 1 | 2 |" },
    });
    expect(markdown.success).toBe(true);

    // Exactly one of blocks/html/markdown
    expect(schema.safeParse({ chat_id: 123, rich_message: { markdown: "x", html: "<p>x</p>" } }).success).toBe(false);
    expect(schema.safeParse({ chat_id: 123, rich_message: {} }).success).toBe(false);

    // A rich message carries far more than a 1024-char caption
    const long = schema.safeParse({ chat_id: 123, rich_message: { markdown: "x".repeat(20000) } });
    expect(long.success).toBe(true);

    const tooLong = schema.safeParse({
      chat_id: 123,
      rich_message: { markdown: "x".repeat(RICH_MESSAGE_LIMITS.text + 1) },
    });
    expect(tooLong.success).toBe(false);

    const tooManyMedia = schema.safeParse({
      chat_id: 123,
      rich_message: { markdown: "x", media: Array.from({ length: RICH_MESSAGE_LIMITS.media + 1 }, () => ({ type: "photo" })) },
    });
    expect(tooManyMedia.success).toBe(false);
  });

  it("counts nested rich blocks towards the block limit", () => {
    const schema = buildZodSchema(findMethodByApiName("sendRichMessage")!.params);
    const nested = Array.from({ length: 2 }, () => ({
      type: "list",
      items: Array.from({ length: 200 }, () => ({ type: "paragraph", text: "item" })),
    }));
    // 2 outer + 400 nested = 402, under the limit
    expect(schema.safeParse({ chat_id: 123, rich_message: { blocks: nested } }).success).toBe(true);

    const overflowing = Array.from({ length: 3 }, () => ({
      type: "list",
      items: Array.from({ length: 200 }, () => ({ type: "paragraph", text: "item" })),
    }));
    expect(schema.safeParse({ chat_id: 123, rich_message: { blocks: overflowing } }).success).toBe(false);
  });

  it("advertises object params as objects, not strings", () => {
    // .superRefine() wraps a schema in ZodEffects; unwrapped, rich_message would be
    // published to MCP clients as `type: "string"` and agents would send a string.
    const schema = buildJsonSchema(findMethodByApiName("sendRichMessage")!.params);
    const richMessage = schema.properties as Record<string, Record<string, unknown>>;
    expect(richMessage.rich_message.type).toBe("object");
    expect(Object.keys(richMessage.rich_message.properties as object)).toContain("markdown");
  });

  it("uses message_effect_id, not the effect_id that Telegram rejects", () => {
    for (const name of ["sendMessage", "sendPhoto", "sendVideo", "sendGame"]) {
      const params = findMethodByApiName(name)!.params.map((p) => p.name);
      expect(params, `${name} should expose message_effect_id`).toContain("message_effect_id");
      expect(params, `${name} should not expose effect_id`).not.toContain("effect_id");
    }
  });

  it("covers all major Bot API 10.2 methods", () => {
    const criticalMethods = [
      "sendRichMessage", "sendRichMessageDraft", "sendLivePhoto",
      "editEphemeralMessageText", "deleteEphemeralMessage",
      "deleteMessageReaction", "deleteAllMessageReactions",
      "answerGuestQuery", "answerChatJoinRequestQuery", "sendChatJoinRequestWebApp",
      "getManagedBotAccessSettings", "setManagedBotAccessSettings", "getUserPersonalChatMessages",
      "sendMessage", "sendPhoto", "sendVideo", "sendPoll", "sendMediaGroup",
      "editMessageText", "deleteMessage", "forwardMessage", "copyMessage",
      "banChatMember", "promoteChatMember", "setChatMemberTag",
      "createForumTopic", "sendSticker", "createNewStickerSet",
      "sendInvoice", "getStarTransactions",
      "postStory", "editStory", "sendGift",
      "sendGame", "answerInlineQuery", "answerCallbackQuery",
      "getManagedBotToken", "replaceManagedBotToken", "savePreparedKeyboardButton",
      "getMe", "setMyCommands", "getFile",
      "getUpdates", "setWebhook",
      "sendChecklist",
      "approveSuggestedPost", "getUserProfileAudios",
    ];

    for (const name of criticalMethods) {
      expect(findMethodByApiName(name), `Missing method: ${name}`).toBeDefined();
    }
  });
});
