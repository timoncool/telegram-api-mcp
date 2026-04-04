import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = join(__dirname, "..", "data", "post-log.jsonl");

/** Ensure data dir exists — called once lazily. */
let dirReady = false;
async function ensureDir(): Promise<void> {
  if (dirReady) return;
  await mkdir(dirname(LOG_PATH), { recursive: true });
  dirReady = true;
}

export interface PostLogEntry {
  timestamp: string;
  method: string;
  chat_id: string | number;
  message_id?: number;
  /** External content ID (e.g. Civitai image ID) — for dedup by caller */
  content_id?: string;
  caption_preview?: string;
}

/** Async mutex: serializes writes to prevent race conditions. */
let writeQueue: Promise<void> = Promise.resolve();

/** Append a log entry after a successful send/forward/copy. */
export function logPost(entry: PostLogEntry): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await ensureDir();
    const line = JSON.stringify(entry) + "\n";
    await writeFile(LOG_PATH, line, { flag: "a" });
  });
  return writeQueue;
}

/** Read post history, optionally filtered by chat_id. Returns newest first. */
export async function getPostHistory(chatId?: string | number, limit = 50): Promise<PostLogEntry[]> {
  let raw: string;
  try {
    raw = await readFile(LOG_PATH, "utf-8");
  } catch {
    return [];
  }

  const lines = raw.trim().split("\n").filter(Boolean);
  const entries: PostLogEntry[] = [];
  for (const l of lines) {
    try { entries.push(JSON.parse(l)); } catch { /* skip corrupt line */ }
  }

  if (chatId !== undefined) {
    const filtered = entries.filter((e) => String(e.chat_id) === String(chatId));
    return filtered.reverse().slice(0, limit);
  }

  return entries.reverse().slice(0, limit);
}
