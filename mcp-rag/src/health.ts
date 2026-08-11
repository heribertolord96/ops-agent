import type { AppConfig } from "./config.js";
import { UNREACHABLE_MSG } from "./config.js";
import type { OllamaClient } from "./clients/ollama.js";
import type { QdrantClient } from "./clients/qdrant.js";

export async function assertServicesReachable(
  ollama: OllamaClient,
  qdrant: QdrantClient,
): Promise<string | null> {
  const [okOllama, okQdrant] = await Promise.all([
    ollama.isReachable(),
    qdrant.isReachable(),
  ]);
  if (!okOllama || !okQdrant) return UNREACHABLE_MSG;
  return null;
}

export async function resolveVectorSize(
  config: AppConfig,
  ollama: OllamaClient,
  probeText = "ops-rag dim probe",
): Promise<number> {
  if (config.embeddingDim && config.embeddingDim > 0) {
    return config.embeddingDim;
  }
  const vec = await ollama.embed(probeText);
  return vec.length;
}
