# PR Babysit — Progress

> This file is a thin index. Phase details live in `phases/phase-<N>-<slug>.md` (flat)
> or `phases/phase-<N>-<slug>/plan.md` (folder). Forward-propagating learnings live
> in `ledger/`. Ephemeral state lives in `in-flight.md`. Pre-PR checks and PR-readiness
> live in `pr-opening.md`. Never write session logs, handoff blocks, or verification
> steps here.

## Success metrics

- Every finished PR gets exactly one question; on "babysit" Anton hears back once: merged, or what it needs.
- Zero failing checks pasted into sessions by Anton; zero hand-written wait loops in babysit sessions.
- No PR merges on a head whose code commit has no checks; website previews never hold a merge.
- `pr status` and the board give the same verdict for the same PR (both read `statusCheckRollup` on the head); the board never asks Anton to merge a PR being babysat.
- Any babysit can be reconstructed from `pr log` alone.

## Phases

- [x] Phase 1 — One green verdict and the full check table → `phases/phase-1-one-green-verdict.md`
- [x] Phase 2 — Babysit log and `pr log` → `phases/phase-2-babysit-log.md`
- [x] Phase 3 — `pr wait` → `phases/phase-3-pr-wait.md`
- [x] Phase 4 — `pr open` → `phases/phase-4-pr-open.md`
- [ ] Phase 5 — `pr merge` and the merge line → `phases/phase-5-pr-merge.md`
- [ ] Phase 6 — Failure facts, `pr rerun` and the triage gate setting → `phases/phase-6-triage-and-rerun.md`
- [ ] Phase 7 — The question and the babysit procedure → `phases/phase-7-babysit-procedure.md`
- [ ] Phase 8 — CRM adopts PR babysit → `phases/phase-8-crm-adoption.md`
