---
needs: [3a]
pr: A
---

# Phase 4 — Claims and board tests on fakes

**Goal:** `claim-command` (49.6 s, the slowest file), `claims-live` and `board-command` run on `fakeRemote`, the
mainline seam and `gitStub`.

**Outcome:** the slowest test file goes from ~50 s to under a second · a few hours · low risk: logic already covered
by claims-rules, claims-remote-take, claims-taken-over and board-claims.

**Files to touch:**
- `skills/spec/tools/tests/claim-command.git.test.ts` → `claim-command.test.ts` (+ a slim `claim-command.git.test.ts` if a smoke stays)
- `skills/spec/tools/tests/claims-live.git.test.ts` → `claims-live.test.ts`
- `skills/spec/tools/tests/board-command.git.test.ts` → `board-command.test.ts` (+ a slim `.git` smoke if needed)
- `skills/spec/tools/tests/real-git-allowlist.test.ts`

## Implementation guidance

claim-command does a full board load and fetch on every call (wave 1). With `seams` (`mainline`, `remote`,
`recordPorts`) and `gitStub` answering what phase 3's trace listed for claim, the 17 tests become in-memory. Keep one real smoke only if a git behaviour isn't proven
elsewhere: claim refs mirrored to origin and the branch pushed on take — check `claims-remote.git.test.ts` and
`push.git.test.ts` first. Read results from `fakeRemote` refs, not `for-each-ref`.

## Deliverables

- [ ] `claim-command` on fakes; the git behaviours it proved are named in their remaining homes (or one smoke kept)
- [ ] `claims-live` on `gitStub`; `board-command` on fakes (one real smoke at most), through the same board-load seam
- [ ] Allowlist lines removed, `REAL_GIT_CAP` lowered, `beforeEach` exceptions shrunk; full suite green

## Phase-local notes

- Per commit: `test:fast` plus the `.git` files covering what you touched; full `bun test` before ticking the last item.
- Handoff lists every removed test name and where its git behaviour is still proven (fake test or `<file>.git.test.ts:<test>`).
