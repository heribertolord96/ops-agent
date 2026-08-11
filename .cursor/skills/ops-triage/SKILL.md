---
name: ops-triage
description: >-
  Triage weekly product/ops jobs from workspaces.yaml and docs/ops/inbox.
  Use when the user asks what to work on, weekly scan, ops triage, or
  "qué trabajamos".
---

# ops-triage

Propose the next work for the human PM/senior. Do not invent a roadmap beyond evidence in the inbox and workspaces.

## Steps

1. Read `workspaces.yaml` at the ops-agent repo root. Note each `id`, `path`, `role`, `tags`.
2. List files in `docs/ops/inbox/`. Read jobs with `status: proposed` or `approved` (skip `done` unless asked).
3. Optionally skim each workspace's root `README.md` (if present) for one-line product truth — do not deep-dive code unless triage needs it.
4. Output **exactly 3 ranked jobs** using this format:

```markdown
## Triage (YYYY-MM-DD)

### 1. [P0|P1|P2] Title
- **workspace:** `<id>`
- **why:** one sentence
- **outcome:** verifiable done criteria
- **inbox:** path or `new`

### 2. …
### 3. …
```

5. If the inbox is empty, derive candidates from README gaps / obvious P0 UX or release hygiene — still exactly 3, mark `inbox: new`.
6. If you cannot choose without a product decision, stop and follow **ops-escalate** (one question only). Do not execute jobs in this skill.

## Rules

- Prefer jobs that close a user-visible loop over speculative features.
- Respect **ops-scope-guard** (no store publish, no engagement bots, no force-push).
- Spanish OK for chat with the user; keep job file fields in English when writing inbox files.
