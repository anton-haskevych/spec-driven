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
| Ratchet | `REAL_GIT_CAP` constant equals the list length (checked with `===`); the `beforeEach`/helper exception sets may only shrink too | No cap; `<=` | Growth needs a second, commented edit; `<=` let a forgotten cap leave room to add files back (review 2026-11-13) |
| Command seam | One `GitSeams` bundle (`recordPorts`, `mainline`, `land`, `remote`, `boardBase`) as `seams?` on the deps that actually carry git: `BoardRunners`, `PhaseDeps`, `JoinDeps`, `RecordDeps`, `FieldWriteDeps`, `MergeDeps`; read helpers and land helpers take deps instead of a bare runner; phase 3 starts by tracing every git argv the targets reach | Inject only `gitRecordPort` (seed's plan); a `recordAccess` union with per-type fields (first draft); stub git argv with `stubRunner` | Write-only injection leaves reads on real git; the first draft's fields sat on types the board loader, read helpers and 5 of 6 land callers never receive, so phases 4–7 couldn't leave real git (review 2026-11-13); argv stubs return code 1 and silently take fallbacks |
| Branch vs port | `recordPortsOf(git, deps)` resolves ports only; commands that need the default branch keep their own lookup in their current order | One union that refuses `no-default-branch` before `no-origin` | Session end, record sync, record-export and join-from-tree need origin only; the union would add a `gh` fallback and a new refusal (review 2026-11-13) |
| Deps style | One optional `seams?` field on the existing deps, defaulted at the use site (`seamsOf(deps)`) | A new global "world" object passed from `spec.ts`; a separate field per adapter per type | Matches `RecordDeps.runners`, `deps.spawner ?? detachedSpawner`; production callers don't change; one place lists what is injectable |
| Fake trust | Contract suite first: the same cases against `fakeRecord`/`fakeRemote` and the real ports | Trust the fakes; migrate first | Council's biggest risk is fake drift; the contract is what lets agents trust a fake |
| Fake commit ids | Fakes emit 40-hex ids (sha1 of parent + message + counter) | Keep `c1`/`t1`, loosen `[0-9a-f]{7}` assertions | One contract for both sides; no test-side special cases |
| Fake read port | Lift the inline adapter from `record-read.test.ts` into `fake-record.ts` as one linked pair with the write port (push moves the tracking tip, absent clears it), held by a read-port contract | Build a new one; two independent fakes | It already exists; real `push` moves `RECORD_TRACKING_REF` (`record/ref.ts:29`) and write-notice relies on it |
| Shared seed | Pure `joinedDocs(spec, phases)` used by both `joinedRepo` (real) and `seedRecord` (fake) | Two seed builders | One source, so real and fake seeds can't drift |
| Common dir in tests | `gitStub(...)` in `tests/stub-runner.ts`, built on a throwing `strictRunner`: named answers for the argv the trace lists, unknown argv throws, extras are canned answers never a `Runner` | A production dir source in deps; a separate `git-stub.ts` | The runner already is the seam for `stateDir`/`claimsDir`; runner stubs already live in `stub-runner.ts` |
| Guard parsing | `Bun.Transpiler.scanImports` + `Bun.resolveSync` for the transitive import closure; `@ast-grep/napi` for "repo built outside `beforeAll`" | Regex; string match one level deep; the TS compiler API | A regex missed `codex-packaged-entry`'s nested `beforeEach`; TS 7 has no in-process AST API; project rule: use libraries for parsing. `@ast-grep/napi` is a dev-only exception to `ROADMAP.md`'s "zero dependencies" |
| Fast-tier guarantee | A `git` tripwire in `test:fast` (a shim first on `PATH` that fails and names the argv) | Flag `systemRunner` imports | Production defaults and hard-wired runners (`context/claims-here.ts:16`, `commands/phase/deployed.ts:15`) spawn git without any test import; `scanImports` can't see names and the rule over-flagged `run.test.ts` |
| Surviving repos | `beforeAll`, one repo per file | Template repo copied per test | Copies keep absolute origin and worktree paths (still push to the template); gain is ~5 of 7 setup processes only |
| Real lease race | Keep one command-level race (the "Nov 11" case) in `record-tick.git.test.ts` | Rely on `record-race` + fake racer | It is the only command-level re-plan after a real lease refusal |
| Lesson | New project lesson with `enforced-by: skills/spec/tools/tests/real-git-allowlist.test.ts` | Leave `enforced-by` off so the before-edit hook shows it | Anton, review 2026-11-13: house rule (a guarded lesson is enforced); the guard's red message teaches in the same test-write loop; a visible guarded lesson would later be flagged by `lessons candidates` |
| Per-commit gate | `bun run test:fast` (= `bun test --path-ignore-patterns` for `*.git.test.ts` and fixtures, plus the tripwire), via `gates.md` `## per-commit`, with a line to also run the `.git` files covering changed adapter modules; phases 3–8 also end with a full `bun test` | Agent picks "the tests your change affects"; `bun test --changed` | Deterministic, ~5 s; `--changed` would still pull in real-git files; the real-git tests are the seam refactor's safety net, so they can't wait for the PR |
| `--parallel` | Not in this spec | Measure and adopt with a worker cap | Anton: finish fast; once the slow files are fake, the gain is small |
| PRs | One PR; renames rebased after each neighbour merge, a cap conflict resolved by re-running the guard | One PR per migration group; phases 1–2 first | Anton: one PR, quality and completion time first; review 2026-11-13 found little overlap with live-board, spec-loop-automation and pr-babysit's open phases |

## How it behaves

### Writing a new test that imports `./git-repo` without the suffix

```
$ bun test real-git-allowlist
✗ real-git test allowlist > every file that runs real git is a *.git.test.ts on the list
  claim-renew.test.ts imports ./git-repo.
  Real git is for code that itself runs git (adapters, parsers of git output).
  Test logic on tests/fake-record.ts, tests/fake-remote.ts or gitStub (tests/stub-runner.ts) instead.
  If this file proves git behaviour: rename it claim-renew.git.test.ts and add it to
  REAL_GIT_FILES with one line naming that behaviour.
```

### Adding a file to the list past the cap

```
✗ real-git test allowlist > the list only shrinks
  REAL_GIT_FILES has 31 entries; REAL_GIT_CAP is 30.
  Move the logic to the fakes, or raise REAL_GIT_CAP in this diff and say why in the PR.
```

(and the other way: `REAL_GIT_FILES has 29 entries; lower REAL_GIT_CAP to 29.`)

### Building a repo per test

```
✗ real-git test allowlist > repos are built once per file
  push.git.test.ts:14 calls repoWithOrigin inside beforeEach (git.git.test.ts:37: inside a test body).
  Build it in beforeAll and reset what a test changes, or move the test to the fakes.
```

### A "fast" test that reaches real git through a production default

```
$ bun run test:fast
✗ real-git test allowlist > the fast tier ran no git
  real git in the fast tier: git rev-parse --git-common-dir  (from claims-held.test.ts)
  A seam is missing or a default runner leaked: pass the deps, or rename the file *.git.test.ts.
```

### The two speeds

```
per commit   bun run test:fast    ~230 files, no real git        seconds
pre-PR / CI  bun test             everything, incl. *.git.test.ts  minutes, shrinking with each phase
```

### An agent writing a test

The guard's red message, the first time the new test runs, states the rule and points at the fakes. The project
lesson carries `enforced-by` (house rule), so the before-edit hook doesn't repeat it; `principles.md` §13 holds
the standing prose.

## Edge cases

- Helpers that import `git-repo` (`joined-repo.ts`, `crew-deps.ts`) count: the guard walks the whole import
  closure, so a test using `joinedRepo` is a real-git file. `crew-deps.ts` is a named helper exception until phase 8.
- `run.test.ts` imports `systemRunner` but spawns only `printf`/`sh`/`sleep`: it stays fast. Tests that reach git
  through a production default (`systemRunner`) are caught by the tripwire, not the import scan.
- Type-only imports of `git-repo` (`record-tick.test.ts:3`) don't count.
- `tests/fixtures/**` scripts (race writers) are not test files and may import `git-repo`; their callers, which
  launch them by path, are judged by their own imports.
- Frozen `fixtures/runtime-2.51.0/**` is never edited; `runtime-legacy-readers` stays real.
- Renames break the `gotcha-codex-packaged-entry…` lesson's `paths:` and fixture comments: fixed in the rename
  phase. `gotcha-git-since…`'s `crew-*.test.ts` still matches `crew-x.git.test.ts`.
- Nothing may be written under `skills/` during a run (`codex-entry` hashes it).
