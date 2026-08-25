#!/usr/bin/env node
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./config.js";
import { OllamaClient } from "./clients/ollama.js";
import { QdrantClient } from "./clients/qdrant.js";
import { searchKnowledgeBase } from "./tools/search.js";
import { syncProjectDocs } from "./tools/sync.js";
import { recordUsage } from "./usageLog.js";

const config = loadConfig();
const ollama = new OllamaClient(config);
const qdrant = new QdrantClient(config);

const server = new McpServer({
  name: "ops-mcp-rag",
  version: "0.1.0",
});

server.tool(
  "search_knowledge_base",
  "Semantic search over ops Markdown docs indexed in Qdrant (collection ops_knowledge). Filters by project_id.",
  {
    query: z.string().describe("Natural language search query"),
    project_id: z
      .string()
      .optional()
      .describe("Project scope filter (default from DEFAULT_PROJECT_ID)"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .optional()
      .describe("Max hits (default 5)"),
  },
  async (args) => {
    const started = Date.now();
    const projectId = args.project_id?.trim() || config.defaultProjectId;
    try {
      const result = await searchKnowledgeBase(args, { config, ollama, qdrant });
      await recordUsage({
        tool: "search_knowledge_base",
        projectId: result.projectId ?? projectId,
        query: args.query,
        hitCount: result.hitCount ?? 0,
        chars: result.text.length,
        isError: Boolean(result.isError),
        ms: Date.now() - started,
      });
      return {
        content: [{ type: "text" as const, text: result.text }],
        isError: result.isError,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const text = `search_knowledge_base failed: ${msg}`;
      await recordUsage({
        tool: "search_knowledge_base",
        projectId,
        query: args.query,
        hitCount: 0,
        chars: text.length,
        isError: true,
        ms: Date.now() - started,
      });
      return {
        content: [{ type: "text" as const, text }],
        isError: true,
      };
    }
  },
);

server.tool(
  "sync_project_docs",
  "Scan a directory for .md/.mdx, skip unchanged files via content hash, chunk, embed with Ollama, upsert into Qdrant ops_knowledge.",
  {
    target_dir: z.string().describe("Absolute or relative directory to scan"),
    project_id: z
      .string()
      .optional()
      .describe("Project scope stored on each point (default DEFAULT_PROJECT_ID)"),
    force: z
      .boolean()
      .optional()
      .describe("Re-index even when content hash matches"),
    include_mdx: z
      .boolean()
      .optional()
      .describe("Include .mdx files (default true)"),
  },
  async (args) => {
    const started = Date.now();
    const projectId = args.project_id?.trim() || config.defaultProjectId;
    const targetDir = path.resolve(args.target_dir);
    try {
      const result = await syncProjectDocs(args, { config, ollama, qdrant });
      await recordUsage({
        tool: "sync_project_docs",
        projectId: result.projectId ?? projectId,
        targetDir,
        files: result.files ?? 0,
        chunks: result.chunks ?? 0,
        chars: result.text.length,
        isError: Boolean(result.isError),
        ms: Date.now() - started,
      });
      return {
        content: [{ type: "text" as const, text: result.text }],
        isError: result.isError,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const text = `sync_project_docs failed: ${msg}`;
      await recordUsage({
        tool: "sync_project_docs",
        projectId,
        targetDir,
        files: 0,
        chunks: 0,
        chars: text.length,
        isError: true,
        ms: Date.now() - started,
      });
      return {
        content: [{ type: "text" as const, text }],
        isError: true,
      };
    }
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ops-mcp-rag listening on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
