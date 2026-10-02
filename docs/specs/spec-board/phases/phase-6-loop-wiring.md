---
needs: [5, 5b]
pr: B
---

# Phase 6 — Loop wiring

**Goal:**
- Every session that names next sessions ends the same way: handoff, review, create, a "next steps"
  answer. The rows come from the board, and Anton's approval launches them.
- Execute with no spec named looks at the context first, and offers the top ready row only when that
  names nothing (order below).
- `launch execute <spec> <phase>` opens a session in the tree Phase 5b places.

**Outcome:** "What next" arrives at the end of every session, and "start 1 and 2" (or just "yes") is one
step, with each session in its own tree. Anton never types a `/spec execute` line or rebuilds the
picture by hand · small doc and launch changes · low risk.

**Evidence** (CRM sessions, 2026-10-01): both ended on a command for Anton to type. One was a review ("It's
ready for /spec execute page-seo-check, starting at phase 1"). The other was a next-steps answer: 5
tracks across 3 specs, "launch tracks 1 and 2 today, in parallel worktrees".

**Files to touch:**
- `skills/spec/tools/launch/command-line.ts` (phase hint; `cd <tree>` only), `commands/launch.ts`, `tests/launch.test.ts`
- `skills/spec/tools/commands/context.ts` (line ~33: the nothing-named message)
- `skills/spec/SKILL.md` (no-spec rule line ~32; new *Next sessions* rule; *Tools* → Launch)
- `skills/spec/handoff.md` (final block; line 172), `skills/spec/review.md`, `skills/spec/create.md` (final block),
  `skills/spec/execute.md` (§0.2 nothing named), `skills/spec/list.md` (launching rows)
- `README.md`, `ROADMAP.md`

## Implementation guidance

See `technical.md` → *Commands* and *Integration points*.

**Reading the board.** Every flow reads `spec.ts board --json`; none re-derives lanes.
- Execute's no-spec-named path uses `--local`: no fetch, no gh.
- Handoff uses the full board. It runs after Commit and publish, so its fetch doesn't race them.

**Next-sessions ending** (one rule in SKILL.md; handoff, review and create point to it):
- Up to 3 numbered rows from the board's ready lane, then the `Needs you:` items.
- The rows the session itself recommends go first. A review of spec X puts X's first ready phase at 1.
- Approval ("yes", "start 1 and 2", "go") launches those rows. Each runs `trees place`, then `launch`.
  Placement refusals (busy tree, held claim) are reported, not retried.
- Rows that share a tree launch once; the rest stay queued and come back in that session's handoff.
- Handoff keeps `Unblocked:` from `spec.ts graph`. Line 172 ("Do not suggest further work") is amended to
  allow this block.

**Launch.** Validates the phase id with the same rule as chunk hints. Puts the phase in the title so
`claude -n` names stay distinct; they become claim `sessionName`s. Always `cd <tree> && claude …` with
the path from `trees place`. `claude -w` is no longer used.

## Deliverables

- [ ] `launch execute <spec> <phase>`: `cd <placed tree>`; title carries the phase; bad phase id refused
- [ ] SKILL.md *Next sessions* rule; handoff, review and create end with it; approval launches rows through placement; line 172 amended
- [ ] No spec named → context first, then the top ready row: `commands/context.ts` message, SKILL.md no-spec rule, `execute.md` §0.2.
  Order:
  1. A spec this conversation already resumed or executed.
  2. The tree the session is in: a claim held there, or the one spec its branch's changed files belong to (today's `inferred`).
  3. Only then, offer the top ready row.
  Anton (2026-10-01): "unless we already opened the work tree and unless we resumed this spec previously, then yeah, having the default run command is reasonable, but it should definitely look into the context first."
- [ ] `list.md` "start N" uses the same launch path; SKILL.md *Tools* → Launch, README *Session lifecycle and tools*, ROADMAP row
