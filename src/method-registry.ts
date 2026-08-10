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
  /** MCP tool annotations — hints for clients about tool behavior */
  annotations?: ToolAnnotations;
}

/** MCP Tool Annotations per spec 2025-06-18 */
export interface ToolAnnotations {
  /** Tool only reads data, doesn't modify anything */
  readOnlyHint?: boolean;
  /** Tool may perform destructive/irreversible actions (default: true!) */
  destructiveHint?: boolean;
  /** Calling with same args gives same result */
  idempotentHint?: boolean;
  /** Tool interacts with external entities */
  openWorldHint?: boolean;
}

/** Common annotation presets for DRY */
export const ANNOTATIONS = {
  /** GET methods — read only, no side effects */
  readOnly: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as ToolAnnotations,
  /** SEND methods — create content, not destructive */
  send: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true } as ToolAnnotations,
  /** SET/EDIT methods — modify existing, idempotent */
  modify: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true } as ToolAnnotations,
  /** DELETE/BAN methods — destructive, irreversible */
  destructive: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true } as ToolAnnotations,
} as const;

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

// Telegram counts the *visible* caption length (the text after HTML/Markdown is
// parsed into entities), not the raw markup. HTML tags and the URLs inside
// <a href="..."> add no visible characters, so capping the raw string at 1024
// wrongly rejects rich captions. Strip tags and collapse entities, then count
// UTF-16 code units the way Telegram does.
export function visibleCaptionLength(s: string): number {
  const stripped = s
    .replace(/<[^>]+>/g, "")                       // HTML tags render to nothing
    .replace(/&(?:amp|lt|gt|quot|#3[49]);/g, "x"); // each entity is 1 visible char
  return stripped.length;
}
export const CAPTION_MAX = 1024;
export const Caption = z
  .string()
  .refine((s) => visibleCaptionLength(s) <= CAPTION_MAX, {
    message: `Caption exceeds ${CAPTION_MAX} visible characters (HTML tags and href URLs don't count)`,
  })
  .describe("Caption (0-1024 visible chars; HTML tags/URLs excluded)");
export const ParseMode = z.enum(["HTML", "Markdown", "MarkdownV2"]).describe("Formatting mode");
export const FileInput = z.string().describe("File ID, HTTP URL, or absolute file path");
export const ReplyMarkup = z.any().describe("InlineKeyboardMarkup, ReplyKeyboardMarkup, ReplyKeyboardRemove, or ForceReply");
export const ReplyParameters = z.any().describe("ReplyParameters object");
export const MessageEntities = z.any().describe("Array of MessageEntity objects");
export const LinkPreviewOptions = z.any().describe("LinkPreviewOptions object");
export const BooleanFlag = z.boolean();
export const PositiveInt = z.number().int().positive();
export const SuggestedPostParameters = z
  .any()
  .describe("SuggestedPostParameters object (price, send_date) — direct messages chats only");

// ─── Rich messages (Bot API 10.1/10.2) ─────────────────────────────────
// A rich message is the long-form post format: headings, lists, tables,
// collages, footnotes and inline media in a single message. It replaces the
// 1024-character caption ceiling of sendPhoto & co with the limits below.
export const RICH_MESSAGE_LIMITS = {
  /** UTF-8 characters of text, including custom emoji alt text and formula source */
  text: 32768,
  /** blocks, including nested blocks, list items, table rows, quotations, details */
  blocks: 500,
  /** photos + videos + audio files in total */
  media: 50,
  /** columns in a table */
  tableColumns: 20,
  /** levels of nested formatting and blocks */
  nesting: 16,
} as const;

/** Count blocks the way Telegram does — nested items count towards the total. */
function countRichBlocks(blocks: unknown): number {
  if (!Array.isArray(blocks)) return 0;
  let total = 0;
  for (const block of blocks) {
    total += 1;
    if (block && typeof block === "object") {
      for (const value of Object.values(block as Record<string, unknown>)) {
        if (Array.isArray(value)) total += countRichBlocks(value);
      }
    }
  }
  return total;
}

/** Sum the text leaves of a block tree, so `blocks` is measured like html/markdown. */
function countRichText(node: unknown): number {
  if (typeof node === "string") return node.length;
  if (Array.isArray(node)) return node.reduce<number>((sum, item) => sum + countRichText(item), 0);
  if (node && typeof node === "object") {
    return Object.entries(node as Record<string, unknown>)
      .filter(([key]) => key !== "type" && key !== "url" && key !== "media")
      .reduce<number>((sum, [, value]) => sum + countRichText(value), 0);
  }
  return 0;
}

export const RichMessage = z
  .object({
    blocks: z.array(z.any()).optional(),
    html: z.string().optional(),
    markdown: z.string().optional(),
    media: z.array(z.any()).optional(),
    is_rtl: z.boolean().optional(),
    skip_entity_detection: z.boolean().optional(),
  })
  .passthrough()
  .superRefine((msg, ctx) => {
    const forms = (["blocks", "html", "markdown"] as const).filter((key) => msg[key] !== undefined);
    if (forms.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Exactly one of blocks, html or markdown must be set (got ${forms.length ? forms.join(" + ") : "none"})`,
      });
    }
    const length = msg.html
      ? visibleCaptionLength(msg.html)
      : msg.markdown
        ? msg.markdown.length
        : countRichText(msg.blocks);
    if (length > RICH_MESSAGE_LIMITS.text) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Rich message text is ${length} characters, limit is ${RICH_MESSAGE_LIMITS.text}`,
      });
    }
    const blocks = countRichBlocks(msg.blocks);
    if (blocks > RICH_MESSAGE_LIMITS.blocks) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Rich message has ${blocks} blocks (nested included), limit is ${RICH_MESSAGE_LIMITS.blocks}`,
      });
    }
    if (msg.media && msg.media.length > RICH_MESSAGE_LIMITS.media) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Rich message has ${msg.media.length} media attachments, limit is ${RICH_MESSAGE_LIMITS.media}`,
      });
    }
  })
  .describe(
    `InputRichMessage — exactly one of markdown (GitHub-flavored + Telegram tags), html, or blocks. ` +
    `Up to ${RICH_MESSAGE_LIMITS.text} chars, ${RICH_MESSAGE_LIMITS.blocks} blocks, ${RICH_MESSAGE_LIMITS.media} media. ` +
    `Media inside markdown/html must be HTTP(S) URLs referenced as separate blocks.`,
  );

// ─── Common param groups (DRY) ─────────────────────────────────────────

/**
 * Which of the optional shared send-parameters a method actually accepts.
 * Telegram is not uniform here — sendPoll has no direct_messages_topic_id,
 * sendMediaGroup has no reply_markup, sendPaidMedia has no message_effect_id —
 * so each method opts in explicitly rather than inheriting a superset.
 */
export interface SendParamOptions {
  /** direct_messages_topic_id — channel direct messages topics (9.2) */
  directMessagesTopic?: boolean;
  /** receiver_user_id + callback_query_id — ephemeral messages (10.2) */
  ephemeral?: boolean;
  /** suggested_post_parameters — direct messages chats (9.2) */
  suggestedPost?: boolean;
  /** message_thread_id (default: true) */
  thread?: boolean;
  /** allow_paid_broadcast (default: true) */
  paidBroadcast?: boolean;
  /** message_effect_id (default: true) */
  effect?: boolean;
  /** reply_markup (default: true) */
  replyMarkup?: boolean;
  /** business_connection_id at all (default: true; sendInvoice has none) */
  business?: boolean;
  /** business_connection_id is mandatory, not optional (sendChecklist) */
  businessRequired?: boolean;
}

export function commonSendParams(opts: SendParamOptions = {}): ParamDef[] {
  const {
    directMessagesTopic = false,
    ephemeral = false,
    suggestedPost = false,
    thread = true,
    paidBroadcast = true,
    effect = true,
    replyMarkup = true,
    business = true,
    businessRequired = false,
  } = opts;

  const params: ParamDef[] = [];
  if (business || businessRequired) {
    params.push({ name: "business_connection_id", type: z.string(), required: businessRequired, description: "Business connection ID" });
  }
  if (thread) {
    params.push({ name: "message_thread_id", type: z.number().int(), required: false, description: "Forum topic thread ID" });
  }
  if (directMessagesTopic) {
    params.push({ name: "direct_messages_topic_id", type: z.number().int(), required: false, description: "Direct messages topic ID; required when sending to a direct messages chat" });
  }
  if (ephemeral) {
    params.push(
      { name: "receiver_user_id", type: UserId, required: false, description: "Send as an ephemeral message visible only to this user (10.2)" },
      { name: "callback_query_id", type: z.string(), required: false, description: "Callback query the ephemeral message answers (10.2)" },
    );
  }
  params.push(
    { name: "disable_notification", type: BooleanFlag, required: false, description: "Send silently" },
    { name: "protect_content", type: BooleanFlag, required: false, description: "Protect from forwarding/saving" },
  );
  if (paidBroadcast) {
    params.push({ name: "allow_paid_broadcast", type: BooleanFlag, required: false, description: "Allow paid broadcast (up to 1000 msg/s for 0.1 Stars each)" });
  }
  if (effect) {
    params.push({ name: "message_effect_id", type: z.string(), required: false, description: "Message effect ID; private chats only" });
  }
  if (suggestedPost) {
    params.push({ name: "suggested_post_parameters", type: SuggestedPostParameters, required: false, description: "Suggested post parameters; direct messages chats only" });
  }
  params.push({ name: "reply_parameters", type: ReplyParameters, required: false, description: "Reply settings" });
  if (replyMarkup) {
    params.push({ name: "reply_markup", type: ReplyMarkup, required: false, description: "Keyboard markup" });
  }
  return params;
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
    { name: "business_connection_id", type: z.string(), required: false, description: "Business connection ID of the message to edit" },
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
  if (def.typeName === "ZodOptional" || def.typeName === "ZodNullable") {
    return inferJsonType(def.innerType);
  }

  // .refine()/.superRefine() wrap the schema in ZodEffects — without unwrapping,
  // an object schema like RichMessage would be advertised to clients as a string.
  if (def.typeName === "ZodEffects") {
    return inferJsonType(def.schema);
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

  // Handle object
  if (def.typeName === "ZodObject") {
    const shape = def.shape() as Record<string, ZodTypeAny>;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      properties[key] = inferJsonType(value);
      const description = value.description;
      if (description) (properties[key] as Record<string, unknown>).description = description;
      if (value._def.typeName !== "ZodOptional") required.push(key);
    }
    return required.length > 0 ? { type: "object", properties, required } : { type: "object", properties };
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
