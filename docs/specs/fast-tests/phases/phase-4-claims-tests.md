---
needs: [3]
pr: A
---

# Phase 4 — Claims tests on fakes

**Goal:** `claim-command` (49.6 s, the slowest file) and `claims-live` run on `fakeRemote` and `gitStub`.

**Outcome:** the slowest test file goes from ~50 s to under a second · a few hours · low risk: logic already covered
by claims-rules, claims-remote-take, claims-taken-over and board-claims.

**Files to touch:**
- `skills/spec/tools/tests/claim-command.git.test.ts` → `claim-command.test.ts` (+ a slim `claim-command.git.test.ts` if a smoke stays)
- `skills/spec/tools/tests/claims-live.git.test.ts` → `claims-live.test.ts`
- `skills/spec/tools/tests/real-git-allowlist.test.ts`

## Implementation guidance

claim-command does a full board load and fetch on every call (wave 1). With `remote`, `recordPorts` and a `gitStub`
common dir in `claimDeps()`, the 17 tests become in-memory. Keep one real smoke only if a git behaviour isn't proven
elsewhere: claim refs mirrored to origin and the branch pushed on take — check `claims-remote.git.test.ts` and
`push.git.test.ts` first. Read results from `fakeRemote` refs, not `for-each-ref`.

## Deliverables

- [ ] `claim-command` on fakes; the git behaviours it proved are named in their remaining homes (or one smoke kept)
- [ ] `claims-live` on `gitStub`
- [ ] Allowlist lines removed, `REAL_GIT_CAP` lowered, `beforeEach` exceptions shrunk; full suite green
