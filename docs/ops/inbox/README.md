# Inbox jobs

One markdown file per job. Agents read these during **ops-triage** / **ops-job**.

## Filename

`kebab-case-id.md` (e.g. `pain-scan-omnicast.md`)

## Template

```markdown
# job-id

status: proposed | approved | doing | needs_review | done
workspace: omnicast
priority: P0|P1|P2
title: Short English title
outcome: Verifiable done criteria in one sentence.

## Notes

Optional context, links, constraints.
```

## Status flow

`proposed` → `approved` (human) → `doing` → `needs_review` → `done`
