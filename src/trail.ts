/**
 * trail.ts — TRAIL Protocol v2.1 (Tracking Records Across Isolated Logs)
 *
 * Reference implementation for TypeScript MCP servers.
 * https://github.com/timoncool/trail-spec
 *
 * Usage:
 *   import { Trail } from "./trail";
 *   const trail = new Trail("./data", "my-mcp-server");
 *   await trail.append("civitai:image:12345", "posted", "daily-post", { details: { platform: "telegram" } });
 *   const { entries, total } = await trail.query({ content_id: "civitai:image:12345" });
 */

import { readFile, appendFile, mkdir, access } from "fs/promises";
import { join, dirname } from "path";

export interface TrailEntry {
  version: number;
  timestamp: string;
  content_id: string;
  action: string;
  requester: string;
  details?: Record<string, unknown>;
  trace_id?: string;
  server?: string;
  entry_id?: string;
  caused_by?: string;
  tags?: string[];
}

export interface TrailQuery {
  /** Filter by content ID (exact match, or prefix ending with ':') */
  content_id?: string;
  /** Filter by action (string or array for multi-action filtering) */
  action?: string | string[];
  /** Filter by requester */
  requester?: string;
  /** Filter by trace ID */
  trace_id?: string;
  /** Filter by server name */
  server?: string;
  /** Filter entries that have ALL specified tags */
  tags?: string[];
  /** ISO 8601 timestamp — only return entries after this time */
  since?: string;
  /** Max entries to return, newest first (0 = unlimited, default 50) */
  limit?: number;
  /** Number of entries to skip for pagination */
  offset?: number;
}

export interface TrailAppendOptions {
  details?: Record<string, unknown>;
  trace_id?: string;
  server?: string;
  entry_id?: string;
  caused_by?: string;
  tags?: string[];
}

export interface TrailQueryResult {
  entries: TrailEntry[];
  total: number;
}

export interface TrailStats {
  total_entries: number;
  by_action: Record<string, number>;
  unique_content_ids: number;
  first_entry: string | null;
  last_entry: string | null;
}

/**
 * Async mutex for serializing writes.
 * Ensures append-only integrity without external dependencies.
 */
class Mutex {
  private _queue: Array<() => void> = [];
  private _locked = false;

  async acquire(): Promise<void> {
    if (!this._locked) {
      this._locked = true;
      return;
    }
    return new Promise<void>((resolve) => {
      this._queue.push(resolve);
    });
  }

  release(): void {
    const next = this._queue.shift();
    if (next) {
      next();
    } else {
      this._locked = false;
    }
  }
}

/** Check if content_id filter matches an entry's content_id.
 *  - Exact match: "civitai:image:12345" matches "civitai:image:12345"
 *  - Prefix match: "civitai:image:" matches "civitai:image:12345" (prefix must end with ':')
 */
function matchContentId(filter: string, entryId: string): boolean {
  if (entryId === filter) return true;
  if (filter.endsWith(":") && entryId.startsWith(filter)) return true;
  return false;
}

export class Trail {
  private static readonly FILENAME = "trail.jsonl";
  private static readonly VERSION = 2;
  private readonly filePath: string;
  private readonly serverName?: string;
  private readonly _mutex = new Mutex();

  constructor(dataDir: string, server?: string) {
    this.filePath = join(dataDir, Trail.FILENAME);
    this.serverName = server;
    mkdir(dirname(this.filePath), { recursive: true }).catch(() => {});
  }

  /**
   * Append an event to the trail.
   * Thread-safe — serialized via async mutex.
   */
  async append(
    content_id: string,
    action: string,
    requester: string,
    options?: TrailAppendOptions
  ): Promise<TrailEntry> {
    const entry: TrailEntry = {
      version: Trail.VERSION,
      timestamp: new Date().toISOString(),
      content_id,
      action,
      requester,
    };
    const srv = options?.server ?? this.serverName;
    if (srv) entry.server = srv;
    if (options?.details) entry.details = options.details;
    if (options?.trace_id) entry.trace_id = options.trace_id;
    if (options?.entry_id) entry.entry_id = options.entry_id;
    if (options?.caused_by) entry.caused_by = options.caused_by;
    if (options?.tags) entry.tags = options.tags;

    await this._mutex.acquire();
    try {
      await appendFile(this.filePath, JSON.stringify(entry) + "\n", "utf-8");
    } finally {
      this._mutex.release();
    }
    return entry;
  }

  /** Query the trail with filters. Returns entries newest first + total count. */
  async query(q: TrailQuery = {}): Promise<TrailQueryResult> {
    const {
      content_id,
      action,
      requester,
      trace_id,
      server,
      tags,
      since,
      limit = 50,
      offset = 0,
    } = q;

    const fileExists = await access(this.filePath)
      .then(() => true)
      .catch(() => false);
    if (!fileExists) return { entries: [], total: 0 };

    const actionSet = action
      ? new Set(Array.isArray(action) ? action : [action])
      : null;

    const data = await readFile(this.filePath, "utf-8");
    const lines = data.split("\n").filter(Boolean);
    const matched: TrailEntry[] = [];

    for (const line of lines) {
      try {
        const entry: TrailEntry = JSON.parse(line);
        if (content_id && !matchContentId(content_id, entry.content_id))
          continue;
        if (actionSet && !actionSet.has(entry.action)) continue;
        if (requester && entry.requester !== requester) continue;
        if (trace_id && entry.trace_id !== trace_id) continue;
        if (server && entry.server !== server) continue;
        if (tags && !tags.every((t) => entry.tags?.includes(t))) continue;
        if (since && entry.timestamp < since) continue;
        matched.push(entry);
      } catch {
        continue;
      }
    }

    const total = matched.length;
    let result = matched.reverse();
    if (offset) result = result.slice(offset);
    if (limit) result = result.slice(0, limit);
    return { entries: result, total };
  }

  /** Get summary statistics for the trail. */
  async stats(requester?: string, since?: string): Promise<TrailStats> {
    const { entries } = await this.query({ requester, since, limit: 0 });
    const byAction: Record<string, number> = {};
    const cids = new Set<string>();
    const timestamps: string[] = [];

    for (const e of entries) {
      byAction[e.action] = (byAction[e.action] ?? 0) + 1;
      cids.add(e.content_id);
      timestamps.push(e.timestamp);
    }

    return {
      total_entries: entries.length,
      by_action: byAction,
      unique_content_ids: cids.size,
      first_entry: timestamps.length
        ? timestamps.reduce((a, b) => (a < b ? a : b))
        : null,
      last_entry: timestamps.length
        ? timestamps.reduce((a, b) => (a > b ? a : b))
        : null,
    };
  }

  /** Check if content was already posted. */
  async isUsed(content_id: string, requester?: string): Promise<boolean> {
    const { entries } = await this.query({
      content_id,
      action: "posted",
      requester,
      limit: 1,
    });
    return entries.length > 0;
  }

  /** Get set of all posted content IDs. */
  async getUsedIds(requester?: string): Promise<Set<string>> {
    const { entries } = await this.query({
      action: "posted",
      requester,
      limit: 0,
    });
    return new Set(entries.map((e) => e.content_id));
  }
}
