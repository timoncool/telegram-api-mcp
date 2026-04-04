import { z, ZodTypeAny } from "zod";

/**
 * Declarative method definition.
 * Each Bot API method is described as data — not as a handler.
 * The MCP server auto-generates tools from these definitions.
 */
export interface MethodDef {
  /** Telegram Bot API method name (camelCase) */
  apiMethod: string;
  /** MCP tool name (snake_case) */
  toolName: string;
  /** Human-readable description for AI agents */
  description: string;
  /** Category for grouping and meta-mode search */
  category: MethodCategory;
  /** Parameter definitions */
  params: ParamDef[];
  /** Does this method need chat_id? (for rate limiting and defaults) */
  needsChatId: boolean;
  /** Can this method upload files? */
  canUploadFiles: boolean;
  /** Return type description */
  returns: string;
}

export type MethodCategory =
  | "updates"
  | "bot"
  | "messages"
  | "editing"
  | "forwarding"
  | "media"
  | "polls"
  | "chat"
  | "members"
  | "invite"
  | "forum"
  | "stickers"
  | "inline"
  | "payments"
  | "business"
  | "stories"
  | "gifts"
  | "games"
  | "passport"
  | "managed_bots"
  | "other";

export interface ParamDef {
  /** Parameter name as in Bot API */
  name: string;
  /** Zod type for validation */
  type: ZodTypeAny;
  /** Is this parameter required? */
  required: boolean;
  /** Human-readable description */
  description: string;
}

// ─── Common Zod types for reuse ────────────────────────────────────────

export const ChatId = z.union([z.number().int(), z.string()]).describe("Chat ID or @username");
export const MessageId = z.number().int().describe("Message ID");
export const UserId = z.number().int().describe("User ID");
export const Text = z.string().min(1).max(4096).describe("Message text (1-4096 chars)");
export const Caption = z.string().max(1024).describe("Caption (0-1024 chars)");
export const ParseMode = z.enum(["HTML", "Markdown", "MarkdownV2"]).describe("Formatting mode");
export const FileInput = z.string().describe("File ID, HTTP URL, or absolute file path");
export const ReplyMarkup = z.any().describe("InlineKeyboardMarkup, ReplyKeyboardMarkup, ReplyKeyboardRemove, or ForceReply");
export const ReplyParameters = z.any().describe("ReplyParameters object");
export const MessageEntities = z.any().describe("Array of MessageEntity objects");
export const LinkPreviewOptions = z.any().describe("LinkPreviewOptions object");
export const BooleanFlag = z.boolean();
export const PositiveInt = z.number().int().positive();

// ─── Common param groups (DRY) ─────────────────────────────────────────

export function commonSendParams(): ParamDef[] {
  return [
    { name: "business_connection_id", type: z.string(), required: false, description: "Business connection ID" },
    { name: "message_thread_id", type: z.number().int(), required: false, description: "Forum topic thread ID" },
    { name: "reply_parameters", type: ReplyParameters, required: false, description: "Reply settings" },
    { name: "reply_markup", type: ReplyMarkup, required: false, description: "Keyboard markup" },
    { name: "protect_content", type: BooleanFlag, required: false, description: "Protect from forwarding/saving" },
    { name: "disable_notification", type: BooleanFlag, required: false, description: "Send silently" },
    { name: "effect_id", type: z.string(), required: false, description: "Message effect ID" },
    { name: "allow_paid_broadcast", type: BooleanFlag, required: false, description: "Allow paid broadcast" },
  ];
}

export function commonMediaParams(): ParamDef[] {
  return [
    { name: "caption", type: Caption, required: false, description: "Media caption (0-1024 chars)" },
    { name: "parse_mode", type: ParseMode, required: false, description: "Caption formatting mode" },
    { name: "caption_entities", type: MessageEntities, required: false, description: "Special entities in caption" },
  ];
}

export function commonEditParams(): ParamDef[] {
  return [
    { name: "chat_id", type: ChatId, required: false, description: "Chat ID (required if inline_message_id not set)" },
    { name: "message_id", type: MessageId, required: false, description: "Message ID (required if inline_message_id not set)" },
    { name: "inline_message_id", type: z.string(), required: false, description: "Inline message ID" },
    { name: "reply_markup", type: ReplyMarkup, required: false, description: "Inline keyboard markup" },
  ];
}

// ─── Build Zod schema from ParamDefs ────────────────────────────────────

export function buildZodSchema(params: ParamDef[]): z.ZodObject<Record<string, ZodTypeAny>> {
  const shape: Record<string, ZodTypeAny> = {};

  for (const param of params) {
    shape[param.name] = param.required ? param.type : param.type.optional();
  }

  return z.object(shape);
}

// ─── Build JSON Schema (for MCP tool registration) ──────────────────────

export function buildJsonSchema(params: ParamDef[]): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const param of params) {
    properties[param.name] = zodToJsonSchema(param.type, param.description);
    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    type: "object",
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

function zodToJsonSchema(schema: ZodTypeAny, description: string): Record<string, unknown> {
  const base = inferJsonType(schema);
  base.description = description;
  return base;
}

function inferJsonType(schema: ZodTypeAny): Record<string, unknown> {
  const def = schema._def;

  // Handle optional wrapper
  if (def.typeName === "ZodOptional") {
    return inferJsonType(def.innerType);
  }

  // Handle union (e.g., ChatId = number | string)
  if (def.typeName === "ZodUnion") {
    const options = def.options.map((o: ZodTypeAny) => inferJsonType(o));
    return { oneOf: options };
  }

  // Handle enum
  if (def.typeName === "ZodEnum") {
    return { type: "string", enum: def.values };
  }

  // Handle array
  if (def.typeName === "ZodArray") {
    return { type: "array", items: inferJsonType(def.type) };
  }

  // Primitives
  switch (def.typeName) {
    case "ZodString":
      return { type: "string" };
    case "ZodNumber":
      return { type: "number" };
    case "ZodBoolean":
      return { type: "boolean" };
    case "ZodAny":
      return {};
    default:
      return { type: "string" };
  }
}
