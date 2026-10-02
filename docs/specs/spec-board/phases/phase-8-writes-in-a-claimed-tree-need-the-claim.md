---
needs: [7]
pr: C
---

# Phase 8 — Writes in a claimed tree need the claim

**Goal:** a session that holds no claim can't commit, merge, reset or edit files in a tree another live
session has claimed.

**Outcome:** the tab you keep open as a controller can still read, check and launch, but it can't
trample the phase running next door. If you ask it to "merge main", it tells you which session holds the
tree and offers to ask that session · small hook + skill text · low risk: it blocks only writes, only
while someone else holds the claim.

**Evidence** (CRM transcripts 2026-10-02): at 21:34 Anton asked the handed-off phase 2 session to
"merge main into the branch". It merged and pushed one minute after the phase 3 session handed off in
the same tree. It checked `claim list` first, but only because it happened to think of it. Had phase 3
still been mid-task, the merge would have landed in its working tree.

**Files to touch:**
- `skills/spec/SKILL.md` frontmatter hooks + a new `skills/spec/tools/hooks/` guard (alongside the
  spec-file check and lesson recall)
- `skills/spec/tools/claims/` (who holds this tree)
- `skills/spec/SKILL.md` *Session lifecycle*

## Implementation guidance

Recon decides the details. Starting point: a PreToolUse guard registered by the skill (so it exists only
in `/spec` sessions) that matches Edit/Write in the tree and Bash commands that write git state, and
refuses when another live session holds a claim on this tree and this session holds none. The refusal
names the holder and suggests `SendMessage` to it.

## Deliverables

- [ ] Guard: writes in a tree claimed by another live session are refused with the holder's name
- [ ] Reads, `spec.ts` tool calls and launching stay allowed; unknown liveness fails open for reads, closed for writes
- [ ] SKILL.md *Session lifecycle* says a session that handed off may stay open as a controller
