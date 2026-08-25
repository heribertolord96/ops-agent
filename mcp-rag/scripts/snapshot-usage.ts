/**
 * Aggregate mcp-usage.jsonl into a daily (or timestamped) snapshot JSON.
 * Run: npm run snapshot-usage
 * Optional cron: 0 20 * * * cd /absolute/path/to/mcp-rag && npm run snapshot-usage
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

type UsageEvent = {
  ts?: string;
  tool?: string;
  project_id?: string;
  chars?: number;
  is_error?: boolean;
  ms?: number;
};

type Snapshot = {
  ts: string;
  total_calls: number;
  searches: number;
  syncs: number;
  errors: number;
  chars: number;
  by_project: Record<string, number>;
  by_tool: Record<string, number>;
};

type SnapshotIndex = {
  updated_at: string;
  files: Array<{ name: string; ts: string }>;
};

function usage(): never {
  console.error(`Usage:
  npm run snapshot-usage
  tsx scripts/snapshot-usage.ts [--input <jsonl>] [--out-dir <dir>]
`);
  process.exit(2);
}

function parseArgs(argv: string[]): { input: string; outDir: string } {
  let input = path.join(PACKAGE_ROOT, "logs", "mcp-usage.jsonl");
  let outDir = path.join(PACKAGE_ROOT, "logs", "snapshots");

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--input") {
      input = argv[++i] ?? "";
    } else if (a === "--out-dir") {
      outDir = argv[++i] ?? "";
    } else if (a === "--help" || a === "-h") {
      usage();
    } else {
      console.error(`Unknown arg: ${a}`);
      usage();
    }
  }

  if (!input.trim() || !outDir.trim()) usage();
  return { input: path.resolve(input), outDir: path.resolve(outDir) };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local calendar date for daily filenames (cron is typically local time). */
function localDateStamp(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function localTimeStamp(d: Date): string {
  return `${localDateStamp(d)}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function parseJsonl(text: string): UsageEvent[] {
  const events: UsageEvent[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const row = JSON.parse(trimmed) as UsageEvent;
      if (row && typeof row === "object") events.push(row);
    } catch {
      // skip malformed lines
    }
  }
  return events;
}

function aggregate(events: UsageEvent[], takenAt: string): Snapshot {
  const by_project: Record<string, number> = {};
  const by_tool: Record<string, number> = {};
  let searches = 0;
  let syncs = 0;
  let errors = 0;
  let chars = 0;

  for (const e of events) {
    const tool = typeof e.tool === "string" && e.tool ? e.tool : "unknown";
    const project =
      typeof e.project_id === "string" && e.project_id ? e.project_id : "(none)";
    by_tool[tool] = (by_tool[tool] ?? 0) + 1;
    by_project[project] = (by_project[project] ?? 0) + 1;
    if (tool === "search_knowledge_base") searches += 1;
    if (tool === "sync_project_docs") syncs += 1;
    if (e.is_error === true) errors += 1;
    chars += Number(e.chars) || 0;
  }

  return {
    ts: takenAt,
    total_calls: events.length,
    searches,
    syncs,
    errors,
    chars,
    by_project,
    by_tool,
  };
}

function snapshotFileName(now: Date, existing: Set<string>): string {
  const daily = `${localDateStamp(now)}.json`;
  if (!existing.has(daily)) return daily;
  return `${localTimeStamp(now)}.json`;
}

async function readUsage(inputPath: string): Promise<string> {
  try {
    return await readFile(inputPath, "utf8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      console.error(
        `Missing usage log: ${inputPath}\n` +
          "MCP tool calls write logs/mcp-usage.jsonl. Nothing to snapshot yet.",
      );
      process.exit(1);
    }
    throw err;
  }
}

async function listSnapshotNames(outDir: string): Promise<string[]> {
  try {
    const names = await readdir(outDir);
    return names.filter((n) => n.endsWith(".json") && n !== "index.json");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return [];
    throw err;
  }
}

async function main(): Promise<void> {
  const { input, outDir } = parseArgs(process.argv.slice(2));
  const now = new Date();
  const takenAt = now.toISOString();

  const text = await readUsage(input);
  const snapshot = aggregate(parseJsonl(text), takenAt);

  await mkdir(outDir, { recursive: true });
  const existing = new Set(await listSnapshotNames(outDir));
  const fileName = snapshotFileName(now, existing);
  const filePath = path.join(outDir, fileName);

  await writeFile(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  existing.add(fileName);
  const files: SnapshotIndex["files"] = [];
  for (const name of existing) {
    let ts = takenAt;
    if (name !== fileName) {
      try {
        const prev = JSON.parse(await readFile(path.join(outDir, name), "utf8")) as {
          ts?: string;
        };
        if (typeof prev.ts === "string") ts = prev.ts;
      } catch {
        ts = name.replace(/\.json$/, "");
      }
    }
    files.push({ name, ts });
  }
  files.sort((a, b) => (a.name < b.name ? 1 : a.name > b.name ? -1 : 0));

  const index: SnapshotIndex = { updated_at: takenAt, files };
  await writeFile(
    path.join(outDir, "index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        file: filePath,
        index: path.join(outDir, "index.json"),
        total_calls: snapshot.total_calls,
        searches: snapshot.searches,
        syncs: snapshot.syncs,
        errors: snapshot.errors,
        chars: snapshot.chars,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
