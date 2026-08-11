# Freelance channels (Upwork / Workana)

- **date:** 2026-07-23
- **workspace:** ops-meta
- **status:** accepted

## Context

ops-agent may scan freelance marketplaces (Upwork, Workana, and similar) for work that fits listed workspaces. Placing a bid ("place bet") typically requires a paid subscription and/or connects. The human must create the account; person vs agency is an open setup choice — **recommend a person account for MVP** (agency deferred).

## Decision

- Freelance marketplace scanning is **in scope as a future skill** (`freelance-scan`).
- **Auto-bid / auto-apply is forbidden.**
- Every proposed bet must include: platform, connect/bid cost estimate, workspace match, and confidence.
- Without an active paid plan → **watchlist only**; no `place-bet`.
- Every place-bet proposal requires explicit human approval in that turn.

## Alternatives considered

- **Agency account** — deferred until after person-account MVP proves useful.
- **Auto-apply / mass proposals** — rejected (ToS risk, spend risk, quality risk).

## Consequences

- Update `ops-scope-guard` with freelance auto-bid / place-bet rules.
- Phase-2 skills: `freelance-scan` and `place-bet` (watchlist free/limited; bids only after human OK + paid plan).
