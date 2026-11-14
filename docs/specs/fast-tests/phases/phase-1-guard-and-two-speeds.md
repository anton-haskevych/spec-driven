---
needs: []
pr: A
shape: guardrail-alone
---

# Phase 1 — Guard and two speeds

**Goal:** every real-git test file is named `*.git.test.ts` and on a checked-in list that may only shrink, and a
per-commit gate runs the rest in seconds with a tripwire proving no real git ran.

**Outcome:** the quick check an agent runs after each commit drops from minutes to seconds and provably runs no real git, and a new test that reaches for real git without a reason fails the moment it first runs · half a day to a day · low risk: renames and a test-only guard, no test logic changes

**Files to touch:**
- `skills/spec/tools/tests/real-git-allowlist.test.ts`, `tests/real-git/allowlist.ts`, `scan.ts`, `tripwire/git` (new)
- `skills/spec/tools/tests/*.test.ts` → `*.git.test.ts` (the 74 files in `research/…-wave-1-…` §Classification, plus any the tripwire catches; `run.test.ts` stays fast)
- `package.json`, `bun.lock` (`@ast-grep/napi`, `test:fast`)
- `docs/specs/_playbook/gates.md` (new), `docs/specs/_playbook/settings.md`
- `docs/specs/_ledger/principle-tests-use-real-git-only-for-code-that-runs-git.md` (new), `gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner.md`, `gotcha-codex-packaged-entry-test-runs-near-its-timeout.md` (paths)
- `skills/spec/principles.md` §13
- `skills/spec/tools/tests/fixtures/*.ts` (comments naming renamed files)

## Implementation guidance

Write the guard first (red against today's tree), then rename with `git mv` so history follows. Reasons: a
KEEP-REAL file names the git behaviour it proves (wave 1 table); a file due to move says
`moves to fakes in phase <N>` — the reason itself is the migration backlog, and each later phase deletes its line and
lowers `REAL_GIT_CAP`. The repo-build check (technical.md §1 check 4) starts with an explicit, named exception set
for every current offender (`beforeEach`, test bodies, collection time), emptied by phases 4–9; the helper-import
check starts with `crew-deps.ts`. Both sets may only shrink.

The tripwire comes before the renames: run `test:fast` with it and every file it catches is a real-git file too
(rename it) or leaks a default runner (note it for phase 3's trace). Verify first that a `git` shim on `PATH` is
what `Bun.spawn` resolves when a runner passes its own `env`; if not, use a `--preload` wrapper.

One PR (Anton's call): rebase the renames after each live-board / spec-loop-automation / pr-babysit merge; a cap
conflict is resolved by re-running the guard and naming the new file's reason.

Guard rules and messages: `technical.md` §1–2, `design.md` → *How it behaves*. Check whether `--path-ignore-patterns`
repeats on bun 1.4.4 before writing `test:fast`; if not, one brace glob.

The lesson carries `enforced-by` (Anton, review 2026-11-13: house rule); write it after the guard exists, since the
doctor checks that path. Its first paragraph still states the rule, the fakes, the suffix and the guard.

## Deliverables

- [x] Guard in `tests/real-git/` (data `allowlist.ts`, scan `scan.ts`, thin `real-git-allowlist.test.ts`): every test bun collects under `skills/` whose transitive import closure (`Bun.resolveSync`) reaches `git-repo`/`joined-repo` — red on today's tree, naming the files
- [x] Rename all real-git files to `*.git.test.ts` with `REAL_GIT_FILES` reasons and `REAL_GIT_CAP` (checked with `===`); helper-import check with its shrinking exception set (`crew-deps.ts` until phase 8; fixtures allowed); guard green; fix the codex-packaged-entry lesson `paths:` and fixture comments that named old files
- [x] Repo-build check with `@ast-grep/napi`: a builder (`repoWithOrigin`, `joinedRepo`, `.clone(`, `.addWorktree(`, or a same-file helper calling one) only inside `beforeAll`; inside `test`/`it`/`beforeEach` fails; shrinking exception set; Linux binary present in `bun.lock`
- [x] `test:fast` script with a `git` tripwire (a shim first on `PATH` that fails and names the argv) + `gates.md` (`per-commit`, `pre-pr`) + `settings.md` `gates.per-commit`; files the tripwire catches become `.git` files or get fixed; this spec's `pr-opening.md` first check becomes `gate: pre-pr`; `spec.ts doctor fast-tests` clean
- [x] Project lesson `principle-tests-use-real-git-only-for-code-that-runs-git.md` via `lessons add`, with `enforced-by: skills/spec/tools/tests/real-git-allowlist.test.ts`; isolated-runner gotcha's cost note becomes a pointer; `principles.md` §13 sentence

## Phase-local notes

- Type-only imports (`record-tick.test.ts:3`) don't count; `scanImports` already drops them. It returns paths only, never
  imported names.
- `codex-entry` hashes `skills/`: the guard must not write anything there.
- CI keeps plain `bun test`, which still runs `*.git.test.ts`.
