import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Config } from "./config.js";
import { TelegramClient, TelegramApiError } from "./telegram-client.js";
import { MethodDef, buildZodSchema } from "./method-registry.js";
import { allMethods, searchMethods, findMethodByApiName } from "./methods/index.js";
import { CircuitOpenError } from "./circuit-breaker.js";

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

    server.tool(
      method.toolName,
      method.description,
      zodSchema.shape,
      async (params) => {
        // SDK already validated with zodSchema.shape — pass directly to API
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
          content: [{ type: "text" as const, text: `Unknown method: ${args.method}. Use telegram_find to search for methods.` }],
          isError: true,
        };
      }

      return executeMethod(client, methodDef, (args.params || {}) as Record<string, unknown>);
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
    return {
      content: [{ type: "text", text: `Validation error for ${method.apiMethod}:\n${errors}` }],
      isError: true,
    };
  }

  return callTelegram(client, method, parseResult.data as Record<string, unknown>);
}

/** For standard mode: already validated by SDK, just call. */
async function callTelegram(
  client: TelegramClient,
  method: MethodDef,
  params: Record<string, unknown>
): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  try {
    const result = await client.call(method.apiMethod, params);
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

function formatResult(method: string, result: unknown): string {
  if (result === true) return `${method}: Success`;
  if (typeof result === "object" && result !== null) {
    return JSON.stringify(result, null, 2);
  }
  return String(result);
}

function log(level: "info" | "warn" | "error", msg: string): void {
  const ts = new Date().toISOString();
  process.stderr.write(`[${ts}] [${level.toUpperCase()}] ${msg}\n`);
}
