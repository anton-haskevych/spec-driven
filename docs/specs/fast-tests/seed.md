---
from: live-board (phase 10a session)
from-session: 950546cb-4142-4b8b-8f3a-0de4cd0bcf05
created: 2026-11-13T15:05:10-08:00
---

# fast-tests — Seed

## Why it branched
PR I's pre-PR full suite took 341 s (2140 tests, 304 files; 272–385 s across PRs A–G). Of 304 test files,
76 build real git repos (bare origin, clones, worktrees, real fetch/push) and 9 use the in-memory fakes;
`bun test` runs files serially (no `--parallel` in `bunfig.toml`, bun 1.4.4 has it).

## In the user's words
> "it has been running for 4.5 minutes already. this is way too long." (Anton, 2026-11-13)
> "I understand that creating real Git repos on disk takes a lot of energy and effort, and it is a pain in the ass. Agent harnesses like you tend to write those real Git repo tests. I think we should have some principals or reviewers to run and provide feedback on all of this, because slowing down the whole suite because of that is just not reliable." (Anton, 2026-11-13)

## Decided
- Enforce with a guard test, not a reviewer agent — a persona council (Linus, SpaceX flight-software, Kent
  Beck, DX for agents) was unanimous: a reviewer agent runs after the test is written and is non-deterministic;
  a red test fires while the agent writes it. Per-test time budgets rejected too (flake under load) · Anton chose this
- The rule: a test may touch real git only when the code under test itself runs git (the adapters:
  `record/ref.ts` gitRecordPort, branch/worktree/fetch plumbing, parsers of git output); at most one happy-path
  smoke test per command; everything else on `tests/fake-ref.ts` / `tests/fake-record.ts` · recommended
- Plan shape (recommended, unconfirmed; create decides the order):
  1. Seam: `PhaseDeps` (`plan/phase-writer.ts:46`) carries only `runner, env, now, memory`; 11 production files
     call `gitRecordPort(git)` inline, so a command test cannot pass the fake. Add an optional record port.
     `RecordWorld.port?` (`plan/record-send.ts:19`) already exists one level down.
  2. Contract suite before migrating any test: the same assertions against `fakeRecord()` and
     `gitRecordPort` on a real repo (lease refusal, absent ref, busy, offline). None exists; the council's
     shared warning is fake drift: fast green tests against a git that doesn't exist.
  3. Guard in `tests/guards.test.ts`: allowlist of files importing `./git-repo`, each with a one-line reason
     naming the git behaviour it proves; may only shrink; also fails on `repoWithOrigin` inside `beforeEach`
     (24 files today). The failure message states the rule and points at the fakes.
  4. Two tiers: real-git files named `*.git.test.ts`; the per-commit gate skips them, pre-PR runs all.
  5. A project lesson on `skills/spec/tools/tests/**` so the before-edit hook shows the rule when a test is written.
  6. `--parallel` with a capped worker count (several sessions share one Mac): relief, not the fix.
  7. Existing slow files: one repo per file (`beforeAll`), migrated as each is touched — no bulk rewrite.
- Not a bulk rewrite of the 76 files; the ratchet shrinks them as work touches them · recommended

## What live-board needs
Nothing blocking. `tests/card-load-command.test.ts` (phase 10a) is a named offender: its first test re-proves
JSON parsing through a clone (covered in `card-load.test.ts`); its "one commit" claim can be checked on fakeRef.

## Evidence
- Per-file timings: a junit run was in flight at seed time (`bun test --reporter=junit`); rerun it in prep to
  rank the slowest files and measure `--parallel`
- `skills/spec/principles.md` §13 already says "don't integration-test arithmetic" and was not followed
- `docs/specs/_ledger/gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner.md` (the cost note)
- `tests/record-read.test.ts` — the one file using both the fake and gitRecordPort, in separate describes

## Open questions
- None for the brief.
