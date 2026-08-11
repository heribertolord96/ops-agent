/**
 * CLI: sync Markdown into ops_knowledge.
 * Usage:
 *   npm run sync-docs -- --dir /path/to/docs --project-id ops-agent
 *   npm run sync-docs -- --dir ./fixtures --project-id ops-smoke --force
 */
import { loadConfig } from "../src/config.js";
import { OllamaClient } from "../src/clients/ollama.js";
import { QdrantClient } from "../src/clients/qdrant.js";
import { syncProjectDocs } from "../src/tools/sync.js";

function usage(): never {
  console.error(`Usage:
  npm run sync-docs -- --dir <path> --project-id <id> [--force] [--no-mdx]

Options:
  --dir          Root directory to scan for .md / .mdx (required)
  --project-id   Payload project_id filter (required)
  --force        Re-embed even when content_hash matches
  --no-mdx       Skip .mdx files
`);
  process.exit(2);
}

function parseArgs(argv: string[]): {
  dir: string;
  projectId: string;
  force: boolean;
  includeMdx: boolean;
} {
  let dir = "";
  let projectId = "";
  let force = false;
  let includeMdx = true;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--dir") {
      dir = argv[++i] ?? "";
    } else if (a === "--project-id") {
      projectId = argv[++i] ?? "";
    } else if (a === "--force") {
      force = true;
    } else if (a === "--no-mdx") {
      includeMdx = false;
    } else if (a === "--help" || a === "-h") {
      usage();
    } else {
      console.error(`Unknown arg: ${a}`);
      usage();
    }
  }

  if (!dir.trim() || !projectId.trim()) usage();
  return { dir: dir.trim(), projectId: projectId.trim(), force, includeMdx };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const ollama = new OllamaClient(config);
  const qdrant = new QdrantClient(config);

  console.log("sync-docs:", {
    dir: args.dir,
    project_id: args.projectId,
    force: args.force,
    collection: config.collection,
  });

  const result = await syncProjectDocs(
    {
      target_dir: args.dir,
      project_id: args.projectId,
      force: args.force,
      include_mdx: args.includeMdx,
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
