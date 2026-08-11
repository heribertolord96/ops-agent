export type AppConfig = {
  ollamaUrl: string;
  qdrantUrl: string;
  embeddingModel: string;
  embeddingDim: number | null;
  collection: string;
  defaultProjectId: string;
  requestTimeoutMs: number;
};

function envInt(name: string): number | null {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Load config from env with capitalbot-compatible defaults. */
export function loadConfig(): AppConfig {
  return {
    ollamaUrl: (process.env.OLLAMA_URL ?? "http://127.0.0.1:11434").replace(/\/$/, ""),
    qdrantUrl: (process.env.QDRANT_URL ?? "http://127.0.0.1:6333").replace(/\/$/, ""),
    embeddingModel: process.env.EMBEDDING_MODEL ?? "nomic-embed-text",
    embeddingDim: envInt("EMBEDDING_DIM"),
    collection: process.env.QDRANT_COLLECTION ?? "ops_knowledge",
    defaultProjectId: process.env.DEFAULT_PROJECT_ID ?? "ops-agent",
    requestTimeoutMs: envInt("HTTP_TIMEOUT_MS") ?? 60_000,
  };
}

export const UNREACHABLE_MSG =
  "⚠️ Qdrant/Ollama MCP service is unreachable. Falling back to local file reading.";
