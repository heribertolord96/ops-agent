/**
 * CLI: search ops_knowledge.
 * Usage:
 *   npm run search -- --query "ops triage" --project-id ops-agent --limit 3
 */
import { loadConfig } from "../src/config.js";
import { OllamaClient } from "../src/clients/ollama.js";
import { QdrantClient } from "../src/clients/qdrant.js";
import { searchKnowledgeBase } from "../src/tools/search.js";

function usage(): never {
  console.error(`Usage:
  npm run search -- --query "<text>" [--project-id <id>] [--limit N]
`);
  process.exit(2);
}

function parseArgs(argv: string[]): {
  query: string;
  projectId?: string;
  limit?: number;
} {
  let query = "";
  let projectId: string | undefined;
  let limit: number | undefined;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--query") {
      query = argv[++i] ?? "";
    } else if (a === "--project-id") {
      projectId = argv[++i];
    } else if (a === "--limit") {
      limit = Number.parseInt(argv[++i] ?? "", 10);
    } else if (a === "--help" || a === "-h") {
      usage();
    } else {
      console.error(`Unknown arg: ${a}`);
      usage();
    }
  }

  if (!query.trim()) usage();
  return { query: query.trim(), projectId, limit };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const ollama = new OllamaClient(config);
  const qdrant = new QdrantClient(config);

  const result = await searchKnowledgeBase(
    {
      query: args.query,
      project_id: args.projectId,
      limit: args.limit,
    },
    { config, ollama, qdrant },
  );

  console.log(result.text);
  if (result.isError) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
