import type { AppConfig } from "../config.js";
import { UNREACHABLE_MSG } from "../config.js";
import type { OllamaClient } from "../clients/ollama.js";
import type { QdrantClient } from "../clients/qdrant.js";
import { assertServicesReachable } from "../health.js";
import type { McpToolResult } from "../usageLog.js";

export type SearchArgs = {
  query: string;
  project_id?: string;
  limit?: number;
};

export async function searchKnowledgeBase(
  args: SearchArgs,
  deps: {
    config: AppConfig;
    ollama: OllamaClient;
    qdrant: QdrantClient;
  },
): Promise<McpToolResult> {
  const projectId = args.project_id?.trim() || deps.config.defaultProjectId;
  const fail = (text: string): McpToolResult => ({
    text,
    isError: true,
    projectId,
    hitCount: 0,
  });

  const unreachable = await assertServicesReachable(deps.ollama, deps.qdrant);
  if (unreachable) {
    return fail(unreachable);
  }

  const limit = Math.min(Math.max(args.limit ?? 5, 1), 20);
  const query = args.query.trim();
  if (!query) {
    return fail("query is required");
  }

  try {
    const vector = await deps.ollama.embed(query);
    const hits = await deps.qdrant.search(vector, projectId, limit);

    if (hits.length === 0) {
      return {
        text: JSON.stringify(
          {
            project_id: projectId,
            collection: deps.config.collection,
            hits: [],
            message: "No matching chunks. Sync docs first with sync_project_docs.",
          },
          null,
          2,
        ),
        projectId,
        hitCount: 0,
      };
    }

    const formatted = hits.map((hit, i) => {
      const p = hit.payload;
      return {
        rank: i + 1,
        score: Number(hit.score.toFixed(4)),
        source_path: p.source_path ?? null,
        chunk_index: p.chunk_index ?? null,
        content: typeof p.content === "string" ? p.content : "",
      };
    });

    return {
      text: JSON.stringify(
        {
          project_id: projectId,
          collection: deps.config.collection,
          query,
          hits: formatted,
        },
        null,
        2,
      ),
      projectId,
      hitCount: formatted.length,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/fetch failed|ECONNREFUSED|ENOTFOUND|timeout|AbortError/i.test(msg)) {
      return fail(UNREACHABLE_MSG);
    }
    return fail(`search_knowledge_base failed: ${msg}`);
  }
}
