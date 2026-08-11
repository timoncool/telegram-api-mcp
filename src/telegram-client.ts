import { readFile, writeFile, stat, mkdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, resolve, normalize, sep } from "node:path";
import { Config } from "./config.js";
import { RateLimiter } from "./rate-limiter.js";
import { CircuitBreaker, CircuitOpenError } from "./circuit-breaker.js";

/** Default fetch timeout: 60 seconds */
const FETCH_TIMEOUT_MS = 60_000;

/** Parameters that carry a file: a file_id, an HTTP URL, or a local path. */
const FILE_FIELDS = [
  "photo", "audio", "document", "video", "animation", "voice",
  "video_note", "sticker", "thumbnail", "certificate", "cover", "live_photo",
] as const;

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

/**
 * Every InputMedia object reachable from a call's params, wherever it hides:
 * sendMediaGroup's `media` array, editMessageMedia's single `media` object, and the
 * InputRichMessageMedia entries in `rich_message.media` (each of which wraps its own
 * InputMedia under `.media`). Returned objects are the live ones, so callers can rewrite
 * their `media` / `thumbnail` / `cover` fields in place.
 */
function inputMediaObjects(params: Record<string, unknown>): Record<string, unknown>[] {
  const objects: Record<string, unknown>[] = [];

  const push = (value: unknown) => {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      objects.push(value as Record<string, unknown>);
    }
  };

  if (typeof params.media === "object" && params.media !== null) {
    const entries = Array.isArray(params.media) ? params.media : [params.media];
    entries.forEach(push);
  }

  const rich = params.rich_message;
  if (typeof rich === "object" && rich !== null) {
    const entries = (rich as Record<string, unknown>).media;
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        if (typeof entry !== "object" || entry === null) continue;
        // InputRichMessageMedia = { id, media: InputMedia }; tolerate a bare InputMedia too
        const inner = (entry as Record<string, unknown>).media;
        if (typeof inner === "object" && inner !== null) push(inner);
        else push(entry);
      }
    }
  }

  return objects;
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

  async call(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const resolvedParams = this.applyDefaults(params);

    // media / rich_message may arrive as a JSON string (tool schema is untyped) — parse so
    // attach:// rewriting sees the InputMedia inside them
    for (const key of ["media", "rich_message"]) {
      const value = resolvedParams[key];
      if (typeof value !== "string") continue;
      const trimmed = value.trim();
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        try {
          resolvedParams[key] = JSON.parse(trimmed);
        } catch {
          // leave as-is (could be a bare file_id/URL for editMessageMedia misuse)
        }
      }
    }

    const chatId = resolvedParams.chat_id as string | undefined;

    this.circuitBreaker.check();
    await this.rateLimiter.acquire(chatId);

    // Media given as an http(s) URL is always fetched here and uploaded as multipart.
    // Letting Telegram fetch the URL itself caps it at 5 MB for photos and 20 MB for
    // everything else and requires a MIME type it agrees with (sendDocument by URL only
    // accepts PDF and ZIP), so videos and large images failed. Uploading the bytes lifts
    // that to 10 MB / 50 MB and behaves the same for every link — one path, no retry
    // dance, and a precise error when a link genuinely cannot be used.
    if (this.collectRemoteUrls(resolvedParams).length > 0) {
      const mirrored = await this.mirrorRemoteFiles(resolvedParams);
      try {
        return await this.callWithRetry(method, mirrored.params, true);
      } finally {
        await Promise.all(mirrored.tempFiles.map((f) => unlink(f).catch(() => undefined)));
      }
    }

    return this.callWithRetry(method, resolvedParams, this.hasFileParams(resolvedParams));
  }

  /** Every http(s) URL sitting in a file field, including inside InputMedia. */
  private collectRemoteUrls(params: Record<string, unknown>): { setter: (v: string) => void; url: string }[] {
    const found: { setter: (v: string) => void; url: string }[] = [];

    for (const field of FILE_FIELDS) {
      const value = params[field];
      if (isHttpUrl(value)) {
        found.push({ url: value, setter: (v) => { params[field] = v; } });
      }
    }

    for (const item of inputMediaObjects(params)) {
      for (const field of ["media", "thumbnail", "cover"]) {
        const value = item[field];
        if (isHttpUrl(value)) {
          found.push({ url: value, setter: (v) => { item[field] = v; } });
        }
      }
    }

    return found;
  }

  /** Download every remote file field to a temp file and swap the URLs for local paths. */
  private async mirrorRemoteFiles(
    params: Record<string, unknown>
  ): Promise<{ params: Record<string, unknown>; tempFiles: string[] }> {
    const copy = structuredClone(params) as Record<string, unknown>;
    const targets = this.collectRemoteUrls(copy);
    const dir = this.mirrorDir;
    await mkdir(dir, { recursive: true });

    const tempFiles: string[] = [];
    for (const [index, target] of targets.entries()) {
      let response: Response;
      try {
        response = await fetch(target.url, { redirect: "follow" });
      } catch (error) {
        throw new TelegramApiError(
          `Could not download ${target.url}: ${(error as Error).message}. The link must be directly reachable from this machine.`,
          0
        );
      }
      if (!response.ok) {
        throw new TelegramApiError(
          `Could not download ${target.url} — HTTP ${response.status}. The link must point straight at the file, with no login or hotlink protection.`,
          response.status
        );
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.byteLength > this.config.maxFileSize) {
        throw new TelegramApiError(
          `${target.url} is ${(bytes.byteLength / 1048576).toFixed(1)} MB — Telegram accepts at most ` +
            `${Math.round(this.config.maxFileSize / 1048576)} MB per upload. Send a smaller file or a shorter clip.`,
          413
        );
      }
      const filePath = join(dir, `${index}-${filenameForUrl(target.url, response.headers.get("content-type"))}`);
      await writeFile(filePath, bytes);
      tempFiles.push(filePath);
      target.setter(filePath);
    }

    return { params: copy, tempFiles };
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
      } else if (key === "media" && typeof value === "object") {
        // sendMediaGroup (array) / editMessageMedia (object): local paths inside InputMedia go via attach://
        const rewritten = Array.isArray(value)
          ? await this.attachInputMediaFiles(value, formData)
          : (await this.attachInputMediaFiles([value], formData))[0];
        formData.append(key, JSON.stringify(rewritten));
      } else if (key === "rich_message" && typeof value === "object" && value !== null) {
        // sendRichMessage: the InputMedia sits one level deeper, inside rich_message.media[].media,
        // and the markdown/html references it as tg://photo|video|audio?id=<id>. Same attach:// trick.
        const rich = structuredClone(value) as Record<string, unknown>;
        const entries = rich.media;
        if (Array.isArray(entries)) {
          const counter = { n: 0 }; // one namespace for the whole post, or names collide
          const rewritten: unknown[] = [];
          for (const entry of entries) {
            if (typeof entry !== "object" || entry === null) {
              rewritten.push(entry);
              continue;
            }
            const item = { ...(entry as Record<string, unknown>) };
            const inner = item.media;
            if (typeof inner === "object" && inner !== null) {
              item.media = (await this.attachInputMediaFiles([inner], formData, counter))[0];
              rewritten.push(item);
            } else {
              rewritten.push((await this.attachInputMediaFiles([item], formData, counter))[0]);
            }
          }
          rich.media = rewritten;
        }
        formData.append(key, JSON.stringify(rich));
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

  /** Rewrite local file paths inside InputMedia[] to attach://<name>, appending the files to the form. */
  private async attachInputMediaFiles(
    media: unknown[],
    formData: FormData,
    counter: { n: number } = { n: 0 }
  ): Promise<unknown[]> {
    const result: unknown[] = [];

    for (const entry of media) {
      if (typeof entry !== "object" || entry === null) {
        result.push(entry);
        continue;
      }
      const item = { ...(entry as Record<string, unknown>) };
      for (const field of ["media", "thumbnail", "cover"]) {
        const val = item[field];
        if (typeof val === "string" && (await this.isLocalFile(val))) {
          const name = `file${counter.n++}`;
          formData.append(name, await this.readLocalFile(val), basename(val));
          item[field] = `attach://${name}`;
        }
      }
      result.push(item);
    }

    return result;
  }

  private hasFileParams(params: Record<string, unknown>): boolean {
    const fileFields = new Set<string>(FILE_FIELDS);

    for (const [key, value] of Object.entries(params)) {
      if (fileFields.has(key) && typeof value === "string") {
        if (isAbsolute(value)) return true;
      }
    }

    // InputMedia paths live in media[].media / media[].thumbnail — for sendMediaGroup,
    // editMessageMedia and the rich_message.media entries alike
    for (const item of inputMediaObjects(params)) {
      for (const field of ["media", "thumbnail", "cover"]) {
        if (typeof item[field] === "string" && isAbsolute(item[field] as string)) return true;
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
