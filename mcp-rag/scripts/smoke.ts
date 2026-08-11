/**
 * Smoke test: health → sync fixture → search.
 * Run: npm run smoke (from mcp-rag/)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig, UNREACHABLE_MSG } from "../src/config.js";
import { OllamaClient } from "../src/clients/ollama.js";
import { QdrantClient } from "../src/clients/qdrant.js";
import { syncProjectDocs } from "../src/tools/sync.js";
import { searchKnowledgeBase } from "../src/tools/search.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, "..", "fixtures");

async function main(): Promise<void> {
  const config = loadConfig();
  const ollama = new OllamaClient(config);
  const qdrant = new QdrantClient(config);

  console.log("Config:", {
    ollamaUrl: config.ollamaUrl,
    qdrantUrl: config.qdrantUrl,
    model: config.embeddingModel,
    collection: config.collection,
  });

  const [okO, okQ] = await Promise.all([ollama.isReachable(), qdrant.isReachable()]);
  console.log("Reachable:", { ollama: okO, qdrant: okQ });

  if (!okO || !okQ) {
    console.error(UNREACHABLE_MSG);
    process.exit(2);
  }

  const models = await ollama.listModels();
  const hasEmbed = models.some((m) => m.startsWith(config.embeddingModel));
  if (!hasEmbed) {
    console.error(
      `Missing model ${config.embeddingModel}. Pull with:\n` +
        `  docker exec capitalbot-ollama ollama pull ${config.embeddingModel}`,
    );
    process.exit(3);
  }
  console.log("Embedding model present:", config.embeddingModel);

  const sync = await syncProjectDocs(
    { target_dir: fixturesDir, project_id: "ops-smoke", force: true },
    { config, ollama, qdrant },
  );
  console.log("sync_project_docs:\n", sync.text);
  if (sync.isError) process.exit(4);

  const search = await searchKnowledgeBase(
    { query: "Qdrant filter project_id", project_id: "ops-smoke", limit: 3 },
    { config, ollama, qdrant },
  );
  console.log("search_knowledge_base:\n", search.text);
  if (search.isError) process.exit(5);

  console.log("Smoke OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
