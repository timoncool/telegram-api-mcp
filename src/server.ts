import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Config } from "./config.js";
import { TelegramClient, TelegramApiError } from "./telegram-client.js";
import { MethodDef, buildZodSchema } from "./method-registry.js";
import { allMethods, searchMethods, findMethodByApiName } from "./methods/index.js";
import { CircuitOpenError } from "./circuit-breaker.js";
import { logPost, getPostHistory } from "./post-log.js";

/** Pre-built Zod schemas for all methods (built once, reused on every call). */
const schemaCache = new Map<string, ReturnType<typeof buildZodSchema>>();

function getSchema(method: MethodDef): ReturnType<typeof buildZodSchema> {
  let schema = schemaCache.get(method.apiMethod);
  if (!schema) {
    schema = buildZodSchema(method.params);
    schemaCache.set(method.apiMethod, schema);
  }
  return schema;
}

export async function startServer(config: Config): Promise<void> {
  const client = new TelegramClient(config);

  const server = new McpServer({
    name: "telegram-api-mcp",
    version: "0.1.0",
  });

  // Log before connect (connect blocks on stdio transport)
  log("info", `Starting server in ${config.metaMode ? "meta" : "standard"} mode with ${allMethods.length} methods`);

  if (config.metaMode) {
    registerMetaTools(server, client);
  } else {
    registerAllTools(server, client);
  }

  registerPostHistoryTool(server);

  const shutdown = () => {
    client.destroy();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// ─── Standard Mode ──────────────────────────────────────────────────────

function registerAllTools(server: McpServer, client: TelegramClient): void {
  for (const method of allMethods) {
    const zodSchema = getSchema(method);

    const annotations = method.annotations || { destructiveHint: false };

    server.tool(
      method.toolName,
      method.description,
      zodSchema.shape,
      annotations,
      async (params) => {
        return callTelegram(client, method, params as Record<string, unknown>);
      }
    );
  }
}

// ─── Meta Mode ──────────────────────────────────────────────────────────

function registerMetaTools(server: McpServer, client: TelegramClient): void {
  server.tool(
    "telegram_find",
    "Search Telegram Bot API methods by keyword. Returns matching methods with their parameters. Use this to discover available methods before calling them.",
    {
      query: z.string().optional().describe("Search keyword (e.g. 'send photo', 'ban', 'poll', 'sticker')"),
      category: z.string().optional().describe("Filter by category: messages, media, polls, chat, members, invite, forum, stickers, inline, payments, business, stories, gifts, games, bot, updates, editing, forwarding, managed_bots, passport, other"),
    },
    async (params) => {
      let results = params.query ? searchMethods(params.query) : allMethods;

      if (params.category) {
        results = results.filter((m) => m.category === params.category);
      }

      if (results.length === 0) {
        return { content: [{ type: "text" as const, text: "No methods found. Try a different keyword." }] };
      }

      const text = results
        .slice(0, 20)
        .map((m) => {
          const required = m.params.filter((p) => p.required).map((p) => p.name);
          const optional = m.params.filter((p) => !p.required).map((p) => p.name).slice(0, 5);
          return [
            `**${m.apiMethod}** (tool: ${m.toolName}) [${m.category}]`,
            `  ${m.description}`,
            `  Required: ${required.join(", ") || "none"}`,
            `  Optional: ${optional.join(", ")}${m.params.filter((p) => !p.required).length > 5 ? " ..." : ""}`,
            `  Returns: ${m.returns}`,
          ].join("\n");
        })
        .join("\n\n");

      return {
        content: [{
          type: "text" as const,
          text: `Found ${results.length} method(s):\n\n${text}${results.length > 20 ? `\n\n... and ${results.length - 20} more. Narrow your search.` : ""}`,
        }],
      };
    }
  );

  server.tool(
    "telegram_call",
    "Call any Telegram Bot API method. Use telegram_find first to discover method names and required parameters.",
    {
      method: z.string().describe("API method name (e.g. sendMessage, banChatMember)"),
      params: z.record(z.unknown()).optional().describe("Method parameters as JSON object"),
    },
    async (args) => {
      const methodDef = findMethodByApiName(args.method);
      if (!methodDef) {
        return {
          content: [{ type: "text" as const, text: `Unknown method: "${args.method}". Use telegram_find to search for the correct method name. Method names are camelCase (e.g. sendMessage, not send_message).` }],
          isError: true,
        };
      }

      return executeMethod(client, methodDef, (args.params || {}) as Record<string, unknown>);
    }
  );
}

// ─── Post History ───────────────────────────────────────────────────────

function registerPostHistoryTool(server: McpServer): void {
  server.tool(
    "get_post_history",
    "Get history of messages sent by this bot. Use to check what was already posted to a chat before posting again. Returns newest first.",
    {
      chat_id: z.union([z.number().int(), z.string()]).optional().describe("Filter by chat ID. Omit to see all chats."),
      limit: z.number().int().min(1).max(200).optional().describe("Max entries to return (default: 50)"),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    async (params) => {
      const entries = await getPostHistory(params.chat_id, params.limit ?? 50);
      if (entries.length === 0) {
        return { content: [{ type: "text" as const, text: "No posts found for this chat." }] };
      }
      const text = entries.map((e) =>
        `[${e.timestamp}] ${e.method} → chat ${e.chat_id} (msg ${e.message_id ?? "?"})${e.caption_preview ? `: ${e.caption_preview}` : ""}`
      ).join("\n");
      return { content: [{ type: "text" as const, text: `${entries.length} post(s):\n\n${text}` }] };
    }
  );
}

// ─── Execution ──────────────────────────────────────────────────────────

/** For meta-mode: validate then call. */
async function executeMethod(
  client: TelegramClient,
  method: MethodDef,
  params: Record<string, unknown>
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const schema = getSchema(method);
  const parseResult = schema.safeParse(params);

  if (!parseResult.success) {
    const errors = parseResult.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    const required = method.params.filter((p) => p.required).map((p) => p.name);
    return {
      content: [{ type: "text", text: `Validation error for ${method.apiMethod}:\n${errors}\n\nRequired params: ${required.join(", ") || "none"}. Use telegram_find(query: "${method.apiMethod}") to see full parameter list.` }],
      isError: true,
    };
  }

  return callTelegram(client, method, parseResult.data as Record<string, unknown>);
}

/** Methods that produce posts/messages worth logging. */
const LOGGED_METHODS = new Set([
  "sendMessage", "sendPhoto", "sendVideo", "sendDocument", "sendAudio",
  "sendAnimation", "sendVoice", "sendVideoNote", "sendMediaGroup",
  "sendPaidMedia", "sendSticker", "sendLocation", "sendVenue", "sendContact",
  "sendPoll", "sendDice", "sendChecklist", "sendGame", "sendInvoice",
  "sendGift", "sendMessageDraft", "forwardMessage", "forwardMessages",
  "copyMessage", "copyMessages", "postStory",
]);

/** For standard mode: already validated by SDK, just call. */
async function callTelegram(
  client: TelegramClient,
  method: MethodDef,
  params: Record<string, unknown>
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  try {
    const result = await client.call(method.apiMethod, params);

    // Auto-log send/forward/copy/post calls
    if (LOGGED_METHODS.has(method.apiMethod) && result != null) {
      const r = (Array.isArray(result) ? result[0] : result) as Record<string, unknown> | undefined;
      const preview = truncateForLog(
        (params.caption as string) ?? (params.text as string) ?? ""
      );
      logPost({
        timestamp: new Date().toISOString(),
        method: method.apiMethod,
        chat_id: (params.chat_id as string | number) ?? "",
        message_id: (r?.message_id as number) ?? undefined,
        caption_preview: preview || undefined,
      }).catch((err) => {
        log("warn", `post-log write failed: ${(err as Error).message}`);
      });
    }

    const text = formatResult(method.apiMethod, result);
    return { content: [{ type: "text", text }] };
  } catch (error) {
    const message = error instanceof CircuitOpenError
      ? error.message
      : error instanceof TelegramApiError
        ? error.message
        : `Unexpected error: ${(error as Error).message}`;

    return {
      content: [{ type: "text", text: message }],
      isError: true,
    };
  }
}

const MAX_RESPONSE_LENGTH = 100_000;

function formatResult(method: string, result: unknown): string {
  if (result === true) return `${method}: Success`;

  let text: string;
  if (typeof result === "object" && result !== null) {
    text = JSON.stringify(result, null, 2);
  } else {
    text = String(result);
  }

  // Truncate to prevent filling context window
  if (text.length > MAX_RESPONSE_LENGTH) {
    text = text.slice(0, MAX_RESPONSE_LENGTH) + `\n\n... [truncated, ${text.length} chars total]`;
  }

  return text;
}

function truncateForLog(s: string): string {
  return s.length > 100 ? s.slice(0, 100) + "..." : s;
}

function log(level: "info" | "warn" | "error", msg: string): void {
  const ts = new Date().toISOString();
  process.stderr.write(`[${ts}] [${level.toUpperCase()}] ${msg}\n`);
}
