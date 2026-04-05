import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Config } from "./config.js";
import { TelegramClient, TelegramApiError } from "./telegram-client.js";
import { MethodDef, buildZodSchema } from "./method-registry.js";
import { allMethods, searchMethods, findMethodByApiName } from "./methods/index.js";
import { CircuitOpenError } from "./circuit-breaker.js";
import { Trail } from "./trail.js";

/** Pre-built Zod schemas for all methods (built once, reused on every call). */
const schemaCache = new Map<string, ReturnType<typeof buildZodSchema>>();

/** Module-level TRAIL instance for auto-logging in callTelegram. */
let trailInstance: Trail | null = null;

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

  trailInstance = registerTrailTools(server);
  registerDownloadTool(server, client);

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

// ─── TRAIL ─────────────────────────────────────────────────────────────

function registerTrailTools(server: McpServer): Trail {
  const dataDir = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
  const trail = new Trail(dataDir, "telegram-mcp");

  server.tool(
    "get_trail",
    "Query the TRAIL content log. Check what content was posted, failed, or skipped across pipelines.",
    {
      content_id: z.string().optional().describe("Filter by content ID (exact or prefix like 'civitai:image:')"),
      action: z.union([z.string(), z.array(z.string())]).optional().describe("Filter by action (posted, failed, skipped, etc.)"),
      requester: z.string().optional().describe("Filter by workflow/task ID"),
      trace_id: z.string().optional().describe("Filter by pipeline trace ID"),
      since: z.string().optional().describe("ISO 8601 timestamp — only entries after this time"),
      limit: z.number().int().min(0).max(500).optional().describe("Max entries, newest first (default: 50, 0 = all)"),
      offset: z.number().int().min(0).optional().describe("Entries to skip for pagination (default: 0)"),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    async (params) => {
      const { entries, total } = await trail.query({
        content_id: params.content_id,
        action: params.action,
        requester: params.requester,
        trace_id: params.trace_id,
        since: params.since,
        limit: params.limit ?? 50,
        offset: params.offset,
      });
      if (entries.length === 0) {
        return { content: [{ type: "text" as const, text: "No trail entries found." }] };
      }
      const lines = entries.map((e) => {
        const d = e.details ?? {};
        const detailParts = Object.entries(d)
          .filter(([, v]) => typeof v !== "object")
          .map(([k, v]) => `${k}=${v}`);
        const detailStr = detailParts.length ? ` — ${detailParts.join(", ")}` : "";
        return `[${e.timestamp}] ${e.action} ${e.content_id} (req: ${e.requester})${detailStr}`;
      });
      return { content: [{ type: "text" as const, text: `TRAIL Log (${entries.length}/${total}):\n\n${lines.join("\n")}` }] };
    }
  );

  server.tool(
    "mark_trail",
    "Write an entry to the TRAIL content log. Use to explicitly record content actions.",
    {
      content_id: z.string().describe("Content ID in format source:type:id"),
      action: z.string().describe("Action: fetched, selected, posted, failed, skipped"),
      requester: z.string().describe("Workflow/task ID"),
      details: z.record(z.unknown()).optional().describe("Platform-specific data"),
      trace_id: z.string().optional().describe("Pipeline trace ID"),
      tags: z.array(z.string()).optional().describe("Labels for filtering"),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    async (params) => {
      await trail.append(params.content_id, params.action, params.requester, {
        details: params.details,
        trace_id: params.trace_id,
        tags: params.tags,
      });
      return { content: [{ type: "text" as const, text: `Trail entry recorded: ${params.action} ${params.content_id} (req: ${params.requester})` }] };
    }
  );

  server.tool(
    "get_trail_stats",
    "Get summary statistics from the TRAIL content log.",
    {
      requester: z.string().optional().describe("Filter by workflow/task ID"),
      since: z.string().optional().describe("ISO 8601 timestamp — only count entries after this"),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    async (params) => {
      const stats = await trail.stats(params.requester, params.since);
      const actionLines = Object.entries(stats.by_action)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([act, count]) => `  ${act}: ${count}`)
        .join("\n");
      const text = [
        `TRAIL Statistics:`,
        `Total entries: ${stats.total_entries}`,
        `Unique content IDs: ${stats.unique_content_ids}`,
        `First entry: ${stats.first_entry ?? "N/A"}`,
        `Last entry: ${stats.last_entry ?? "N/A"}`,
        `By action:\n${actionLines}`,
      ].join("\n");
      return { content: [{ type: "text" as const, text }] };
    }
  );

  return trail;
}

// ─── Download ───────────────────────────────────────────────────────────

function registerDownloadTool(server: McpServer, client: TelegramClient): void {
  const defaultDir = process.env.TELEGRAM_DOWNLOAD_DIR || (process.platform === "win32"
    ? `${process.env.USERPROFILE || "C:\\Users\\user"}\\Downloads\\telegram-mcp`
    : `${process.env.HOME || "/tmp"}/telegram-mcp-downloads`);

  server.tool(
    "download_file",
    "Download a file from Telegram by file_id. Saves locally and returns the path. Use after receiving a message with a photo, video, document, voice, etc. Max 20MB (Telegram Bot API limit).",
    {
      file_id: z.string().describe("File ID from a message (photo[-1].file_id, document.file_id, video.file_id, etc.)"),
      dest_dir: z.string().optional().describe(`Directory to save to (default: ${defaultDir})`),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (params) => {
      try {
        const dir = params.dest_dir || defaultDir;
        const localPath = await client.downloadFile(params.file_id, dir);
        return {
          content: [{ type: "text" as const, text: `Downloaded to: ${localPath}` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Download failed: ${(error as Error).message}` }],
          isError: true,
        };
      }
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
      // TRAIL auto-logging
      const _trail = params._trail as Record<string, unknown> | undefined;
      const trailCid = (_trail?.content_id ?? params.content_id) as string | undefined;
      const trailReq = (_trail?.requester ?? params.requester) as string | undefined;
      if (trailCid && trailReq && trailInstance) {
        trailInstance.append(trailCid, "posted", trailReq, {
          details: {
            platform: "telegram",
            platform_id: String(r?.message_id ?? ""),
            chat_id: String(params.chat_id ?? ""),
          },
          trace_id: (_trail?.trace_id ?? params.trace_id) as string | undefined,
        }).catch((err) => {
          log("warn", `trail write failed: ${(err as Error).message}`);
        });
      }
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

function log(level: "info" | "warn" | "error", msg: string): void {
  const ts = new Date().toISOString();
  process.stderr.write(`[${ts}] [${level.toUpperCase()}] ${msg}\n`);
}
