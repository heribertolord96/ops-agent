import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../config.js";
import type { OllamaClient } from "../clients/ollama.js";
import type { QdrantClient } from "../clients/qdrant.js";
import { chunkMarkdown } from "../chunking.js";
import { deterministicPointId, sha256 } from "../hash.js";
import { assertServicesReachable, resolveVectorSize } from "../health.js";

export type SyncArgs = {
  target_dir: string;
  project_id?: string;
  force?: boolean;
  include_mdx?: boolean;
};

type SyncStats = {
  scanned: number;
  skipped_unchanged: number;
  indexed_files: number;
  indexed_chunks: number;
  deleted_empty: number;
  errors: string[];
};

export async function syncProjectDocs(
  args: SyncArgs,
  deps: {
    config: AppConfig;
    ollama: OllamaClient;
    qdrant: QdrantClient;
  },
): Promise<{ text: string; isError?: boolean }> {
  const unreachable = await assertServicesReachable(deps.ollama, deps.qdrant);
  if (unreachable) {
    return { text: unreachable, isError: true };
  }

  const projectId = args.project_id?.trim() || deps.config.defaultProjectId;
  const root = path.resolve(args.target_dir);
  const force = Boolean(args.force);
  const includeMdx = args.include_mdx !== false;

  try {
    const rootStat = await stat(root);
    if (!rootStat.isDirectory()) {
      return { text: `target_dir is not a directory: ${root}`, isError: true };
    }
  } catch {
    return { text: `target_dir not found: ${root}`, isError: true };
  }

  const stats: SyncStats = {
    scanned: 0,
    skipped_unchanged: 0,
    indexed_files: 0,
    indexed_chunks: 0,
    deleted_empty: 0,
    errors: [],
  };

  try {
    const vectorSize = await resolveVectorSize(deps.config, deps.ollama);
    await deps.qdrant.ensureCollection(vectorSize);

    const files = await listMarkdownFiles(root, includeMdx);
    stats.scanned = files.length;

    for (const absPath of files) {
      const relative = path.relative(root, absPath).split(path.sep).join("/");
      try {
        const raw = await readFile(absPath, "utf8");
        const contentHash = sha256(raw);

        if (!force) {
          const existing = await deps.qdrant.getFileContentHash(projectId, relative);
          if (existing === contentHash) {
            stats.skipped_unchanged++;
            continue;
          }
        }

        const chunks = chunkMarkdown(raw);
        await deps.qdrant.deleteBySourcePath(projectId, relative);

        if (chunks.length === 0) {
          stats.deleted_empty++;
          continue;
        }

        const points = [];
        for (let i = 0; i < chunks.length; i++) {
          const content = chunks[i]!;
          // Sequential embeds keep Ollama CPU load predictable
          const vector = await deps.ollama.embed(content);
          points.push({
            id: deterministicPointId(projectId, relative, String(i)),
            vector,
            payload: {
              project_id: projectId,
              source_path: relative,
              absolute_path: absPath,
              chunk_index: i,
              content,
              content_hash: contentHash,
              embedding_model: deps.config.embeddingModel,
              synced_at: new Date().toISOString(),
            },
          });
        }

        await deps.qdrant.upsertPoints(points);
        stats.indexed_files++;
        stats.indexed_chunks += points.length;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        stats.errors.push(`${relative}: ${msg}`);
      }
    }

    return {
      text: JSON.stringify(
        {
          project_id: projectId,
          collection: deps.config.collection,
          target_dir: root,
          ...stats,
        },
        null,
        2,
      ),
      isError: stats.errors.length > 0 && stats.indexed_files === 0,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/fetch failed|ECONNREFUSED|ENOTFOUND|timeout|AbortError/i.test(msg)) {
      return {
        text: "⚠️ Qdrant/Ollama MCP service is unreachable. Falling back to local file reading.",
        isError: true,
      };
    }
    return { text: `sync_project_docs failed: ${msg}`, isError: true };
  }
}

async function listMarkdownFiles(root: string, includeMdx: boolean): Promise<string[]> {
  const out: string[] = [];
  const skipDirs = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "vendor",
    "coverage",
    "storage",
    "sail", // local docker volume data (e.g. mariadb) — often unreadable
  ]);

  // Allow .cursor so ops skills (SKILL.md) can be indexed; still skip .git etc.
  const allowDotDirs = new Set([".cursor"]);

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.isDirectory() &&
        entry.name.startsWith(".") &&
        !allowDotDirs.has(entry.name)
      ) {
        continue;
      }
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        await walk(full);
        continue;
      }
      const lower = entry.name.toLowerCase();
      if (lower.endsWith(".md") || (includeMdx && lower.endsWith(".mdx"))) {
        out.push(full);
      }
    }
  }

  await walk(root);
  out.sort();
  return out;
}
