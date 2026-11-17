---
needs: [3]
pr: C
---

# Phase 4 — Close-out and prune on the spec branch

**Goal:** In spec-branch mode, close-out checks a lane worker's work against the spec branch (the phase's recorded commit is in `feat/<spec>`, Crew line from the last turn or the `[handoff]` commit), and prune removes lane trees whose work the spec branch already holds.

**Outcome:** The overseer stops raising false "Crew line missing" and "not pushed" alarms, and finished lane trees get cleaned up instead of piling up · small · risk: low; whole-board close-out unchanged.

**Files to touch:**
- `skills/spec/tools/crew/close-out-run.ts`, `crew/close-out.ts` (use `prClaimId`), `crew/crew-line.ts`, `crew/tick-step.ts` (lane `PR group ready`)
- `skills/spec/tools/trees/prune-rules.ts`, `trees/prune.ts`
- tests: `crew-close-out-run.test.ts` (new, `strictRunner`), `crew-close-out.test.ts`, prune tests

## Implementation guidance

technical.md → *Phase 4*. Add an optional layout/branch to `CloseOutWorld`; read the lane and its base from `specLayout` (Phase 2). "Merged back" is "the phase's last task evidence sha is contained in `origin/feat/<spec>`": the record already holds `<sha> on origin/<lane>` for every code tick. Never "HEAD == `origin/<lane>`" (the docs snapshot merge moves the lane past its pushed name) and never a commit subject an agent must remember to type (review 2026-11-17 final-pr-and-mode-ends).
`close-out-run.ts` has no direct test today: write `crew-close-out-run.test.ts` first against the
current behaviour (exact argv: fetch, rev-parse, log `--since`), then add the spec-branch cases.

Prune: a lane tree counts as merged when its `origin/<lane>` is in `origin/feat/<spec>`, its lane has no
open phase, and the tree adds only spec-doc commits beyond it; or when its lane document reads merged
(Phase 5 copies the final PR there). Never by ancestry against main alone (squash merges). Tests are pure
(`sequencedRunner`): the new reads are `merge-base --is-ancestor` and `log`, so no real-git cap change.

## Deliverables

- [ ] `crew-close-out-run.test.ts` pinning today's close-out argv and verdicts
- [ ] Spec-branch close-out: the phase's last task evidence sha (`<sha> on origin/<lane>`, from the record) is in `origin/feat/<spec>`, else `commits not merged back → merge-back <spec> --push`; Crew line from the last turn, else the newest `[handoff] <spec>` commit body on `origin/<lane>` since launch; a lane's `PR group ready` starts no PR moment; tests with `sequencedRunner`
- [ ] Prune treats a lane tree as merged when its `origin/<lane>` is in `origin/feat/<spec>`, its lane has no open phase and the tree adds only spec-doc commits beyond it, or when its lane document reads merged (Phase 5); tests

## Phase-local notes

- `gotcha-git-since-ignores-a-date-it-cannot-parse`: keep `--since` ISO; test dates near now.
