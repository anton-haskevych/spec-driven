---
needs: [3a]
pr: A
---

# Phase 6 — Record ticks, exports and readers on fakes

**Goal:** record-tick (+ offline), record-export, record-upgrade, record-newer-layout, record-command,
board-joined-golden, trees-place-joined, workflow-capabilities, plan-changed-writes and pr-status-command's joined
test run on fakes, keeping one real command-level lease race.

**Outcome:** the rest of the record tests become in-memory, with the "Nov 11" two-machine regression still on real
git · a day · low-medium risk: ticks push the code branch first, so the tick tests need the push stubbed.

**Files to touch:**
- `skills/spec/tools/tests/record-tick`, `record-tick-offline`, `record-export`, `record-upgrade`, `record-newer-layout`, `record-command`, `board-joined-golden`, `trees-place-joined`, `workflow-capabilities`, `plan-changed-writes`, `pr-status-command`
- `skills/spec/tools/tests/real-git-allowlist.test.ts`

## Implementation guidance

A tick runs `pushBranch`, `rev-parse` and `unsavedCodePaths` (`plan/record-tick.ts:49,56`): give those to
`gitStub` (or the intent runners via `RecordDeps.runners`), not a repo. Keep exactly one real test: the Nov 11
two-machine tick race, in `record-tick.git.test.ts`, repos in `beforeAll`. Fold record-tick-offline into the fake
record-tick file. record-command keeps one real `sync` smoke if `record-ref.git` doesn't already prove the local-copy
refresh (`record/mirror.ts:35` needs `git archive`).

## Deliverables

- [ ] record-tick on fakes + `record-tick.git.test.ts` holding only the Nov 11 race; record-tick-offline folded in
- [ ] record-export, record-upgrade, record-newer-layout on fakes
- [ ] record-command on fakes (one real `sync` smoke at most)
- [ ] board-joined-golden, trees-place-joined, workflow-capabilities, plan-changed-writes, pr-status-command's joined test on fakes
- [ ] Allowlist lines removed, `REAL_GIT_CAP` lowered; full suite green

## Phase-local notes

- Per commit: `test:fast` plus the `.git` files covering what you touched; full `bun test` before ticking the last item.
- Handoff lists every removed test name and where its git behaviour is still proven (fake test or `<file>.git.test.ts:<test>`).
- record-upgrade reaches real GitHub today (`gh pr view` from `copyFromFolder`, phase 3 trace): answer it in `gitStub`'s `answers`.
- trees-place-joined cuts a real worktree when it places (`addTree`: `fetch`, `show-ref`, `worktree add`; phase 3 trace). Move its refusal and board-reading cases to fakes; a case that places keeps real git or moves to `trees-acquire.git`.
