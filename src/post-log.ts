import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = join(__dirname, "..", "data", "post-log.jsonl");

export interface PostLogEntry {
  timestamp: string;
  method: string;
  chat_id: string | number;
  message_id?: number;
  /** External content ID (e.g. Civitai image ID) — for dedup by caller */
  content_id?: string;
  caption_preview?: string;
}

/** Append a log entry after a successful send/forward/copy. */
export async function logPost(entry: PostLogEntry): Promise<void> {
  await mkdir(dirname(LOG_PATH), { recursive: true });
  const line = JSON.stringify(entry) + "\n";
  await writeFile(LOG_PATH, line, { flag: "a" });
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
  let entries: PostLogEntry[] = lines.map((l) => JSON.parse(l));

  if (chatId !== undefined) {
    entries = entries.filter((e) => String(e.chat_id) === String(chatId));
  }

  return entries.reverse().slice(0, limit);
}
