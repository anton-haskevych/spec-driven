---
needs: [3]
pr: C
---

# Phase 4 — Close-out and prune on the spec branch

**Goal:** In spec-branch mode, close-out checks a lane worker's work against the spec branch (merged back, `[handoff]` there, Crew line from the last turn or that commit), and prune removes lane trees whose work the spec branch already holds.

**Outcome:** The overseer stops raising false "Crew line missing" and "not pushed" alarms, and finished lane trees get cleaned up instead of piling up · small · risk: low; whole-board close-out unchanged.

**Files to touch:**
- `skills/spec/tools/crew/close-out-run.ts`, `crew/close-out.ts` (use `prClaimId`), `crew/crew-line.ts`
- `skills/spec/tools/trees/prune-rules.ts`, `trees/prune.ts`
- `skills/spec/handoff.md` §3 (`[handoff] <spec> phase <id>:` subject)
- tests: `crew-close-out-run.test.ts` (new, `strictRunner`), `crew-close-out.test.ts`, prune tests

## Implementation guidance

technical.md → *Phase 4*. Add an optional layout/branch to `CloseOutWorld`; read the lane and its base from `specLayout` (Phase 2). "Pushed" is "contained in `origin/feat/<spec>`", never "HEAD == `origin/<lane>`": the docs snapshot merge moves the lane past its pushed name.
`close-out-run.ts` has no direct test today: write `crew-close-out-run.test.ts` first against the
current behaviour (exact argv: fetch, rev-parse, log `--since`), then add the spec-branch cases.

Prune: a lane tree counts as merged when its tip is an ancestor of `origin/feat/<spec>` and its lane
has no open phase left. Never by ancestry against main alone (squash merges).

## Deliverables

- [ ] `crew-close-out-run.test.ts` pinning today's close-out argv and verdicts
- [ ] Spec-branch close-out: lane HEAD contained in `origin/feat/<spec>`, this lane's `[handoff] <spec> phase <id>` reachable from both `origin/<lane>` and `feat/<spec>`, Crew line from the last turn or the `[handoff]` commit body
- [ ] Prune treats lane trees held by the spec branch with no open phase as merged; tests
- [ ] `handoff.md` §3: `[handoff] <spec> phase <id>: <summary>` subject, and its test

## Phase-local notes

- `gotcha-git-since-ignores-a-date-it-cannot-parse`: keep `--since` ISO; test dates near now.
