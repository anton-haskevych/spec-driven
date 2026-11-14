# Phase 2 preflight — contract suite (2026-11-13)

Test code only; the recon read every file whole, so this pass is short. Paths relative to `skills/spec/tools/`.

## Findings that change the plan

1. **The phase names `record-read.test.ts`; phase 1 renamed it `record-read.git.test.ts`** (allowlist line
   `tests/real-git/allowlist.ts:55`). Its only real case (`:97-115`) is what `recordReadPortContract` proves on
   `gitRecordReadPort`, so once the contract runs in `record-ref.git.test.ts` the file is pure fake: rename it back to
   `record-read.test.ts`, drop its allowlist and `REPO_BUILD_EXCEPTIONS` lines, `REAL_GIT_CAP` 75 → 74.
2. **"Missing blob throws" is false of the real port**: `readBlobBatch` returns `{ ok: false, reason: "record blob <id>
   is missing" }` (`record/ref.ts:112`). The contract asserts that value; the fake returns the same, never throws.
3. **The tracking tip moves on `fetchTip` too, not only on push**: both port and read port call `fetchRecordTip`
   (`record/ref.ts:25`, `record/read.ts:68`), which sets the tracking ref on `at` and deletes it on `absent`
   (`ref.ts:47,54`). Keep tracking state in `fakeRef` itself (fetch and push move it), so every read port built on the
   same fake is linked by construction; the fetched stamp lives on `fakeRecord`.
4. **A real `failed` fetch is reachable**: `fetch.negotiationAlgorithm=bogus` fails fetch, ls-remote still answers
   (`ref.ts:57-58`). So `failed` is a contract case on both sides, not a fake-only switch.

## Clean Code / SOLID / Clean Architecture / DDD against the contract suite

| Rule | Verdict | Concrete consequence |
|---|---|---|
| One concept per test | Bites | Each contract case asserts one port behaviour; adapter-only cases (no origin, one `hash-object`, not a branch) stay in `record-ref.git.test.ts` |
| F.I.R.S.T — independent | Bites | Real harness resets origin refs, tracking refs, `.lock`, bogus config and the stamp before each case; one `beforeAll` repo |
| Closure over `this` | Fix here | `fakeOrigin` uses `this.offline` (`claims-remote-take.test.ts:20`); `fakeRemote` reads its own const object, like `fakeRef` |
| LSP | Bites | The point of the phase: the fakes must be substitutable for the real ports in every contract case |
| DIP | Inert | Ports already exist; no production code changes |
| DDD | Skipped | Test harness, no domain model |
| Dependency Rule | Inert | Contract files import ports and `bun:test` only, never `git-repo` (guard check 5) |

## Guard blindness

`real-git/scan.ts` judges a repo builder by call site; the real `make()` only resets refs (no `repoWithOrigin`/`.clone`),
so `beforeEach(make)` is allowed, and contracts never import `git-repo`, so they stay outside the real-git closure. Not blind.

## Seam and testability (deltas from recon)

- Sizes fine: `fake-ref.ts` 66, `fake-record.ts` 35, both stay under 150.
- `readBlob` (single) reasons differ (`can't read record blob …` vs `no blob …`): the contract asserts `ok: false` only.

## Amendments

1. Contract `make()` returns a harness: `{ port, landElsewhere(changes), goOffline(), holdLock(), breakFetch() }`
   (+ `deleteOnOrigin()`, `newRead()` for the read contract; `{ port, elsewhere, goOffline(), branch }` for remote).
2. `record-read.git.test.ts` → `record-read.test.ts` on `fakeRecordReadPort`; allowlist −1.
3. `record-ref.git.test.ts` and `claims-remote.git.test.ts` leave `REPO_BUILD_EXCEPTIONS` (one `beforeAll` repo each).

## Defaults applied

- Fake `failNextFetch()` returns `failed` only while the record exists, as real git does (absent stays absent).
- `fakeRef` counts `fetches`, replacing the counting adapter in the readRecord tests.
- `commitLog` = messages from the tip back, newest first.

## Forks for you

None.
