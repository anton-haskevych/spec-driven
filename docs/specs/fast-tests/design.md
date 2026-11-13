# Fast Tests — Design

## Problem

The plugin's full suite takes 341–443 s. 74 of 304 test files build real git repos and take 439 s of a 443 s run;
the other 230 files take 5 s (`research/2026-11-13-wave-0-timings-and-council.md`). Most of those 74 files prove
logic that a pure sibling test already covers, through a bare origin, clones and worktrees. Agents write tests this
way because command code builds its git adapters inline, so a command test has no other way in, and because
`principles.md` §13 says "don't integration-test arithmetic" in prose nothing checks. Under load, the real-git
tests also hit bun's 5 s timeout (5 failures in the timed run).

## The rule

A test may run real git only when the code under test itself builds git argv: the adapters (`gitRecordPort`,
the claims remote port, land-on-main's branch push, fetch/archive/worktree plumbing, parsers of git output).
Such a file is named `*.git.test.ts`, is on the checked-in allowlist with one line naming the git behaviour it
proves, and builds its repos once per file. Every other test runs on the in-memory fakes, which a contract suite
holds to the same cases as real git.

## Decisions

| Decision | What we chose | Rejected alternative | Why |
|---|---|---|---|
| Enforcement | A guard test that fails while the test is being written | Reviewer agent; per-test time budgets | Persona council unanimous, Anton's call: a reviewer runs after the fact and is non-deterministic; time budgets flake under load |
| Real-git marker | File suffix `*.git.test.ts` + allowlist with a reason per file | Allowlist alone; a tag inside the file | The suffix is what the fast gate filters on, so the tier and the list can't disagree; `bun test` still runs all of it (suffix still matches `*.test.ts`) |
| Ratchet | `REAL_GIT_CAP` constant in the guard equals the list length; the guard fails if the list grows past it | No cap | Raising the cap is a visible one-line diff in review; each migration phase lowers it |
| Command seam | One `recordAccess` factory supplies the record write port AND read port; other git around commands (board base, land-on-main, claims remote) become optional deps fields with today's code as the default | Inject only `gitRecordPort` (seed's plan); stub git argv with `stubRunner` | Write-only injection leaves reads, tracking ref and write-notice on real git (split brain, wave 1 §Risks); argv stubs return code 1 on unknown argv and silently take fallbacks |
| Deps style | Optional fields on the existing `<Thing>Deps`, defaulted at the use site (`deps.x ?? system`) | A new global "world" object passed from `spec.ts` | Matches `RecordDeps.runners`, `deps.spawner ?? detachedSpawner`; production callers don't change |
| Fake trust | Contract suite first: the same cases against `fakeRecord`/`fakeRemote` and the real ports | Trust the fakes; migrate first | Council's biggest risk is fake drift; the contract is what lets agents trust a fake |
| Fake commit ids | Fakes emit 40-hex ids (sha1 of parent + message + counter) | Keep `c1`/`t1`, loosen `[0-9a-f]{7}` assertions | One contract for both sides; no test-side special cases |
| Fake read port | Lift the inline adapter from `record-read.test.ts` into `fake-record.ts`; its fetch moves the tracking tip | Build a new one | It already exists and covers `trackingTip`/`lastFetched`/`markFetched` |
| Shared seed | Pure `joinedDocs(spec, phases)` used by both `joinedRepo` (real) and `seedRecord` (fake) | Two seed builders | One source, so real and fake seeds can't drift |
| Common dir in tests | `gitStub({ commonDir, ident?, head?, branch? })` answering exact argv, failing loudly on anything else | A production dir source in deps | The runner already is the seam for `stateDir`/`claimsDir`; a second path is split brain |
| Guard parsing | `Bun.Transpiler.scanImports` for imports (drops type-only imports); `@ast-grep/napi` for "repo built inside `beforeEach`" | Regex | A regex missed `codex-packaged-entry`'s nested `beforeEach`; project rule: use libraries for parsing |
| Surviving repos | `beforeAll`, one repo per file | Template repo copied per test | Copies keep absolute origin and worktree paths (still push to the template); gain is ~5 of 7 setup processes only |
| Real lease race | Keep one command-level race (the "Nov 11" case) in `record-tick.git.test.ts` | Rely on `record-race` + fake racer | It is the only command-level re-plan after a real lease refusal |
| Lesson | New project lesson, no `enforced-by`, `seen-in: [live-board, fast-tests]` | Set `enforced-by` to the guard | Recall never shows a lesson with `enforced-by` (`lessons/recall.ts:14`); two `seen-in` sorts it ahead of the 8 one-spec test lessons |
| Per-commit gate | `bun run test:fast` (= `bun test --path-ignore-patterns` for `*.git.test.ts` and fixtures), via `gates.md` `## per-commit` | Agent picks "the tests your change affects" | Deterministic, ~5 s, no judgement call |
| `--parallel` | Not in this spec | Measure and adopt with a worker cap | Anton: finish fast; once the slow files are fake, the gain is small |
| PRs | One PR | One PR per migration group | Anton: one PR, quality and completion time first |

## How it behaves

### Writing a new test that imports `./git-repo` without the suffix

```
$ bun test real-git-allowlist
✗ real-git test allowlist > every file that runs real git is a *.git.test.ts on the list
  claim-renew.test.ts imports ./git-repo.
  Real git is for code that itself runs git (adapters, parsers of git output).
  Test logic on tests/fake-record.ts, tests/fake-remote.ts or tests/git-stub.ts instead.
  If this file proves git behaviour: rename it claim-renew.git.test.ts and add it to
  REAL_GIT_FILES with one line naming that behaviour.
```

### Adding a file to the list past the cap

```
✗ real-git test allowlist > the list only shrinks
  REAL_GIT_FILES has 31 entries; REAL_GIT_CAP is 30.
  Move the logic to the fakes, or raise REAL_GIT_CAP in this diff and say why in the PR.
```

### Building a repo per test

```
✗ real-git test allowlist > repos are built once per file
  push.git.test.ts:14 calls repoWithOrigin inside beforeEach.
  Build it in beforeAll and reset what a test changes, or move the test to the fakes.
```

### The two speeds

```
per commit   bun run test:fast    ~230 files, no real git        seconds
pre-PR / CI  bun test             everything, incl. *.git.test.ts  minutes, shrinking with each phase
```

### An agent about to edit a test

The before-edit hook shows the lesson's first paragraph: real git only for code that runs git, fakes otherwise,
and the guard that enforces the file suffix.

## Edge cases

- Helpers that import `git-repo` (`joined-repo.ts`, `crew-deps.ts`) count: the guard follows test-helper imports
  one level, so a test using `joinedRepo` is a real-git file. `crew-deps.ts` loses its `git-repo` import in phase 8.
- `run.test.ts` and `infer-spec.test.ts` spawn git through `systemRunner` without `./git-repo`: the guard also flags
  `systemRunner`/`isolatedRunner` imports.
- Type-only imports of `git-repo` (`record-tick.test.ts:3`) don't count.
- `tests/fixtures/**` scripts (race writers) are not test files; their callers are.
- Frozen `fixtures/runtime-2.51.0/**` is never edited; `runtime-legacy-readers` stays real.
- Renames break lesson `paths:` (`gotcha-codex-packaged-entry…`, `gotcha-git-since…`) and fixture comments: fixed
  in the rename phase.
- Nothing may be written under `skills/` during a run (`codex-entry` hashes it).
