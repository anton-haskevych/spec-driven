---
needs: [1, 2]
same-files-as: [5]
pr: A
---

# Phase 6 — Failure facts, `pr rerun` and the triage gate setting

**Goal:** For every failed check, `pr status` states whether it's infrastructure, fails on main too, or is already fixed on main; `pr rerun` re-runs infrastructure failures only, at most twice per commit; projects name their triage steps with `pr.triage`.

**Outcome:** The babysitter knows which kind of failure it's looking at before touching code, never re-runs a real test failure, and runs the project's own triage steps · medium · risk: misclassifying a real failure as infra — the signature list is small and explicit.

**Files to touch:**
- `skills/spec/tools/pr/triage.ts`, `pr/main-fixed.ts`, `pr/rerun.ts` (new)
- `skills/spec/tools/pr/main-compare.ts` (shared history walk), `pr/types.ts`, `pr/gh.ts` (`RUN_FIELDS`), `pr/gh-writes.ts` (reruns), `pr/render.ts`, `pr/report.ts`
- `skills/spec/tools/playbook/settings.ts`, `doctor/settings.ts`, `commands/context.ts` (Settings line)
- tests: `pr-triage.test.ts`, `pr-main-fixed.test.ts`, `pr-rerun.test.ts`, `settings.test.ts`, `context.test.ts`

## Implementation guidance

Facts are pure functions over fetched data (technical.md → Failure facts). Extract a `mainJobHistory` walk from `main-compare.ts` that returns the list instead of the first match; `compareOnMain` and the new `fixedOnMain` both read it. `fixedOnMain` also needs the branch's behind count. Infra signatures are a constant list in `triage.ts`; job conclusions `cancelled`/`startup_failure` count too. The failure line in `pr status` gains `fails on main too · fixed on main · infra` (design.md red example).

`pr rerun` re-runs only infra rows and cancelled rows with no newer run, one `gh run rerun <run> --job <job>` each; it counts reruns per code-head SHA from the babysit log and the run's `attempt`, and refuses the third. A test failure gets `pr rerun: <check> failed in a test, not infra — fix it` (Anton, 2026-10-10: strict, `ledger/decision-flaky-tests-strict.md`).

`pr.triage` is one `SECTION_KEYS` row: a `gates.md` section name; the doctor errors when the section is missing (as for `gates.per-commit`); the pack's `Settings:` line adds `CI triage: gate <name>`.

## Deliverables

- [ ] `pr/triage.ts`: infra classification (conclusions + log signatures) — table tests
- [ ] `mainJobHistory` extracted; `pr/main-fixed.ts` `fixedOnMain` (failed after merge-base, passed later, branch behind) — tests; `compareOnMain` unchanged in behaviour
- [ ] `pr status` failure lines show the three facts and the triage gate name; `--json` carries them
- [ ] `pr/rerun.ts` + `gh-writes.ts` reruns: infra-only, ≤2 per code-head SHA, logged — tests incl. refusal of a test failure and of the third rerun
- [ ] `pr.triage` setting: parse, describe, doctor check, pack line

## Phase-local notes

- `RUN_FIELDS` needs `headSha` and `attempt` (`pr/types.ts:26-30`).
- After a squash merge, ancestry checks lie (`docs/specs/_ledger/gotcha-squash-merged-branch-is-not-an-ancestor.md`); `fixedOnMain` compares run history, not ancestry of the fix.
