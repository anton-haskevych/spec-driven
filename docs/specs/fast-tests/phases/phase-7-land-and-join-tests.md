---
needs: [3a]
pr: A
---

# Phase 7 — Land-on-main and join tests on fakes

**Goal:** join, join-tidy, focus-land, owner, deployed-land, ship and publish-commands run on fakes; land-on-main
keeps only what its adapter proves.

**Outcome:** another ~90 s of command tests become in-memory · a day · low-medium risk: join reads settings from
origin's default branch, which `boardBase` now supplies.

**Files to touch:**
- `skills/spec/tools/tests/join-command`, `join-tidy`, `focus-land`, `owner-command`, `deployed-land`, `ship-command`, `publish-commands`, `land-on-main`
- `skills/spec/tools/tests/real-git-allowlist.test.ts`

## Implementation guidance

The fake `land` records each landing's files and message; `boardBase` supplies the settings a join reads from
origin. join-tidy stops running a whole real join per test: seed the joined record directly. Keep in `.git` files
only what nothing else proves: `join --from-tree`'s head sha, the files a worktree or remote branch changed
(join-tidy), and the two-process join race (subprocess; one test, `beforeAll`). land-on-main drops its
retry/re-plan tests (duplicated in `land-on-ref.test.ts`) and keeps push flags, untouched checkout and the
unreachable origin, on one repo per file.

## Deliverables

- [ ] join-command on fakes; `--from-tree` sha and the CLI race stay in `join-command.git.test.ts` (`beforeAll`)
- [ ] join-tidy on fakes; changed-files detection stays real in one small `.git` file
- [ ] focus-land, owner-command, deployed-land, ship-command on the fake `land`
- [ ] publish-commands: one real publish-docs smoke, refusals on fakes/stubs
- [ ] land-on-main trimmed to adapter cases, `beforeAll`; allowlist and `REAL_GIT_CAP` updated; full suite green

## Phase-local notes

- Per commit: `test:fast` plus the `.git` files covering what you touched; full `bun test` before ticking the last item.
- Handoff lists every removed test name and where its git behaviour is still proven (fake test or `<file>.git.test.ts:<test>`).
