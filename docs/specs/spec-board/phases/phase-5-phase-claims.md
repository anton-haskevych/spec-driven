---
needs: [4]
pr: B
---

# Phase 5 — Phase claims

**Goal:** `spec.ts claim take|release|list` keeps one claim file per phase in the repo's shared git folder; execute claims the phase it picks and skips phases claimed by an open session; handoff releases; the board shows who holds each claim and flags claims left by closed sessions.

**Outcome:** Two parallel sessions never start the same phase, and an abandoned phase shows up instead of looking taken · no network · risk: a claim from a crashed session needs one "take over" line.

**Files to touch:**
- `skills/spec/tools/claims/store.ts`, `claims/rules.ts` (new)
- `skills/spec/tools/commands/claim.ts` (new), `spec.ts` command table
- `skills/spec/tools/board/inputs.ts`, `lanes.ts`, `render.ts`
- tests: new `claims-store.test.ts`, `claims-rules.test.ts`, `claim-command.test.ts`; `board-lanes.test.ts`, `commands-table.test.ts`
- `skills/spec/execute.md` §1, `skills/spec/handoff.md`, `skills/spec/SKILL.md` (*Tools*, *Next-chunk rule*)

## Implementation guidance

`technical.md` → *claims*. Exclusive create (`flag: "wx"`) is the race guard; tests run two `takeClaim`
calls on one temp dir and expect one winner. `claimStatus` is pure over (claim, live sessions,
workspaces, base phase state). `claim` reads `CLAUDE_CODE_SESSION_ID` from an injected `env`
(`launchReport` precedent) and the worktree from `git rev-parse --show-toplevel`. The claim step goes in
`execute.md` §1, not §0: resume enters at §1 (project ledger). `claim` is a `spec.ts` command only, not a
`/spec` sub-command, so `skill-wiring.test.ts` needs nothing new.

## Deliverables

- [ ] `claimsDir` (absolute common dir) + `takeClaim` / `releaseClaim` / `loadClaims` with exclusive create; two-taker race test
- [ ] `claimStatus`: live, closed, done, gone; take-over of closed/gone claims reports the old holder
- [ ] `claim` command: take (idempotent for the same session; refusal names holder and worktree; no session id → not claimed, exit 0), release, list
- [ ] Board: claimed phases in flight with holder; `done`/`gone` claims deleted on the run; `closed` claims under needs you
- [ ] `execute.md` §1 claim step + refusal path; `handoff.md` release; SKILL.md *Tools* Claims bullet; *Next-chunk rule* notes claimed phases are skipped

## Phase-local notes

- Subagents share the parent's session id: claims are per top-level session.
- Prep claims `<spec>#prep`; the board treats it like a phase claim on a spec with no phases.
