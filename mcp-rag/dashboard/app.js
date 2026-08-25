/**
 * Local ops-rag metrics dashboard.
 * Serve with `npm run dashboard` so / and /logs/* share the same origin.
 */

export const POLL_MS = 8000;
export const LAST_N = 40;
export const USAGE_URL = "/logs/mcp-usage.jsonl";
export const FIXTURE_URL = "/fixtures/sample-usage.jsonl";
export const BENCHMARK_URL = "/benchmark.json";
export const SNAPSHOT_INDEX_URL = "/logs/snapshots/index.json";
export const REAL_LOG_LABEL = "mcp-rag/logs/mcp-usage.jsonl";

const charts = {};
let pollTimer = null;
let usingFixture = false;
/** @type {"unknown" | "ok" | "empty" | "missing" | "error"} */
let realState = "unknown";

const nf = new Intl.NumberFormat("es");
const pct = new Intl.NumberFormat("es", { style: "percent", maximumFractionDigits: 1 });

export function parseJsonl(text) {
  const events = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const row = JSON.parse(trimmed);
      if (row && typeof row === "object") events.push(row);
    } catch {
      // skip malformed lines
    }
  }
  return events;
}

function bucketKey(ms, mode) {
  const d = new Date(ms);
  if (mode === "hour") return `${d.toISOString().slice(0, 13)}:00Z`;
  return d.toISOString().slice(0, 10);
}

export function summarizeUsage(events) {
  const byTool = {};
  const byProject = {};
  const byBucket = {};
  let errors = 0;
  let chars = 0;
  let msSum = 0;
  let msN = 0;

  const times = [];
  for (const e of events) {
    const t = Date.parse(e.ts);
    if (Number.isFinite(t)) times.push(t);
  }
  const spanH =
    times.length > 1 ? (Math.max(...times) - Math.min(...times)) / 3_600_000 : 0;
  const bucketMode = spanH <= 48 ? "hour" : "day";

  for (const e of events) {
    if (e.is_error === true) errors += 1;
    chars += Number(e.chars) || 0;
    const ms = Number(e.ms);
    if (Number.isFinite(ms)) {
      msSum += ms;
      msN += 1;
    }
    const tool = typeof e.tool === "string" && e.tool ? e.tool : "(desconocido)";
    const project =
      typeof e.project_id === "string" && e.project_id ? e.project_id : "(sin proyecto)";
    byTool[tool] = (byTool[tool] || 0) + 1;
    byProject[project] = (byProject[project] || 0) + 1;
    const t = Date.parse(e.ts);
    if (Number.isFinite(t)) {
      const key = bucketKey(t, bucketMode);
      byBucket[key] = (byBucket[key] || 0) + 1;
    }
  }

  const total = events.length;
  return {
    total,
    errors,
    errorRate: total ? errors / total : 0,
    chars,
    avgMs: msN ? msSum / msN : 0,
    byTool,
    byProject,
    byBucket,
    bucketMode,
  };
}

function $(id) {
  return document.getElementById(id);
}

function setHidden(el, hidden) {
  if (el) el.hidden = hidden;
}

async function fetchText(url) {
  const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.text();
}

async function fetchJson(url) {
  const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function upsertChart(key, canvas, config) {
  if (typeof globalThis.Chart !== "function" || !canvas) return;
  if (charts[key]) {
    charts[key].data = config.data;
    charts[key].options = { ...charts[key].options, ...config.options };
    charts[key].update();
    return;
  }
  charts[key] = new globalThis.Chart(canvas, config);
}

function chartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "#cbd5e1" } } },
    scales: {
      x: {
        ticks: { color: "#94a3b8", maxRotation: 45 },
        grid: { color: "#334155" },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#94a3b8" },
        grid: { color: "#334155" },
      },
    },
  };
}

function renderKpis(summary) {
  const root = $("live-kpis");
  if (!root) return;
  const items = [
    ["Llamadas totales", nf.format(summary.total)],
    ["Tasa de error", summary.total ? pct.format(summary.errorRate) : "—"],
    ["Suma de chars", nf.format(summary.chars)],
    ["Promedio ms", summary.total ? nf.format(Math.round(summary.avgMs)) : "—"],
  ];
  root.innerHTML = items
    .map(
      ([label, value]) =>
        `<div class="kpi"><span class="label">${label}</span><span class="value">${value}</span></div>`,
    )
    .join("");
}

function renderLiveCharts(summary) {
  const timeLabels = Object.keys(summary.byBucket).sort();
  const timeTitle = $("chart-time-title");
  if (timeTitle) {
    timeTitle.textContent =
      summary.bucketMode === "hour" ? "Llamadas por hora (UTC)" : "Llamadas por día (UTC)";
  }
  upsertChart("time", $("chart-time"), {
    type: "bar",
    data: {
      labels: timeLabels,
      datasets: [
        {
          label: "Llamadas",
          data: timeLabels.map((k) => summary.byBucket[k]),
          backgroundColor: "#2dd4bfcc",
        },
      ],
    },
    options: chartDefaults(),
  });

  const toolLabels = Object.keys(summary.byTool).sort();
  upsertChart("tool", $("chart-tool"), {
    type: "doughnut",
    data: {
      labels: toolLabels,
      datasets: [
        {
          data: toolLabels.map((k) => summary.byTool[k]),
          backgroundColor: ["#2dd4bf", "#38bdf8", "#fbbf24", "#c084fc"],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#cbd5e1" } } },
    },
  });

  const projectLabels = Object.keys(summary.byProject).sort();
  upsertChart("project", $("chart-project"), {
    type: "bar",
    data: {
      labels: projectLabels,
      datasets: [
        {
          label: "Llamadas",
          data: projectLabels.map((k) => summary.byProject[k]),
          backgroundColor: "#38bdf8cc",
        },
      ],
    },
    options: chartDefaults(),
  });
}

function formatTs(ts) {
  if (typeof ts !== "string") return "—";
  return ts.replace("T", " ").replace(/\.\d+Z$/, "Z");
}

function latestTs(events) {
  let best = "";
  for (const e of events) {
    if (typeof e.ts === "string" && e.ts > best) best = e.ts;
  }
  return best;
}

function eventDetail(e) {
  if (typeof e.query === "string" && e.query) return e.query;
  if (typeof e.target_dir === "string" && e.target_dir) return e.target_dir;
  return "—";
}

function renderTable(events) {
  const tbody = $("live-table");
  if (!tbody) return;
  const rows = [...events]
    .sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
    .slice(0, LAST_N);
  tbody.innerHTML = rows
    .map((e) => {
      const err = e.is_error === true;
      return `<tr>
        <td class="num">${formatTs(e.ts)}</td>
        <td>${escapeHtml(e.tool || "—")}</td>
        <td>${escapeHtml(e.project_id || "—")}</td>
        <td class="query">${escapeHtml(eventDetail(e))}</td>
        <td class="num">${nf.format(Number(e.chars) || 0)}</td>
        <td class="num">${nf.format(Number(e.ms) || 0)}</td>
        <td class="${err ? "err" : "ok"}">${err ? "sí" : "no"}</td>
      </tr>`;
    })
    .join("");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const LIVE_MISSING_HTML = `
  <p>Esto <strong>no es un mock</strong>. El archivo
  <code>${REAL_LOG_LABEL}</code> todavía no existe.</p>
  <p>Se crea cuando el servidor MCP <code>ops-rag</code> recibe una llamada a
  <code>search_knowledge_base</code> o <code>sync_project_docs</code>. Recarga
  ops-rag en Cursor (Customize → MCPs) y usa una de esas tools.</p>
  <p class="muted">El fixture es una demo opcional: pulsa <strong>Ver fixture</strong>
  solo si quieres ver el aspecto de la UI con datos de ejemplo (quedará etiquetado
  <strong>DEMO / FIXTURE</strong>).</p>
`;

const LIVE_EMPTY_FILE_HTML = `
  <p>Esto <strong>no es un mock</strong>. El archivo
  <code>${REAL_LOG_LABEL}</code> existe pero está vacío: aún no hay eventos
  capturados.</p>
  <p>Recarga MCP <code>ops-rag</code> y llama a
  <code>search_knowledge_base</code>. El fixture de demostración es opcional.</p>
`;

function showLiveEmpty(message) {
  const empty = $("live-empty");
  const body = $("live-body");
  if (empty) {
    empty.innerHTML = message || LIVE_MISSING_HTML;
    setHidden(empty, false);
  }
  setHidden(body, true);
}

function showLiveData(events) {
  const summary = summarizeUsage(events);
  renderKpis(summary);
  renderLiveCharts(summary);
  renderTable(events);
  setHidden($("live-empty"), true);
  setHidden($("live-body"), false);
}

function setStatus(text) {
  const status = $("live-status");
  if (status) status.textContent = text;
}

function applyRealMeta(events, state) {
  const pathEl = $("capture-path");
  const lastEl = $("capture-last");
  const countEl = $("capture-count");
  if (pathEl) pathEl.textContent = REAL_LOG_LABEL;
  if (state === "ok" && events && events.length) {
    if (lastEl) lastEl.textContent = formatTs(latestTs(events));
    if (countEl) countEl.textContent = nf.format(events.length);
    return;
  }
  if (state === "empty") {
    if (lastEl) lastEl.textContent = "— (archivo vacío)";
    if (countEl) countEl.textContent = "0";
    return;
  }
  if (state === "missing") {
    if (lastEl) lastEl.textContent = "— (aún no existe)";
    if (countEl) countEl.textContent = "—";
    return;
  }
  if (lastEl) lastEl.textContent = "—";
  if (countEl) countEl.textContent = "—";
}

function updateSourceUi() {
  const badge = $("live-badge");
  const btn = $("toggle-source");
  const live = $("live");
  if (usingFixture) {
    if (badge) {
      badge.textContent = "DEMO / FIXTURE";
      badge.className = "badge badge-demo";
    }
    if (btn) btn.textContent = "Volver a datos reales";
    live?.setAttribute("data-source", "fixture");
    return;
  }
  if (realState === "ok") {
    if (badge) {
      badge.textContent = "DATOS REALES";
      badge.className = "badge badge-real";
    }
    if (btn) btn.textContent = "Ver fixture";
    live?.setAttribute("data-source", "real");
    return;
  }
  if (badge) {
    badge.textContent = "SIN DATOS REALES";
    badge.className = "badge badge-empty";
  }
  if (btn) btn.textContent = "Ver fixture";
  live?.setAttribute("data-source", "empty");
}

async function refreshLive() {
  try {
    const text = await fetchText(USAGE_URL);
    const events = parseJsonl(text);
    if (events.length === 0) {
      realState = "empty";
      applyRealMeta(events, "empty");
      if (!usingFixture) {
        showLiveEmpty(LIVE_EMPTY_FILE_HTML);
        setStatus("Log real vacío · poll 8 s");
      }
      updateSourceUi();
      return;
    }
    realState = "ok";
    applyRealMeta(events, "ok");
    if (!usingFixture) {
      showLiveData(events);
      setStatus(
        `DATOS REALES · ${nf.format(events.length)} líneas · ${new Date().toLocaleTimeString("es")} · poll 8 s`,
      );
    } else {
      setStatus(
        `Viendo fixture · log real: ${nf.format(events.length)} líneas · poll 8 s`,
      );
    }
    updateSourceUi();
  } catch (err) {
    realState = err.status === 404 ? "missing" : "error";
    applyRealMeta(null, realState);
    if (!usingFixture) {
      showLiveEmpty(
        realState === "missing"
          ? LIVE_MISSING_HTML
          : `<p>No se pudo leer el log real (${escapeHtml(err.message)}).</p>${LIVE_MISSING_HTML}`,
      );
      setStatus(
        realState === "missing" ? "Sin log real todavía · poll 8 s" : `Error al leer el log (${err.message})`,
      );
    }
    updateSourceUi();
  }
}

async function loadFixture() {
  try {
    const text = await fetchText(FIXTURE_URL);
    const events = parseJsonl(text);
    usingFixture = true;
    showLiveData(events);
    setStatus(`DEMO / FIXTURE · ${nf.format(events.length)} eventos · no es el log real`);
    updateSourceUi();
  } catch (err) {
    setStatus(`No se pudo cargar el fixture (${err.message})`);
  }
}

function backToReal() {
  usingFixture = false;
  updateSourceUi();
  return refreshLive();
}

function renderBenchmark(data) {
  const caption = $("bench-caption");
  if (caption) {
    caption.textContent =
      data.caption ||
      "EXPECTATIVA de laboratorio (WITH vs WITHOUT). NO es uso en vivo ni tokens del plan de Cursor.";
  }
  const scenarios = Array.isArray(data.scenarios) ? data.scenarios : [];
  const tbody = $("bench-table");
  if (tbody) {
    tbody.innerHTML = scenarios
      .map((s) => {
        const save =
          typeof s.savings_pct === "number" ? `~${s.savings_pct}%` : "—";
        return `<tr>
          <td>${escapeHtml(s.label || s.id)}</td>
          <td class="num">~${nf.format(s.without)}</td>
          <td class="num">~${nf.format(s.with)}</td>
          <td class="num">${escapeHtml(save)}</td>
        </tr>`;
      })
      .join("");
  }
  upsertChart("bench", $("chart-bench"), {
    type: "bar",
    data: {
      labels: scenarios.map((s) => s.label || s.id),
      datasets: [
        {
          label: "Sin RAG (WITHOUT)",
          data: scenarios.map((s) => s.without),
          backgroundColor: "#94a3b8cc",
        },
        {
          label: "Con RAG (WITH)",
          data: scenarios.map((s) => s.with),
          backgroundColor: "#2dd4bfcc",
        },
      ],
    },
    options: chartDefaults(),
  });
}

const SNAP_EMPTY_HTML = `
  <p>Aún no hay snapshots (histórico agregado) en <code>logs/snapshots/</code>.</p>
  <p>Genera uno (agrega el JSONL actual):</p>
  <pre>cd mcp-rag
npm run snapshot-usage</pre>
  <p>Cron opcional (todos los días a las 20:00):</p>
  <pre>0 20 * * * cd /ruta/absoluta/ops-agent/mcp-rag && npm run snapshot-usage</pre>
`;

function safeSnapshotName(name) {
  return typeof name === "string" && /^[A-Za-z0-9._-]+\.json$/.test(name) ? name : null;
}

function indexFiles(index) {
  if (!index) return [];
  if (Array.isArray(index)) return index;
  if (Array.isArray(index.files)) return index.files;
  return [];
}

async function refreshSnapshots() {
  const empty = $("snap-empty");
  const body = $("snap-body");
  try {
    const index = await fetchJson(SNAPSHOT_INDEX_URL);
    const entries = indexFiles(index)
      .map((item) => (typeof item === "string" ? { name: item, ts: "" } : item))
      .map((item) => ({ ...item, name: safeSnapshotName(item.name) }))
      .filter((item) => item.name);

    if (entries.length === 0) {
      if (empty) {
        empty.innerHTML = SNAP_EMPTY_HTML;
        setHidden(empty, false);
      }
      setHidden(body, true);
      return;
    }

    const snapshots = await Promise.all(
      entries.map(async (item) => {
        try {
          const data = await fetchJson(`/logs/snapshots/${item.name}`);
          return { name: item.name, data };
        } catch {
          return { name: item.name, data: null };
        }
      }),
    );

    const rows = snapshots.filter((s) => s.data);
    rows.sort((a, b) => String(a.data.ts || a.name).localeCompare(String(b.data.ts || b.name)));

    const tbody = $("snap-table");
    if (tbody) {
      tbody.innerHTML = [...rows]
        .reverse()
        .map((s) => {
          const d = s.data;
          return `<tr>
            <td>${escapeHtml(formatTs(d.ts) || s.name)}</td>
            <td class="num">${nf.format(d.total_calls || 0)}</td>
            <td class="num">${nf.format(d.searches || 0)}</td>
            <td class="num">${nf.format(d.syncs || 0)}</td>
            <td class="num">${nf.format(d.errors || 0)}</td>
            <td class="num">${nf.format(d.chars || 0)}</td>
          </tr>`;
        })
        .join("");
    }

    upsertChart("snap", $("chart-snap"), {
      type: "line",
      data: {
        labels: rows.map((s) => formatTs(s.data.ts) || s.name),
        datasets: [
          {
            label: "Llamadas totales",
            data: rows.map((s) => s.data.total_calls || 0),
            borderColor: "#2dd4bf",
            backgroundColor: "#2dd4bf33",
            tension: 0.2,
            fill: true,
          },
        ],
      },
      options: chartDefaults(),
    });

    setHidden(empty, true);
    setHidden(body, false);
  } catch {
    if (empty) {
      empty.innerHTML = SNAP_EMPTY_HTML;
      setHidden(empty, false);
    }
    setHidden(body, true);
  }
}

function warnFileProtocol() {
  const banner = $("file-protocol-banner");
  if (banner && globalThis.location?.protocol === "file:") {
    setHidden(banner, false);
  }
}

async function refreshAll() {
  if (usingFixture) {
    await loadFixture();
  }
  await refreshLive();
  await refreshSnapshots();
}

export async function initDashboard() {
  warnFileProtocol();
  $("refresh-now")?.addEventListener("click", () => {
    refreshAll();
  });
  $("toggle-source")?.addEventListener("click", () => {
    if (usingFixture) backToReal();
    else loadFixture();
  });

  try {
    const bench = await fetchJson(BENCHMARK_URL);
    renderBenchmark(bench);
  } catch (err) {
    const caption = $("bench-caption");
    if (caption) {
      caption.textContent = `No se pudo cargar benchmark.json (${err.message}).`;
    }
  }

  await refreshLive();
  await refreshSnapshots();
  pollTimer = setInterval(() => {
    refreshLive();
    refreshSnapshots();
  }, POLL_MS);
  return pollTimer;
}

if (typeof document !== "undefined") {
  initDashboard();
}
