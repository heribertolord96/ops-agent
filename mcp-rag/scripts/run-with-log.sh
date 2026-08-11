#!/usr/bin/env bash
# Wrap MCP stdio process: keep stdout clean for Cursor, tee stderr to a log.
# Usage: ./scripts/run-with-log.sh
# Or point Cursor mcp.json command at this script.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${ROOT}/logs"
LOG_FILE="${LOG_DIR}/mcp.log"
ENTRY="${ROOT}/dist/index.js"

mkdir -p "${LOG_DIR}"

if [[ ! -f "${ENTRY}" ]]; then
  echo "Missing ${ENTRY}. Run: npm run build" >&2
  exit 1
fi

# stdout stays on fd 1 for MCP JSON-RPC; stderr is duplicated to the log.
exec node "${ENTRY}" 2> >(tee -a "${LOG_FILE}" >&2)
