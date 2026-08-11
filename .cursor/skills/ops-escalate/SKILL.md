---
name: ops-escalate
description: >-
  Escalate a single product or risk decision to the human PM/senior. Use when
  triage or a job cannot proceed without a choice, scope is unclear, or policy
  risk appears.
---

# ops-escalate

Ask **one** clear question. Do not bury the user in options essays.

## Format (required)

```markdown
## Needs decision

**Context:** 2–4 sentences (job + workspace + why you stopped)

**Options:**
- A — …
- B — …
- C — … (optional)

**Recommendation:** A|B|C — one sentence why

**Question:** <single question>
```

## Rules

- Exactly one blocking question per escalate.
- Prefer A/B with a recommendation over open-ended prompts.
- After the user answers, continue the prior skill (`ops-triage` / `ops-job`) and use **ops-decision-log** for lasting choices.
- Spanish OK for the question text when chatting with this user.
