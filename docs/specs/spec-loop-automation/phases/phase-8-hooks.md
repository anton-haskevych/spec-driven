---
needs: []
pr: D
---

# Phase 8 — Hooks: Bash writes and context nudge

**Goal:** The spec-file check also validates spec files changed through Bash, and a once-per-session nudge tells the agent to hand off when context passes the project's threshold.

**Outcome:** Hand-edited spec files get the same safety check as Edit writes, and Anton no longer has to say "you're running out of context". Cost: one short-lived bun process per matched tool call; fails open.

**Files to touch:**
- `skills/spec/tools/hooks/hook-input.ts` (new — payload read, `writtenPaths`, `mentionsSpecDocs`, fail-open `main`, `sessionMemory(prefix)`)
- `skills/spec/tools/hooks/lesson-recall.ts`, `hooks/spec-file-check.ts` (use the shared input)
- `skills/spec/tools/hooks/context-nudge.ts` (new)
- `skills/spec/SKILL.md` (frontmatter hooks, :78, :86), `execute.md` (:105-115 stopping rule, :107)
- `skills/spec/tools/tests/hook.test.ts`, `tests/skill-wiring.test.ts` (:32-34 → 3 hooks), hook payload + transcript builders

## Implementation guidance

Contracts in `technical.md` → *Hooks*. Extract the duplicated input handling first (`lesson-recall.ts:13,18-23,54-65`, `spec-file-check.ts:23,77-82,91-100`) with existing tests green, then add behaviour.

Bash sweep: only when `tool_input.command` mentions `docs/specs` or `_ledger`/`_backlog`/`_playbook`; glob spec markdown with mtime newer than the session stamp (first run: 120 s), run `issuesForWrittenFile` on each, block on errors like today, update the stamp. Lesson recall stays Write/Edit only.

Nudge: `nudge-at` comes from settings (phase 5). Until phase 5 lands, the hook reads the key straight from `_playbook/settings.md` frontmatter via `core/frontmatter.ts` — switch to `loadSettings` when available. Read only the transcript's last 256 KB; take the last assistant line with `usage`; sum `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`. Unset `nudge-at` → silent. Remember "nudged" per session via `sessionMemory("spec-driven-nudge-")`.

Reword `execute.md:107` ("you cannot measure your own token usage") → "the context nudge tells you when to stop; you don't measure it yourself"; `SKILL.md:78` keeps compaction as the hard stop.

## Deliverables

- [ ] `hook-input.ts` extracted; both hooks migrated; existing hook tests green
- [ ] `sessionMemory(prefix)` shared
- [ ] Bash sweep in spec-file check (mention filter, mtime stamp, blocking on errors)
- [ ] `context-nudge.ts` usage sum from transcript tail; once per session; silent without `nudge-at`
- [ ] SKILL.md frontmatter registers the nudge; wiring test expects 3 hooks
- [ ] execute/SKILL.md stopping-rule prose reworded
