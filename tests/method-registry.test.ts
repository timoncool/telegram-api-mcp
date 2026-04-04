import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { allMethods, findMethodByToolName, findMethodByApiName, searchMethods } from "../src/methods/index.js";
import { buildZodSchema } from "../src/method-registry.js";

describe("Method Registry", () => {
  it("has exactly 169 methods (Bot API 9.6)", () => {
    expect(allMethods.length).toBe(169);
  });

  it("covers 100% of official Bot API methods", () => {
    const listPath = resolve(__dirname, "../docs/official-method-list.txt");
    const official = readFileSync(listPath, "utf-8").trim().split("\n").map((s) => s.trim()).filter(Boolean);
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

  it("covers all major Bot API 9.6 methods", () => {
    const criticalMethods = [
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
