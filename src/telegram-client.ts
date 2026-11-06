import { readFile, writeFile, stat, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, resolve, normalize, sep } from "node:path";
import { collectFileReferences } from "./file-uploads.js";
import { Config } from "./config.js";
import { RateLimiter } from "./rate-limiter.js";
import { CircuitBreaker, CircuitOpenError } from "./circuit-breaker.js";

/** Default fetch timeout: 60 seconds */
const FETCH_TIMEOUT_MS = 60_000;

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

/** Guess a sane filename for a downloaded URL — Telegram infers type from it. */
function filenameForUrl(url: string, contentType: string | null): string {
  let name = "";
  try {
    name = basename(new URL(url).pathname);
  } catch {
    name = "";
  }
  if (extname(name)) return name;

  const ext = contentType && MIME_EXTENSIONS[contentType.split(";")[0].trim().toLowerCase()];
  return `${name || "file"}${ext ?? ".bin"}`;
}

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "audio/mpeg": ".mp3",
  "audio/ogg": ".ogg",
  "audio/mp4": ".m4a",
  "application/pdf": ".pdf",
  "application/zip": ".zip",
};

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
  /** Where URLs Telegram could not fetch are mirrored before being uploaded. */
  private mirrorDir: string;

  constructor(config: Config) {
    this.config = config;
    this.token = config.botToken;
    this.mirrorDir = join(tmpdir(), "telegram-api-mcp");
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

  get maxResponseLength(): number {
    return this.config.maxResponseLength ?? 0;
  }

  async call(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const resolvedParams = this.applyDefaults(params);

    collectFileReferences(method, resolvedParams); // Normalize JSON-encoded upload containers.

    const chatId = resolvedParams.chat_id as string | undefined;

    this.circuitBreaker.check();
    await this.rateLimiter.acquire(chatId);

    // Media given as an http(s) URL is always fetched here and uploaded as multipart.
    // Letting Telegram fetch the URL itself caps it at 5 MB for photos and 20 MB for
    // everything else and requires a MIME type it agrees with (sendDocument by URL only
    // accepts PDF and ZIP), so videos and large images failed. Uploading the bytes lifts
    // that to 10 MB / 50 MB and behaves the same for every link — one path, no retry
    // dance, and a precise error when a link genuinely cannot be used.
    if (this.collectRemoteUrls(method, resolvedParams).length > 0) {
      const mirrored = await this.mirrorRemoteFiles(method, resolvedParams);
      try {
        return await this.callWithRetry(method, mirrored.params, true);
      } finally {
        await rm(mirrored.directory, { recursive: true, force: true });
      }
    }

    return this.callWithRetry(method, resolvedParams, collectFileReferences(method, resolvedParams).some((f) => isAbsolute(f.value)));
  }

  private collectRemoteUrls(method: string, params: Record<string, unknown>) {
    return collectFileReferences(method, params).filter((ref) => isHttpUrl(ref.value));
  }

  /** Each call owns a separate directory, including when download or upload fails. */
  private async mirrorRemoteFiles(method: string, params: Record<string, unknown>): Promise<{
    params: Record<string, unknown>; directory: string;
  }> {
    const copy = structuredClone(params);
    const targets = this.collectRemoteUrls(method, copy);
    await mkdir(this.mirrorDir, { recursive: true });
    const directory = await mkdtemp(join(this.mirrorDir, "upload-"));
    try {
      for (const [index, target] of targets.entries()) {
        const response = await fetch(target.value, { redirect: "follow", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
        if (!response.ok) {
          throw new TelegramApiError(`Could not download ${target.value} — HTTP ${response.status}. The link must point directly to a file.`, response.status);
        }
        const bytes = Buffer.from(await response.arrayBuffer());
        if (bytes.byteLength > this.config.maxFileSize) {
          throw new TelegramApiError(`${target.value} is ${(bytes.byteLength / 1048576).toFixed(1)} MB — Telegram accepts at most ${Math.round(this.config.maxFileSize / 1048576)} MB per configured upload.`, 413);
        }
        const filePath = join(directory, `${index}-${filenameForUrl(target.value, response.headers.get("content-type"))}`);
        await writeFile(filePath, bytes);
        target.set(filePath);
      }
      return { params: copy, directory };
    } catch (error) {
      await rm(directory, { recursive: true, force: true });
      throw error;
    }
  }

  private applyDefaults(params: Record<string, unknown>): Record<string, unknown> {
    const result = structuredClone(params);
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

    const rewritten = structuredClone(params);
    const directFiles = new Set<string>();
    let index = 0;
    for (const ref of collectFileReferences(method, rewritten)) {
      if (!isAbsolute(ref.value)) continue;
      const filePath = ref.value;
      const direct = ref.path.length === 1;
      let name = String(ref.path[0]);
      if (!direct) {
        do { name = `file${index++}`; } while (Object.hasOwn(rewritten, name) || formData.has(name));
      }
      formData.append(name, await this.readLocalFile(filePath), basename(filePath));
      if (direct) directFiles.add(name);
      else ref.set(`attach://${name}`);
    }
    for (const [key, value] of Object.entries(rewritten)) {
      if (value === undefined || value === null || directFiles.has(key)) continue;
      formData.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
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

  private async readLocalFile(filePath: string): Promise<Blob> {
    const resolved = resolve(normalize(filePath));

    // Path traversal protection: require trailing separator in comparison.
    // The mirror dir holds files this server downloaded itself, so it is always allowed —
    // otherwise TELEGRAM_ALLOWED_UPLOAD_DIRS would block the URL-upload fallback.
    if (this.config.allowedUploadDirs.length > 0 && !resolved.startsWith(this.mirrorDir + sep)) {
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

  /** Download a file by file_id. Returns the local path. */
  async downloadFile(fileId: string, destDir: string): Promise<string> {
    // Step 1: getFile to get file_path
    const fileInfo = (await this.call("getFile", { file_id: fileId })) as {
      file_id: string;
      file_path?: string;
      file_size?: number;
    };

    if (!fileInfo.file_path) {
      throw new Error("Telegram returned no file_path — file may be too large (>20MB)");
    }

    // Step 2: download from https://api.telegram.org/file/bot<token>/<file_path>
    const url = `https://api.telegram.org/file/bot${this.token}/${fileInfo.file_path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Download failed: HTTP ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Determine filename from file_path
      const fileName = fileInfo.file_path.split("/").pop() || `file_${fileId}`;
      const destPath = resolve(normalize(join(destDir, fileName)));

      // Security: ensure dest is inside destDir
      const normalizedDir = resolve(normalize(destDir));
      if (!destPath.startsWith(normalizedDir + sep) && destPath !== normalizedDir) {
        throw new Error(`Path traversal blocked: ${destPath} is not inside ${normalizedDir}`);
      }

      await mkdir(dirname(destPath), { recursive: true });
      await writeFile(destPath, buffer);

      return destPath;
    } finally {
      clearTimeout(timeout);
    }
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
