---
needs: [1, 2]
same-files-as: [5]
pr: A
---

# Phase 6 — Failure facts, `pr rerun` and the triage gate setting

**Goal:** For every failed check, `pr status` states whether it's infrastructure and whether it fails on main too; `pr rerun` re-runs infrastructure failures only, within GitHub's attempt cap; projects name their triage steps with `gates.ci-triage`.

**Outcome:** The babysitter knows which kind of failure it's looking at before touching code, never re-runs a real test failure, and runs the project's own triage steps · medium · risk: misclassifying a real failure as infra — the signature list is small and explicit, and timeouts don't count.

**Files to touch:**
- `skills/spec/tools/pr/failures/triage.ts`, `pr/actions/rerun.ts` (new)
- `skills/spec/tools/pr/checks/types.ts`, `pr/gh.ts` (`RUN_FIELDS`), `pr/actions/gh-writes.ts` (reruns), `pr/render.ts`, `pr/report.ts`
- `skills/spec/tools/playbook/settings.ts`, `doctor/settings.ts`, `commands/context.ts` (Settings line)
- `skills/spec/tools/commands/pr.ts`, `commands/pr/rerun.ts`
- tests: `pr-triage.test.ts`, `pr-rerun.test.ts`, `settings.test.ts`, `doctor-*.test.ts`, `context.test.ts`

## Implementation guidance

`infra` is a pure function over the job and its run (technical.md → Failure facts): conclusion `startup_failure`; `cancelled` only when no sibling job in the run failed and the tail lacks `exceeded the maximum execution time`; or a built-in log signature (constant list in `triage.ts`). The failure line in `pr status` gains `fails on main too · infra` (design.md red example) and the triage gate name. `failsOnMain` already exists (`main-compare.ts`); no `fixedOnMain` — "already fixed on main" is a step in the project's triage gate.

`pr rerun` re-runs only infra rows and `cancelled` verdict rows, one `gh run rerun <run> --job <job>` each. It refuses while the run is still in progress (`pr rerun: run <id> still running — wait`) and when the run's `attempt` is already 3. A test failure gets `pr rerun: <check> failed in a test, not infra — fix it` (Anton, 2026-10-10: strict, `ledger/decision-flaky-tests-strict.md`). It logs `rerun`; the log is not read for the cap.

`gates.ci-triage` is one more row in `SECTION_KEYS.gates` (`playbook/settings.ts:29`), one `gateName` line, and one entry in the doctor's `named` map (`doctor/settings.ts:20-23`), so the existing missing-section error covers it; the pack's `Settings:` line adds `CI triage: gate <name>`.

## Deliverables

- [ ] `pr/failures/job-logs.ts`: every failed or cancelled job's full log saved once to `<git-common-dir>/spec-board/babysit/pr-<n>/job-<jobId>.log` (re-read from disk, never re-downloaded); `pr status` prints the path so the agent reads and greps the file instead of querying GitHub again (Anton, 2026-10-10)
- [x] `pr/failures/triage.ts`: infra classification (startup_failure, cancelled without failed sibling or timeout text, signatures) — table tests incl. the cancelled-by-timeout log and a fail-fast sibling
- [ ] `pr status` failure lines show `fails on main too` and `infra`, and the triage gate name
- [ ] `pr/actions/rerun.ts` + `gh-writes.ts` reruns: infra-only, refuse in-progress runs, cap at `attempt` 3, logged — tests incl. refusal of a test failure, of a running run and of the third attempt
- [ ] `gates.ci-triage` setting: parse, describe, doctor check, pack line

## Phase-local notes

- The run read needs `status`, `conclusion`, `attempt` and `jobs`: one `gh run view <run> --json status,conclusion,attempt,jobs` (`GhClient.run`) serves triage (siblings, startup_failure) and rerun (in progress, attempt cap). `RUN_FIELDS` (main's run list) is unchanged.
- Infra signatures are matched over the whole saved log, not the 30-line tail.
- After a squash merge, ancestry checks lie (`docs/specs/_ledger/gotcha-squash-merged-branch-is-not-an-ancestor.md`); the triage gate's "already on main" step should compare history, not ancestry of the fix.
