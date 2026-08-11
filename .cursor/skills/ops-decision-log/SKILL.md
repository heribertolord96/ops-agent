---
name: ops-decision-log
description: >-
  Write a durable decision record under docs/ops/decisions. Use after the user
  resolves an ops-escalate question or makes an explicit product/process choice
  worth keeping.
---

# ops-decision-log

## Steps

1. Confirm the decision in the user's words (do not soften).
2. Create `docs/ops/decisions/YYYY-MM-DD-slug.md` (slug: short kebab-case English).
3. Use this template:

```markdown
# <Title>

- **date:** YYYY-MM-DD
- **workspace:** <id or n/a>
- **status:** accepted

## Context

## Decision

## Alternatives considered

## Consequences
```

4. Tell the user the file path. Do not rewrite history of older decision files.

## Rules

- One decision per file.
- If the user says it was a one-off with no need to log, skip writing.
