---
needs: []
pr: A
shape: guardrail-alone
---

# Phase 1 — Guard and two speeds

**Goal:** every real-git test file is named `*.git.test.ts` and on a checked-in list that may only shrink, and a
per-commit gate runs the rest in seconds.

**Outcome:** the quick check an agent runs after each commit drops from minutes to seconds, and a new test that
reaches for real git without a reason fails the moment it is written · half a day · low risk: renames only, no
test logic changes.

**Files to touch:**
- `skills/spec/tools/tests/real-git-allowlist.test.ts` (new)
- `skills/spec/tools/tests/*.test.ts` → `*.git.test.ts` (the 74 files in `research/…-wave-1-…` §Classification, plus `run.test.ts` if it qualifies)
- `package.json`, `bun.lock` (`@ast-grep/napi`, `test:fast`)
- `docs/specs/_playbook/gates.md` (new), `docs/specs/_playbook/settings.md`
- `docs/specs/_ledger/principle-tests-use-real-git-only-for-code-that-runs-git.md` (new), `gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner.md`, `gotcha-codex-packaged-entry-test-runs-near-its-timeout.md`, `gotcha-git-since*.md` (paths)
- `skills/spec/principles.md` §13
- `skills/spec/tools/tests/fixtures/*.ts` (comments naming renamed files)

## Implementation guidance

Write the guard first (red against today's tree), then rename with `git mv` so history follows. Reasons: a
KEEP-REAL file names the git behaviour it proves (wave 1 table); a file due to move says
`moves to fakes in phase <N>` — the reason itself is the migration backlog, and each later phase deletes its line and
lowers `REAL_GIT_CAP`. The `beforeEach` check (technical.md §1 check 4) starts with an explicit, named exception set
for the 24 current offenders, emptied by phases 4–9; the exception set may only shrink too.

Guard rules and messages: `technical.md` §1, `design.md` → *How it behaves*. Check whether `--path-ignore-patterns`
repeats on bun 1.4.4 before writing `test:fast`; if not, one brace glob.

The lesson's first paragraph is what recall shows (400 chars): the rule, which fakes, the suffix, the guard. No
`enforced-by` (recall would hide it).

## Deliverables

- [ ] `real-git-allowlist.test.ts`: import scan (`Bun.Transpiler.scanImports`, helpers followed one level) — red on today's tree, naming the files
- [ ] Rename all real-git files to `*.git.test.ts` with `REAL_GIT_FILES` reasons and `REAL_GIT_CAP`; guard green; fix lesson `paths:` and fixture comments that named old files
- [ ] `beforeEach` repo-build check with `@ast-grep/napi` (catches `codex-packaged-entry`'s nested case) and its shrinking exception set
- [ ] `test:fast` script + `gates.md` (`per-commit`, `pre-pr`) + `settings.md` `gates.per-commit`; this spec's `pr-opening.md` first check becomes `gate: pre-pr`; `spec.ts doctor fast-tests` clean
- [ ] Project lesson `principle-tests-use-real-git-only-for-code-that-runs-git.md` via `lessons add`; isolated-runner gotcha's cost note becomes a pointer; `principles.md` §13 sentence

## Phase-local notes

- Type-only imports (`record-tick.test.ts:3`) don't count; `scanImports` already drops them.
- `codex-entry` hashes `skills/`: the guard must not write anything there.
- CI keeps plain `bun test`, which still runs `*.git.test.ts`.
