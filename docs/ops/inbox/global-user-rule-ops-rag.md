# global-user-rule-ops-rag

status: needs_review
workspace: ops-agent
priority: P1
title: Global Cursor User Rule preferring MCP ops-rag search
outcome: Concise global guidance exists for all project chats; user can paste into Customize → Rules if file-backed rules are not auto-loaded; README notes the setup.

## Notes

User said **arre** with explicit goal to add global User Rules for ops-rag.

Done on disk:
- `~/.cursor/rules/prefer-ops-rag.mdc` (alwaysApply)
- `~/.cursor/rules/prefer-ops-rag.PASTE-INTO-USER-RULES.txt` (append-only paste text)
- README one-liner under Cursor setup

User Rules UI lives in Cursor settings (not reliably file-editable on this remote host). Verify paste if agent in other projects ignores the rule.
