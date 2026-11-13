---
date: 2026-11-13
wave: 0
lens: inherited
from: live-board
slug: timings-and-council
brief: product-brief.md
---

# Recon Wave 0 — timings and council

*Source of record — do not edit. Distilled into the spec by `/spec create`.*
Sent by the live-board phase 10a session (two cross-session messages, 2026-11-13); not re-run here.
Its junit file is copied to this session's scratchpad.

## Verified

**Timings (junit, branch feat/live-board-pr-i, machine loaded)**
- Total 443 s. 74 real-git files 439 s (99%), 224 pure files 3 s, 6 spawn files 2 s.
- Slowest: claim-command 49.6 · card-command 22.1 · join-command 21.5 · join-tidy 20.5 · land-on-main 19.0 ·
  record-plan-changes 13.6 · question-command 12.3 · focus-land 12.3 · codex-entry 11.9 ·
  spec-field-commands 11.2 · publish 10.9 · record-tick 10.8 (s).
- 5 failures, all 5 s bun timeouts in real-git tests under load: join-tidy beforeEach, codex-packaged-entry,
  claim-command ×2, land-on-main "tries five times". An earlier run the same day: 2140 tests, 0 failures, 341 s.
- `--parallel` not measured in that session.

**Checked against the code by that session**
- `PhaseDeps` (`plan/phase-writer.ts:46`) = `{ runner, env, now, memory? }`.
- 11 production files call `gitRecordPort(` inline; `RecordWorld.port?` exists at `plan/record-send.ts:19`.
- 76 test files import `./git-repo` (74 by this session's `rg`); 9 use fakeRecord/fakeRef; 24 combine
  `beforeEach` with `repoWithOrigin`.
- No contract suite: `record-read.test.ts` uses fake and gitRecordPort in separate describes with different assertions.

## Persona council (Linus, SpaceX flight-software, Kent Beck, DX-for-agents; Fable)

**Unanimous**
- Real git only where the code under test itself builds git argv: gitRecordPort, branchPort, worktree/fetch
  plumbing, parsers of git output. Count real-git tests per adapter behaviour, not per feature; a feature
  that adds no new git invocation gets 0 real-git files.
- Enforce with a guard test plus one sentence in `principles.md` §13 pointing at it. No reviewer agent
  (runs after the test, non-deterministic), no time budgets (flake under load). Prose alone failed: §13
  already says "don't integration-test arithmetic".
- Biggest risk is fake drift: build the contract suite BEFORE moving any test. Agents reach for real git
  today because, without one, they are right not to trust the fake.

**Per reviewer**
- Linus: fakeRef lacks stale tracking refs, unfetched blobs, real lease-on-absent-ref semantics, and ref
  lock contention beyond a counter; those are the contract cases. For surviving real-git tests, build
  `repoWithOrigin` once as a template and copy it per test. `card-load-command.test.ts` shouldn't exist as
  written: its "one commit" claim is landOnRef's property, countable in `fakeRef.commits`.
- SpaceX: the guard is a ratchet; the allowlist of files importing `./git-repo` may only shrink. Real-git
  files named `*.git.test.ts`; per-commit gate excludes them, pre-PR runs everything. Seam: add
  `record?: RecordPort` to PhaseDeps; there is no other seam.
- Kent Beck: per-commit TDD loop runs the ~224 in-memory files (3 s); full suite before a PR. `--parallel`:
  take it if it's one line, but expect flakes from temp-dir repos plus `anonymousRunner`'s `process.env`
  mutation. `beforeEach`→`beforeAll` inside a file is fine; fixtures shared across files are not (coupling).
- DX: model the guard on `skill-wiring.test.ts`; it fails when a test imports git-repo without being on
  the checked-in list, or calls `repoWithOrigin` inside `beforeEach`; its message states the rule and
  points at `fake-record.ts`. Dedicated project lesson with `paths: [skills/spec/tools/tests/**]` (today the
  cost note is the last line of the isolated-runner gotcha). Cap `--parallel` workers: several sessions
  share one Mac, which turns the 60 s real-git timeouts into flakes. Bun 1.4.4 has `--changed` and `--timings`.

**Anton's call:** guard test plus this spec; reviewer agent rejected.

## Reuse
- `tests/fake-ref.ts`, `tests/fake-record.ts`; `RecordWorld.port?`; `skill-wiring.test.ts` as guard exemplar.

## Still open
- Whether bun 1.4.4 `--parallel` is safe and how much it buys (being measured in this prep).
- Full classification of the 74 files (wave 1).
- Seam beyond the record port: other git operations commands perform.
