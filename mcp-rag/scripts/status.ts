/**
 * Developer status: Ollama, Qdrant, Node, build artifact.
 * Run: npm run status (from mcp-rag/)
 */
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "../src/config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const distEntry = path.join(root, "dist", "index.js");

type Check = { name: string; ok: boolean; detail: string };

async function checkOllama(baseUrl: string, model: string): Promise<Check> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) {
      return { name: "ollama", ok: false, detail: `/api/tags HTTP ${res.status}` };
    }
    const data = (await res.json()) as { models?: Array<{ name?: string }> };
    const names = (data.models ?? []).map((m) => m.name ?? "").filter(Boolean);
    const hasModel = names.some((n) => n === model || n.startsWith(`${model}:`));
    return {
      name: "ollama",
      ok: hasModel,
      detail: hasModel
        ? `up; model ${model} present (${names.length} models)`
        : `up; missing model ${model} (have: ${names.slice(0, 8).join(", ") || "none"})`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name: "ollama", ok: false, detail: `unreachable: ${msg}` };
  }
}

async function checkQdrant(baseUrl: string, collection: string): Promise<Check> {
  try {
    const ready = await fetch(`${baseUrl}/readyz`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!ready.ok) {
      return { name: "qdrant", ok: false, detail: `/readyz HTTP ${ready.status}` };
    }

    const col = await fetch(`${baseUrl}/collections/${collection}`, {
      signal: AbortSignal.timeout(5_000),
    });
    if (col.status === 404) {
      return {
        name: "qdrant",
        ok: true,
        detail: `ready; collection ${collection} does not exist yet`,
      };
    }
    if (!col.ok) {
      return {
        name: "qdrant",
        ok: false,
        detail: `ready; collection lookup HTTP ${col.status}`,
      };
    }
    const data = (await col.json()) as {
      result?: { points_count?: number; status?: string };
    };
    const points = data.result?.points_count ?? 0;
    const status = data.result?.status ?? "unknown";
    return {
      name: "qdrant",
      ok: true,
      detail: `ready; ${collection} status=${status} points=${points}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name: "qdrant", ok: false, detail: `unreachable: ${msg}` };
  }
}

async function checkDist(): Promise<Check> {
  try {
    await access(distEntry);
    return { name: "dist", ok: true, detail: `exists: ${distEntry}` };
  } catch {
    return {
      name: "dist",
      ok: false,
      detail: `missing ${distEntry} — run npm run build`,
    };
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  const nodeVersion = process.version;
  const nodeMajor = Number.parseInt(nodeVersion.slice(1), 10);
  const nodeOk = Number.isFinite(nodeMajor) && nodeMajor >= 20;

  const checks: Check[] = [
    {
      name: "node",
      ok: nodeOk,
      detail: nodeOk
        ? `${nodeVersion} (>=20 ok)`
        : `${nodeVersion} — need Node >=20`,
    },
    await checkDist(),
    await checkOllama(config.ollamaUrl, config.embeddingModel),
    await checkQdrant(config.qdrantUrl, config.collection),
  ];

  console.log("ops-mcp-rag status");
  console.log(
    JSON.stringify(
      {
        ollamaUrl: config.ollamaUrl,
        qdrantUrl: config.qdrantUrl,
        embeddingModel: config.embeddingModel,
        collection: config.collection,
      },
      null,
      2,
    ),
  );
  console.log("");
  for (const c of checks) {
    console.log(`${c.ok ? "OK" : "FAIL"}  ${c.name}: ${c.detail}`);
  }

  const failed = checks.filter((c) => !c.ok);
  if (failed.length > 0) {
    console.log(`\n${failed.length} check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
