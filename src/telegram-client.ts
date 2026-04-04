import { readFile, stat } from "node:fs/promises";
import { basename, isAbsolute, resolve, normalize, sep } from "node:path";
import { Config } from "./config.js";
import { RateLimiter } from "./rate-limiter.js";
import { CircuitBreaker, CircuitOpenError } from "./circuit-breaker.js";

/** Default fetch timeout: 60 seconds */
const FETCH_TIMEOUT_MS = 60_000;

interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
  error_code?: number;
  parameters?: {
    retry_after?: number;
    migrate_to_chat_id?: number;
  };
}

function log(level: "info" | "warn" | "error", msg: string): void {
  const ts = new Date().toISOString();
  process.stderr.write(`[${ts}] [${level.toUpperCase()}] ${msg}\n`);
}

function maskToken(str: string, token: string): string {
  return str.replaceAll(token, "***");
}

export class TelegramClient {
  private baseUrl: string;
  private token: string;
  private rateLimiter: RateLimiter;
  private circuitBreaker: CircuitBreaker;
  private config: Config;
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(config: Config) {
    this.config = config;
    this.token = config.botToken;
    this.baseUrl = `https://api.telegram.org/bot${this.token}`;
    this.rateLimiter = new RateLimiter(config.globalRateLimit, config.perChatRateLimit);
    this.circuitBreaker = new CircuitBreaker(
      config.circuitBreakerThreshold,
      config.circuitBreakerCooldown
    );

    this.cleanupInterval = setInterval(() => this.rateLimiter.cleanup(), 60_000);
    this.cleanupInterval.unref(); // Don't prevent Node.js from exiting

    // Warn if no upload directory restrictions
    if (config.allowedUploadDirs.length === 0) {
      log("warn", "TELEGRAM_ALLOWED_UPLOAD_DIRS not set — file uploads unrestricted. Set it to restrict paths.");
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
  }

  async call(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const resolvedParams = this.applyDefaults(params);
    const chatId = resolvedParams.chat_id as string | undefined;

    this.circuitBreaker.check();
    await this.rateLimiter.acquire(chatId);

    const hasFiles = this.hasFileParams(resolvedParams);
    return this.callWithRetry(method, resolvedParams, hasFiles);
  }

  private applyDefaults(params: Record<string, unknown>): Record<string, unknown> {
    const result = { ...params };
    if (!result.chat_id && this.config.defaultChatId) {
      result.chat_id = this.config.defaultChatId;
    }
    if (!result.message_thread_id && this.config.defaultThreadId) {
      result.message_thread_id = this.config.defaultThreadId;
    }
    return result;
  }

  private async callWithRetry(
    method: string,
    params: Record<string, unknown>,
    hasFiles: boolean,
    attempt = 1
  ): Promise<unknown> {
    try {
      const result = hasFiles
        ? await this.callMultipart(method, params)
        : await this.callJson(method, params);

      this.circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      if (error instanceof CircuitOpenError) throw error;

      const err = error as TelegramApiError;

      // Don't retry 4xx (except 429)
      if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500 && err.statusCode !== 429) {
        throw error;
      }

      // 429: respect retry_after (or default 5s if not provided)
      if (err.statusCode === 429) {
        if (attempt <= this.config.maxRetries) {
          const retryAfter = err.retryAfter ?? 5;
          const waitMs = retryAfter * 1000;
          log("warn", `Rate limited on ${method}, waiting ${retryAfter}s (attempt ${attempt}/${this.config.maxRetries})`);
          await sleep(waitMs);
          return this.callWithRetry(method, params, hasFiles, attempt + 1);
        }
        throw error; // Exhausted retries on 429
      }

      // Record failure for circuit breaker (429 already handled above)
      const justOpened = this.circuitBreaker.recordFailure(err.statusCode);
      if (justOpened) {
        log("error", `Circuit breaker OPENED after ${this.config.circuitBreakerThreshold} failures`);
      }

      // Retry on transient errors (5xx, network)
      if (attempt < this.config.maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10_000);
        log("warn", `Retrying ${method} in ${backoffMs}ms (attempt ${attempt + 1}/${this.config.maxRetries})`);
        await sleep(backoffMs);
        return this.callWithRetry(method, params, hasFiles, attempt + 1);
      }

      throw error;
    }
  }

  private async callJson(method: string, params: Record<string, unknown>): Promise<unknown> {
    const url = `${this.baseUrl}/${method}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        signal: controller.signal,
      });
      return this.handleResponse(method, response);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async callMultipart(method: string, params: Record<string, unknown>): Promise<unknown> {
    const url = `${this.baseUrl}/${method}`;
    const formData = new FormData();

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;

      if (typeof value === "string" && (await this.isLocalFile(value))) {
        const file = await this.readLocalFile(value);
        formData.append(key, file, basename(value));
      } else if (typeof value === "object") {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, String(value));
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      return this.handleResponse(method, response);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async handleResponse(method: string, response: Response): Promise<unknown> {
    let data: TelegramResponse;
    try {
      data = (await response.json()) as TelegramResponse;
    } catch {
      throw new TelegramApiError(
        `Failed to parse response from ${method} (HTTP ${response.status})`,
        response.status
      );
    }

    if (!data.ok) {
      const description = data.description
        ? maskToken(data.description, this.token)
        : "Unknown error";

      throw new TelegramApiError(
        `${method}: ${description}`,
        data.error_code || response.status,
        data.parameters?.retry_after
      );
    }

    return data.result;
  }

  private hasFileParams(params: Record<string, unknown>): boolean {
    const fileFields = new Set([
      "photo", "audio", "document", "video", "animation", "voice",
      "video_note", "sticker", "thumbnail", "certificate",
    ]);

    for (const [key, value] of Object.entries(params)) {
      if (fileFields.has(key) && typeof value === "string") {
        if (isAbsolute(value)) return true;
      }
    }

    return false;
  }

  private async isLocalFile(value: string): Promise<boolean> {
    if (!isAbsolute(value)) return false;
    try {
      const info = await stat(value);
      return info.isFile();
    } catch {
      return false;
    }
  }

  private async readLocalFile(filePath: string): Promise<Blob> {
    const resolved = resolve(normalize(filePath));

    // Path traversal protection: require trailing separator in comparison
    if (this.config.allowedUploadDirs.length > 0) {
      const isAllowed = this.config.allowedUploadDirs.some((dir) => {
        const normalizedDir = resolve(normalize(dir));
        const dirWithSep = normalizedDir.endsWith(sep) ? normalizedDir : normalizedDir + sep;
        return resolved.startsWith(dirWithSep) || resolved === normalizedDir;
      });
      if (!isAllowed) {
        throw new Error(
          `File upload blocked: ${resolved} is not in allowed directories. ` +
            `Set TELEGRAM_ALLOWED_UPLOAD_DIRS to allow specific paths.`
        );
      }
    }

    const info = await stat(resolved);
    if (info.size > this.config.maxFileSize) {
      throw new Error(
        `File too large: ${(info.size / 1024 / 1024).toFixed(1)}MB exceeds ` +
          `limit of ${(this.config.maxFileSize / 1024 / 1024).toFixed(0)}MB`
      );
    }

    const buffer = await readFile(resolved);
    return new Blob([buffer]);
  }
}

export class TelegramApiError extends Error {
  statusCode?: number;
  retryAfter?: number;

  constructor(message: string, statusCode?: number, retryAfter?: number) {
    super(message);
    this.name = "TelegramApiError";
    this.statusCode = statusCode;
    this.retryAfter = retryAfter;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
