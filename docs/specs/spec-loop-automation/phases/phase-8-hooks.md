---
needs: [5]
pr: D
---

# Phase 8 — Hooks: Bash write guard and context nudge

**Goal:** Shell commands that would write spec files are stopped before they run and pointed at the `spec.ts` writers, and a once-per-session nudge tells the agent to hand off when context passes the project's threshold.

**Outcome:** Hand-edited spec files through python/sed stop happening instead of being checked afterwards, and Anton no longer has to say "you're running out of context". Cost: bun starts only for Bash calls that mention `docs/specs` (pre-spawn filter) plus the nudge's short read; both fail open.

**Files to touch:**
- `skills/spec/tools/hooks/hook-input.ts` (new — payload read, `writtenPaths`, fail-open `main`, `sessionMemory(prefix)`)
- `skills/spec/tools/hooks/lesson-recall.ts`, `hooks/spec-file-check.ts` (use the shared input)
- `skills/spec/tools/hooks/bash-guard.ts`, `hooks/context-nudge.ts` (new)
- `skills/spec/SKILL.md` (frontmatter hooks, :78, :86), `execute.md` (:105-115 stopping rule, :107)
- `skills/spec/tools/tests/hook.test.ts`, `tests/skill-wiring.test.ts` (:32-34 → 4 hooks), hook payload + transcript builders

## Implementation guidance

Contracts in `technical.md` → *Hooks*. Extract the duplicated input handling first (`lesson-recall.ts:13,18-23,54-65`, `spec-file-check.ts:23,77-82,91-100`) with existing tests green, then add behaviour. `RecallMemory` → `SessionMemory`; no `session_id` → no memory writes (a shared `"unknown"` key would nudge only the first such session ever).

**Bash guard (PreToolUse).** Frontmatter entry with matcher `Bash` and an `if:` pre-spawn filter on commands mentioning `docs/specs` (`~/.claude/hooks/REFERENCE.md` §3), so ordinary Bash calls never start bun. Inside: copy the write-signal regexes from CRM `ops/src/hooks/pre-tool-use/protect-generated.ts:13-22` (in-place `sed`/`perl`, redirects, `tee`, `cp|mv|rm…`, `open(…,'w')`, `writeFile…`), exempt git verbs (`git mv|rm|add|commit|checkout|restore|merge|stash`), and deny with: "Spec files change through `spec.ts phase tick|deployed|add|split`, `lessons add`, or the Write/Edit tools (which the spec-file check validates)." No mtime stamps, no sweep. The `spec.ts` writers themselves don't mention `docs/specs` in their argv and validate in-process.

**Nudge (PostToolUse).** `nudge-at` from `loadSettings` (phase 5). Read only the transcript's last 256 KB; drop the first (possibly partial) line and any `isSidechain` or `<synthetic>` entries; take the last assistant line with `usage`; sum `input_tokens + cache_read_input_tokens + cache_creation_input_tokens`. Unset `nudge-at` → silent. Remember "nudged" via `sessionMemory("spec-driven-nudge-")`.

**Hook lifetime probe.** Wave 2 (Claude Code docs) says skill-frontmatter hooks stay registered for the rest of the session; `~/.claude/hooks/REFERENCE.md:230` says "active only during that component". Before relying on the nudge, probe: invoke `/spec`, finish that turn, then confirm a PostToolUse hook still fires on a later unrelated tool call. Fix whichever doc is wrong.

**Stopping-rule prose.** Reword `execute.md:107` ("you cannot measure your own token usage") → "the context nudge tells you when to stop; you don't measure it yourself". `SKILL.md:78`: auto-compact may be off (it is for Anton), so the nudge — not compaction — is the stop signal; compaction, if it happens, still means hand off.

## Deliverables

- [ ] `hook-input.ts` extracted; both hooks migrated; existing hook tests green
- [ ] `SessionMemory` shared; no-session-id → no writes
- [ ] `bash-guard.ts`: `if:` filter, write signals, git exemptions, deny message; tests for sed/python/redirect denied and `git add`/`cat`/`bun spec.ts` allowed
- [ ] `context-nudge.ts` usage sum from a clean transcript tail; once per session; silent without `nudge-at`
- [ ] Hook-lifetime probe run and the wrong doc corrected
- [ ] SKILL.md frontmatter registers both new hooks; wiring test expects 4
- [ ] execute/SKILL.md stopping-rule prose reworded
