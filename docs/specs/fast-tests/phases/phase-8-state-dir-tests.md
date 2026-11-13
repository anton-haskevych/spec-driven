---
needs: [3a]
pr: A
---

# Phase 8 — Tests that only needed git's common dir

**Goal:** crew-tick, crew-overseer-command, crew-launch, crew-check, pr-log, pr-wait, pr-open and pr-merge
refusals, codex-entry, context-stored-runtime, trees-place-owner, trees-command and trees-prune run on `gitStub`
and fakes.

**Outcome:** the long tail of files that built a repo just to find a folder become in-memory · a day · low risk: git
was incidental in all of them.

**Files to touch:**
- `skills/spec/tools/tests/crew-*.git.test.ts`, `crew-deps.ts`, `pr-log`, `pr-wait`, `pr-open`, `pr-merge`, `codex-entry`, `context-stored-runtime`, `trees-place-owner`, `trees-command`, `trees-prune`
- `skills/spec/tools/tests/real-git-allowlist.test.ts`

## Implementation guidance

`gitStub({ commonDir: tree.root + "/.git", ident, head, branch })` replaces the repo; pr-status-command's full stub
(`pr-status-command.test.ts:68`) is the exemplar, with exact argv so `rev-parse HEAD` never gets the dir.
`crew-deps.ts` drops its `git-repo` import and defaults to `gitStub`. pr-open/pr-merge keep one real smoke each
(branch pushed; merge line lands on main) in `.git` files; their refusal tests need only spec files. codex-entry keeps
one real test of the workspace check; trees-command and trees-prune keep cut/reuse and `--apply` real.

## Deliverables

- [ ] crew-tick, crew-overseer-command, crew-launch, crew-check on `gitStub`; `crew-deps.ts` free of `git-repo`
- [ ] pr-log and pr-wait on `gitStub`; pr-open and pr-merge refusals on stubs, one real smoke each
- [ ] codex-entry and context-stored-runtime on stubs, one real workspace test kept
- [ ] trees-place-owner on fakes; trees-command and trees-prune keep only cut/reuse and `--apply` real
- [ ] Allowlist and `REAL_GIT_CAP` updated; full suite green

## Phase-local notes

- Per commit: `test:fast` plus the `.git` files covering what you touched; full `bun test` before ticking the last item.
- Handoff lists every removed test name and where its git behaviour is still proven (fake test or `<file>.git.test.ts:<test>`).
