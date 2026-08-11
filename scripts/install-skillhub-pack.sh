#!/usr/bin/env bash
# Install curated SkillHub skills into this Cursor project (.cursor/skills via CLI).
# Run from ops-agent root. Requires network. Continues on individual slug failures.
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SLUGS=(
  skill-creator
  writing-skills
  systematic-debugging
  file-search
  subagent-driven-development
  receiving-code-review
  doc-coauthoring
  mcp-builder
  changelog-generator
  marketing-strategy-pmm
  startup-competitive-analysis
)

ok=0
fail=0

for slug in "${SLUGS[@]}"; do
  echo "==> install $slug"
  if npx --yes @skill-hub/cli install "$slug" --agent cursor --project -y; then
    ok=$((ok + 1))
  else
    echo "WARN: failed to install $slug (check slug on skillhub.club)" >&2
    fail=$((fail + 1))
  fi
done

echo "Done. ok=$ok fail=$fail"
exit 0
