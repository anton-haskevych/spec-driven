---
needs: []
pr: C
---

# Phase 7 — Handed-off sessions free the tree

**Goal:** a worktree is held by work, a live claim or uncommitted changes, not by a terminal tab that
is still open after its session handed off.

**Outcome:** you can keep the tab you've been talking to open, and say "go" for the next phase in the
same tree. No more "close that tab and tell me", and no more two sessions each blaming the other ·
small tool change · low risk: claims already guard the phase, and a dirty tree still refuses.

**Evidence** (CRM transcripts 2026-10-02, teacher-credit-payroll `pr-b`):
- 20:45: the phase 2 session (handed off, claim released) launched phase 3 into its own tree. Launch
  skips the caller's own session, so it went through, and the tree now had two sessions.
- 21:38 → 22:56: the phase 3 session refused to launch phase 4 ("busy, after … execute 2"). The phase 2
  session refused too ("busy, after … execute 3"). Neither held a claim, and the tree was clean. About 80
  minutes were lost; Anton: "I don't really understand what the conflict is… What the fuck is going on?"
- The phase 4 session asked the phase 2 session over `SendMessage` whether it had pending work; it
  answered in 5 s ("No pending work here: the tree is clean"). That is the check the tool should make.
- Phase 3 got the same refusal from `trees place` at startup, took its claim and built anyway, while
  phase 4 obeyed `execute.md` §1 and stopped. The rule produced different behaviour depending on the agent.

**Files to touch:**
- `skills/spec/tools/trees/find.ts` (`busyHolder`): the session branch
- callers: `trees/place.ts`, `trees/prune.ts`, `board/tree-target.ts`
- `skills/spec/execute.md` §1 (busy line), `SKILL.md` *Tools* → Trees, `README.md` if it states the rule
- `docs/specs/spec-board/design.md` row 18, `ledger/decision-trees-placed-by-spec-driven.md`

## Implementation guidance

**The rule today** (`trees/find.ts:40-46`): a live or unknown claim on the tree by another session, *or*
any other live session whose `cwd` is in the tree. The second clause counts an idle, claim-free session
that has already handed off.

**The rule after this phase.** Another session holds the tree when any of these holds:
1. It has a live or unknown claim on the tree (unchanged).
2. It is live in the tree and mid-turn (`status: busy`). It may be about to write, as the phase 2
   session did when it merged main.
3. It is live in the tree and the tree has uncommitted changes. They are probably that session's
   half-done work.

An idle session with no claim in a clean tree no longer holds it.

**Refusal text names the reason**, so neither the agent nor Anton has to guess: `after <spec> <phase>
(<session>)` for a claim, `<session> is mid-task here` for a busy session, `<session> left uncommitted
changes here` for a dirty tree.

**Keep the safety properties.** Unknown liveness still blocks, as it does today. The `cwd` gotcha (a
session that entered a worktree keeps main's path) means claims stay the primary signal; this phase
relaxes only the sessions-in-tree clause.

## Deliverables

- [ ] `ownSessionId(env)` replaces the four hand reads; `Env` moves to `core/env.ts`
- [ ] `treeHolder`: an idle, claim-free session in a clean tree no longer holds it; mid-turn sessions and uncommitted changes still do; the refusal names which. `treeOccupant` keeps prune's presence rule, and unreadable sessions keep a tree
- [ ] Place and launch apply `treeHolder` with one status call on the found tree; prune applies `treeOccupant`
- [ ] Board: knows its caller (`BoardRequest.ownSessionId`), never marks its own tree busy, applies `treeHolder` without the uncommitted check (advisory; place is the gate)
- [ ] `execute.md` §1, SKILL.md *Tools* → Trees, README, design row 18 and the trees decision state the rule as "held by work"

Preflight 2026-10-02 (`research/phase-7/2026-10-02-tree-holder-preflight.md`) split the old "every caller gets
the same answer": prune decides whether a folder may be deleted, so any open tab still keeps it.
