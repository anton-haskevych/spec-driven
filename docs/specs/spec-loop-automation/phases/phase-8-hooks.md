---
needs: [5]
pr: D
---

# Phase 8 — Hooks: Bash write guard

**Goal:** Shell commands that would write spec files are stopped before they run and pointed at the `spec.ts` writers.

**Outcome:** Hand-edited spec files through python/sed stop happening instead of slipping past the spec-file check. Cost: bun starts only for Bash calls that mention `docs/specs` (pre-spawn filter); the hook fails open.

**Files to touch:**
- `skills/spec/tools/hooks/hook-input.ts` (new — payload read, `writtenPaths`, fail-open `main`)
- `skills/spec/tools/hooks/lesson-recall.ts`, `hooks/spec-file-check.ts` (use the shared input)
- `skills/spec/tools/hooks/bash-guard.ts` (new)
- `skills/spec/SKILL.md` (frontmatter hooks, :86 hook coverage)
- `skills/spec/tools/tests/hook.test.ts`, `tests/skill-wiring.test.ts` (:32-34 → 3 hooks), hook payload builder

## Implementation guidance

Contracts in `technical.md` → *Hooks*. Extract the duplicated input handling first (`lesson-recall.ts:13,18-23,54-65`, `spec-file-check.ts:23,77-82,91-100`) with existing tests green, then add the guard. `RecallMemory` stays in `lesson-recall.ts` — it has one user.

**Bash guard (PreToolUse).** Frontmatter entry with matcher `Bash` and an `if:` pre-spawn filter on commands mentioning `docs/specs` (`~/.claude/hooks/REFERENCE.md` §3), so ordinary Bash calls never start bun. Inside: copy the write-signal regexes from CRM `ops/src/hooks/pre-tool-use/protect-generated.ts:13-22` (in-place `sed`/`perl`, redirects, `tee`, `cp|mv|rm…`, `open(…,'w')`, `writeFile…`), exempt git verbs (`git mv|rm|add|commit|checkout|restore|merge|stash`), and deny with: "Spec files change through `spec.ts phase tick|deployed|add|split`, `lessons add`, or the Write/Edit tools (which the spec-file check validates)." No mtime stamps, no sweep. The `spec.ts` writers themselves don't mention `docs/specs` in their argv and validate in-process.

**Hook lifetime probe.** Wave 2 (Claude Code docs) says skill-frontmatter hooks stay registered for the rest of the session; `~/.claude/hooks/REFERENCE.md:230` says "active only during that component". The guard is only useful if it outlives the `/spec` turn, so probe: invoke `/spec`, finish that turn, then confirm a PreToolUse hook still fires on a later unrelated tool call. Fix whichever doc is wrong.

## Deliverables

- [ ] `hook-input.ts` extracted; both hooks migrated; existing hook tests green
- [ ] `bash-guard.ts`: `if:` filter, write signals, git exemptions, deny message; tests for sed/python/redirect denied and `git add`/`cat`/`bun spec.ts` allowed
- [ ] Hook-lifetime probe run and the wrong doc corrected
- [ ] SKILL.md frontmatter registers the guard; wiring test expects 3
