/**
 * Server configuration from environment variables.
 */
export interface Config {
  /** Telegram Bot token from @BotFather */
  botToken: string;
  /** Default chat_id for all tools (optional) */
  defaultChatId?: string;
  /** Default message_thread_id for forum topics (optional) */
  defaultThreadId?: number;
  /** Global rate limit: max requests per second (default: 30) */
  globalRateLimit: number;
  /** Per-chat rate limit: max messages per minute to same chat (default: 20) */
  perChatRateLimit: number;
  /** Max retry attempts on transient errors (default: 3) */
  maxRetries: number;
  /** Circuit breaker: consecutive failures to open circuit (default: 5) */
  circuitBreakerThreshold: number;
  /** Circuit breaker: cooldown in ms before half-open (default: 30000) */
  circuitBreakerCooldown: number;
  /** Allowed directories for file uploads (comma-separated, empty = no restriction) */
  allowedUploadDirs: string[];
  /** Max file size in bytes (default: 50MB) */
  maxFileSize: number;
  /** Run in meta-mode with 2 tools instead of all (default: false) */
  metaMode: boolean;
}

export function loadConfig(): Config {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is required. Get one from @BotFather: https://t.me/BotFather"
    );
  }

  const threadId = process.env.TELEGRAM_DEFAULT_THREAD_ID;

  const uploadDirs = process.env.TELEGRAM_ALLOWED_UPLOAD_DIRS;

  return {
    botToken: token,
    defaultChatId: process.env.TELEGRAM_DEFAULT_CHAT_ID || undefined,
    defaultThreadId: threadId ? parseInt(threadId, 10) : undefined,
    globalRateLimit: parseInt(process.env.TELEGRAM_GLOBAL_RATE_LIMIT || "30", 10),
    perChatRateLimit: parseInt(process.env.TELEGRAM_PER_CHAT_RATE_LIMIT || "20", 10),
    maxRetries: parseInt(process.env.TELEGRAM_MAX_RETRIES || "3", 10),
    circuitBreakerThreshold: parseInt(process.env.TELEGRAM_CB_THRESHOLD || "5", 10),
    circuitBreakerCooldown: parseInt(process.env.TELEGRAM_CB_COOLDOWN || "30000", 10),
    allowedUploadDirs: uploadDirs ? uploadDirs.split(",").map((d) => d.trim()) : [],
    maxFileSize: parseInt(process.env.TELEGRAM_MAX_FILE_SIZE || String(50 * 1024 * 1024), 10),
    metaMode: process.env.TELEGRAM_META_MODE === "true",
  };
}
