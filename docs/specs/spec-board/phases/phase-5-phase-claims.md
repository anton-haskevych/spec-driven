---
needs: [4]
pr: B
---

# Phase 5 — Phase claims

**Goal:** Each phase being worked on gets one claim file in the repo's shared git folder, managed by
`spec.ts claim take|release|list`. Takeover is atomic, and claims fail safe when liveness is unknown.
The context pack skips phases claimed by a live session. Execute claims first thing in §1, and handoff
releases. The board shows who holds each claim and flags claims left by closed sessions.

**Outcome:** Two parallel sessions never start the same phase. A half-done phase can't be picked up from
another worktree, and an abandoned phase shows up instead of looking taken · no network · risk: a
claim from a crashed session needs one "take over" line.

**Files to touch:**
- `skills/spec/tools/claims/store.ts`, `claims/rules.ts` (new)
- `skills/spec/tools/commands/claim.ts` (new), `spec.ts` command table
- `skills/spec/tools/context/packs.ts`, `commands/context.ts` (skip live-claimed phases)
- `skills/spec/tools/board/inputs.ts`, `lanes.ts`, `joins.ts`, `render.ts`; `workspaces/classify.ts` (`forceLive` from claims)
- tests: new `claims-store.test.ts`, `claims-rules.test.ts`, `claim-command.test.ts`; `context.test.ts`, `board-lanes.test.ts`, `commands-table.test.ts`
- `skills/spec/execute.md` §1, `skills/spec/handoff.md`, `skills/spec/SKILL.md` (*Tools*, *Next-chunk rule*)

## Implementation guidance

See `technical.md` → *claims*.

**Store.** Every write is one atomic filesystem op:
- Create: temp file, then `link`.
- Take over: `rename` to `.stale-<sessionId>`, then `link`.
- `takeClaim` takes `isStale` as a function. The command builds it from `claimStatus`, so the store has
  no session logic.

The board only reads claims. Cleanup happens in `take` and `release`, never for a live claim.

**Command.** `claim` reads `CLAUDE_CODE_SESSION_ID` from an injected `env` (the `launchReport`
precedent), and the worktree from `git rev-parse --show-toplevel`, realpath-normalized.

**Packs.** The pack's pick skips live-claimed phases and names them in `Picked:`. `claim take` is still
the race guard.

**Placement in execute.md.** The step goes first in §1, above the task-phase branch, because resume
enters at §1 (project ledger).
- On a refusal with no phase named: re-run `spec.ts context execute <spec>`, then reload Stage B.
- On a refusal with a phase named: stop and show the holder.

**No new wiring.** `claim` is a `spec.ts` command only, not a `/spec` sub-command, so
`skill-wiring.test.ts` needs nothing new.

**Tests.** All claim tests run in a temp repo, so `--git-common-dir` never resolves to the plugin's own
`.git`.

## Deliverables

- [x] `claimsDir` (absolute common dir) + `takeClaim` / `releaseClaim` / `loadClaims`: temp+link create, two-takers race on a fresh phase, two-takers race on a stale claim (one winner each), unparseable claim counts as live
- [x] `claimStatus`: unknown, live, done, gone, closed in that precedence; take-over of closed/gone/done reports the old holder; `unknown` and `live` are never taken over automatically (the explicit `--take-over` hatch lands in 5a)
- [x] `take` refusals: phase id not in the spec; phase wip/ticked in another workspace; held by a live session (names holder and worktree). Idempotent for the same session. No session id → refuses a held phase, else not claimed, exit 0
- [x] Packs: execute pick and resume suggestion skip live-claimed phases and say so; the resume overlap line appends `(in flight: <session>)` for a live-claimed spec
- [x] Board: claimed phases in flight with holder; `closed` claims under needs you; claim workspaces force a live scan; the board never deletes
- [x] `execute.md` §1 first-line claim step + both refusal paths; `handoff.md` release after Commit; SKILL.md *Tools* Claims bullet; *Next-chunk rule* notes claimed phases are skipped

## Phase-local notes

- Subagents share the parent's session id, so claims are per top-level session.
- There are no prep claims: prep has no "done" phase to release against.
- Releasing at handoff is safe between sessions because `take` refuses a phase that another workspace
  holds as wip or ticked.
