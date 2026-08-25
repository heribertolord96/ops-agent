/**
 * Local static server for the metrics dashboard.
 * Serves the app at GET / (no directory listing).
 * Run: npm run dashboard
 */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DASHBOARD_DIR = path.join(PACKAGE_ROOT, "dashboard");
const LOGS_DIR = path.join(PACKAGE_ROOT, "logs");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jsonl": "application/jsonl; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const SNAPSHOT_NAME = /^[A-Za-z0-9._-]+\.json$/;

function send(
  res: http.ServerResponse,
  status: number,
  body: string | Buffer,
  headers: Record<string, string | number> = {},
): void {
  const payload = typeof body === "string" ? Buffer.from(body, "utf8") : body;
  res.writeHead(status, {
    "Content-Length": payload.length,
    ...headers,
  });
  res.end(payload);
}

function notFound(res: http.ServerResponse): void {
  send(res, 404, "Not found\n", { "Content-Type": "text/plain; charset=utf-8" });
}

function methodNotAllowed(res: http.ServerResponse): void {
  send(res, 405, "Method not allowed\n", {
    "Content-Type": "text/plain; charset=utf-8",
    Allow: "GET, HEAD",
  });
}

function pathnameOf(req: http.IncomingMessage): string {
  try {
    const u = new URL(req.url ?? "/", `http://${HOST}`);
    return decodeURIComponent(u.pathname);
  } catch {
    return "/";
  }
}

/** Resolve rel under root; null if it would escape. */
function resolveInside(root: string, rel: string): string | null {
  if (!rel || rel.includes("\0")) return null;
  const abs = path.resolve(root, rel);
  const rootResolved = path.resolve(root);
  if (abs !== rootResolved && !abs.startsWith(rootResolved + path.sep)) return null;
  return abs;
}

async function serveFile(
  res: http.ServerResponse,
  filePath: string,
  headOnly: boolean,
): Promise<void> {
  let data: Buffer;
  try {
    const st = await fs.stat(filePath);
    if (!st.isFile()) {
      notFound(res);
      return;
    }
    data = await fs.readFile(filePath);
  } catch {
    notFound(res);
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] ?? "application/octet-stream";
  const noStore = ext === ".html" || ext === ".js" || ext === ".json" || ext === ".jsonl";
  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": data.length,
    "Cache-Control": noStore ? "no-store" : "public, max-age=60",
  });
  if (headOnly) {
    res.end();
    return;
  }
  res.end(data);
}

function dashboardRel(pathname: string): string | null {
  let p = pathname;
  if (p.startsWith("/dashboard/")) p = p.slice("/dashboard".length);
  if (p === "/" || p === "") return null;
  if (p.includes("..") || p.includes("\0")) return null;
  return p.replace(/^\/+/, "");
}

async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const method = req.method ?? "GET";
  if (method !== "GET" && method !== "HEAD") {
    methodNotAllowed(res);
    return;
  }
  const headOnly = method === "HEAD";
  const pathname = pathnameOf(req);

  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    res.writeHead(302, { Location: "/" });
    res.end();
    return;
  }

  if (pathname === "/" || pathname === "/index.html") {
    await serveFile(res, path.join(DASHBOARD_DIR, "index.html"), headOnly);
    return;
  }

  if (pathname === "/logs/mcp-usage.jsonl") {
    await serveFile(res, path.join(LOGS_DIR, "mcp-usage.jsonl"), headOnly);
    return;
  }

  const snap = pathname.match(/^\/logs\/snapshots\/([A-Za-z0-9._-]+\.json)$/);
  if (snap) {
    const name = snap[1]!;
    if (!SNAPSHOT_NAME.test(name)) {
      notFound(res);
      return;
    }
    await serveFile(res, path.join(LOGS_DIR, "snapshots", name), headOnly);
    return;
  }

  if (pathname === "/logs" || pathname.startsWith("/logs/")) {
    notFound(res);
    return;
  }

  const rel = dashboardRel(pathname);
  if (!rel) {
    notFound(res);
    return;
  }
  const abs = resolveInside(DASHBOARD_DIR, rel);
  if (!abs) {
    notFound(res);
    return;
  }
  await serveFile(res, abs, headOnly);
}

function listen(): void {
  if (!Number.isFinite(PORT) || PORT < 1 || PORT > 65535) {
    console.error("Invalid PORT");
    process.exit(1);
  }
  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error(err);
      if (!res.headersSent) {
        send(res, 500, "Internal error\n", { "Content-Type": "text/plain; charset=utf-8" });
      } else {
        res.end();
      }
    });
  });
  server.on("error", (err) => {
    console.error(err);
    process.exit(1);
  });
  server.listen(PORT, HOST, () => {
    console.log(`ops-rag dashboard http://${HOST}:${PORT}/`);
  });
}

listen();
