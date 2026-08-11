---
name: ops-job
description: >-
  Execute an approved ops inbox job against a workspace from workspaces.yaml.
  Use when the user says arre, approve job N, execute job, or run a specific
  inbox item.
---

# ops-job

Run one bounded job. You are an IC; the user is PM/senior.

## Steps

1. Identify the job: inbox path, triage number, or title the user named.
2. Read `workspaces.yaml`. Resolve `workspace` id → absolute `path`. If missing, **ops-escalate**.
3. Read **ops-scope-guard**. Abort if the job violates scope.
4. Update the inbox file (or create it under `docs/ops/inbox/`):
   - `status: doing`
5. Work **inside the workspace `path`** (read/edit that repo). Keep changes scoped to the stated `outcome`.
6. When finished (or blocked):
   - Set `status: needs_review` (or `done` only if the user asked to mark done).
   - Summarize: what changed, how to verify, risks, follow-ups.
7. If a product/risk decision appears mid-flight → **ops-escalate** (do not guess). After the user decides → **ops-decision-log** if material.

## Output to user

```markdown
## Job result: <title>
- **workspace:** id (`path`)
- **status:** needs_review | blocked
- **done:** bullets
- **verify:** bullets
- **Needs review:** what you want the PM to check
```

## Rules

- One job per invocation unless the user lists several explicitly.
- Do not commit unless the user asks.
- Do not modify unrelated workspaces.
