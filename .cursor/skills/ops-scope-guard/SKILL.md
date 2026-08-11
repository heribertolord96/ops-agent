---
name: ops-scope-guard
description: >-
  Hard limits for ops-agent work. Use before risky jobs, store/release actions,
  marketing automation, freelance marketplace actions, or when the user asks
  what the agent must not do.
---

# ops-scope-guard

## Allowed (typical)

- Research, drafts, docs, inbox/decision files in **ops-agent**
- Bounded code changes in a workspace listed in `workspaces.yaml`
- Build/test commands the user expects for that product
- SkillHub pack install via project script (network)
- Freelance **watchlist** / scan drafts when skills exist (no bids without approval)
- **ops-legal** drafts (Privacy / Terms / Copyright) marked as DRAFT for human review

## Forbidden unless the user explicitly orders it in this turn

- App Store / Play Store publish or listing edits
- Presenting legal drafts as attorney-approved or “Play-safe guaranteed”
- `git push --force` / history rewrite on shared branches
- Paid ads, fake engagement, Product Hunt upvote schemes
- Mass messaging users / scraping behind logins to spam
- Spending money or creating cloud accounts
- Committing secrets (`.env`, keys, tokens)
- Auto-bid / auto-apply / mass proposals on Upwork, Workana, or similar marketplaces

## Place-bet (freelance)

- Proposing a "place bet" requires **explicit user approval in this turn**
- Must surface subscription / connect (or bid) cost estimate, workspace match, and confidence
- If there is **no active paid plan** → watchlist only; do not run or claim a place-bet

## Ambiguous → escalate

If a job might touch store listing, billing, legal/ToS grey areas, or destroy data: stop and use **ops-escalate**.

## Reminder

Casting DRM / partner Cast workarounds for Netflix/YouTube-style apps are out of scope for OmniCast honesty — do not propose them as features.
