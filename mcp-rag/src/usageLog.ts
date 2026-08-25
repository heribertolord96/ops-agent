import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type UsageToolName = "search_knowledge_base" | "sync_project_docs";

export type McpToolResult = {
  text: string;
  isError?: boolean;
  projectId?: string;
  hitCount?: number;
  files?: number;
  chunks?: number;
};

export type UsageLogInput = {
  tool: UsageToolName;
  projectId: string;
  query?: string;
  targetDir?: string;
  hitCount?: number;
  files?: number;
  chunks?: number;
  chars: number;
  isError: boolean;
  ms: number;
};

const QUERY_MAX = 120;

/** Package root (mcp-rag/), not process.cwd() — Cursor may start MCP elsewhere. */
const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const USAGE_LOG_PATH = path.join(PACKAGE_ROOT, "logs", "mcp-usage.jsonl");

/** Truncate query for logs. Never log file bodies, env, or credentials. */
export function truncateQuery(query: string, max = QUERY_MAX): string {
  const collapsed = query.replace(/\s+/g, " ").trim();
  if (collapsed.length <= max) return collapsed;
  return collapsed.slice(0, max);
}

function toLine(input: UsageLogInput): Record<string, unknown> {
  const line: Record<string, unknown> = {
    ts: new Date().toISOString(),
    tool: input.tool,
    project_id: input.projectId,
  };
  if (input.query !== undefined) line.query = truncateQuery(input.query);
  if (input.targetDir !== undefined) line.target_dir = input.targetDir;
  if (input.hitCount !== undefined) line.hit_count = input.hitCount;
  if (input.files !== undefined) line.files = input.files;
  if (input.chunks !== undefined) line.chunks = input.chunks;
  line.chars = input.chars;
  line.is_error = input.isError;
  line.ms = input.ms;
  return line;
}

/**
 * One JSON line per MCP tool call (success, error, and fallback).
 * Writes mcp-usage.jsonl and mirrors a concise JSON object on stderr
 * (stdio-safe; stdout is the MCP protocol).
 */
export async function recordUsage(input: UsageLogInput): Promise<void> {
  const line = JSON.stringify(toLine(input));
  console.error(line);
  try {
    await mkdir(path.dirname(USAGE_LOG_PATH), { recursive: true });
    await appendFile(USAGE_LOG_PATH, `${line}\n`, "utf8");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ ts: new Date().toISOString(), tool: "usage_log", is_error: true, message: msg }));
  }
}
