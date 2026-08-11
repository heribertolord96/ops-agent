# SkillHub pack (curated)

Generic skills from [SkillHub](https://www.skillhub.club/) that complement ops-agent.
They do **not** replace `ops-triage` / `ops-job` / custom product skills.

Install from the ops-agent repo root:

```bash
./scripts/install-skillhub-pack.sh
```

Uses: `npx @skill-hub/cli install <slug> --agent cursor --project -y`

If a slug fails (rename on SkillHub), the script logs and continues. Update this table when you find the new slug.

| Slug | Role |
|------|------|
| `skill-creator` | Authoring skills |
| `writing-skills` | Better SKILL.md triggers |
| `systematic-debugging` | RCA before patches |
| `file-search` | Focused codebase search |
| `subagent-driven-development` | Plan → subtasks |
| `receiving-code-review` | Rigorous review handling |
| `doc-coauthoring` | Specs / decision docs |
| `mcp-builder` | MCP design (phase 2) |
| `changelog-generator` | Commits → release notes |
| `marketing-strategy-pmm` | Positioning / GTM |
| `startup-competitive-analysis` | Competitor battlecards |

## Still custom (not SkillHub)

`ops-triage`, `ops-job`, `ops-escalate`, `ops-decision-log`, `ops-scope-guard`, and future `pain-scan` / `ph-launch` / `omnicast-*`.
