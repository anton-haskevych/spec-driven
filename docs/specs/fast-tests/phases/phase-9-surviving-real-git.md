---
needs: [4, 5, 6, 7, 8]
pr: A
---

# Phase 9 — Real-git files build once per file

**Goal:** every remaining `*.git.test.ts` builds its repos in `beforeAll` (or per describe), and the guard's
`beforeEach` exception set is empty.

**Outcome:** the tests that must stay on real git cost a fraction of today's time, and the full suite's runtime is
measured before and after · half a day · low risk: same assertions, shared setup.

**Files to touch:**
- `skills/spec/tools/tests/` KEEP-REAL and SHARE-REPO files from wave 1: board-local-work, pilot-workspace, pr-log (if still real), record-mirror, commit-onto, push, publish, trees-acquire, trees-setup, tree-work, git, gitattributes, mainline-base-cache, runtime-legacy-readers, session-facts, page-process, codex-packaged-entry
- `skills/spec/tools/tests/real-git-allowlist.test.ts`

## Implementation guidance

One repo per file; a test that mutates origin resets what it changed (`afterEach`), or gets its own describe with
its own `beforeAll`. Where tests assert exact origin text or change git config, split by describe rather than
share. record-mirror's three `readRecordCopy` tests need plain folders, not a repo. page-process builds its repo at
collection time: move it into `beforeAll`. Never share a repo across files. Frozen `fixtures/runtime-2.51.0/**` is
not edited; its test file's setup may move.

Last deliverable: one junit run of the full suite, recorded in `pr-opening.md` against the 443 s baseline.

## Deliverables

- [ ] push, publish, trees-acquire, trees-setup, tree-work, commit-onto on one repo per file
- [ ] git, gitattributes, mainline-base-cache, session-facts, board-local-work, pilot-workspace, record-mirror on one repo per file (record-mirror's copy tests on plain folders)
- [ ] page-process repo into `beforeAll`; codex-packaged-entry and runtime-legacy-readers setup shared; `beforeEach` exception set empty
- [ ] Full-suite timing (junit) recorded in `pr-opening.md` against 443 s, with the slowest 10 files
- [ ] `restore()` reset helper in `git-repo.ts` (refs on both sides, worktrees, `.git/spec-board`, `reset --hard` + `clean`), called in `afterEach` by every shared-repo file; explicit `beforeAll` timeouts
