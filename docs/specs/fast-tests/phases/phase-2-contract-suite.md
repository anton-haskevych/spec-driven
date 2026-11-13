---
needs: [1]
pr: A
shape: harness-first
---

# Phase 2 — Contract suite

**Goal:** the record and claims fakes pass the same cases as the real git ports, run in both tiers.

**Outcome:** fast tests become trustworthy: a fake that drifts from real git fails a test instead of hiding a bug ·
half a day · low risk: test code only.

**Files to touch:**
- `skills/spec/tools/tests/record-port-contract.ts`, `remote-port-contract.ts` (new, not collected)
- `skills/spec/tools/tests/fake-record.test.ts` (new)
- `skills/spec/tools/tests/fake-ref.ts`, `fake-record.ts`, `fake-remote.ts` (new)
- `skills/spec/tools/tests/record-ref.git.test.ts`, `claims-remote.git.test.ts`, `claims-remote-take.test.ts`, `record-read.test.ts`, `land-on-ref.test.ts`, `page-answer.test.ts`, `page-preview.ts`

## Implementation guidance

Write each contract as a function taking a factory (`technical.md` §3), seeded from the real cases in
`record-ref.git.test.ts:13-94` and `claims-remote.git.test.ts`, and the fake cases in `land-on-ref.test.ts:18-63`
and `claims-remote-take.test.ts`. Run it on real git first, so the cases describe git, not the fake; then on the
fakes, fixing each fake gap it exposes (wave 1 §The fakes: failed fetch, missing blob throws, hex ids, tracking tip).
The real runs build their repos in `beforeAll` and reset refs between cases. Adapter-only cases (ref is not a
branch, `.lock` busy, one hash-object call) stay beside the contract in the `.git` file.

Lift, don't rewrite: the read-port adapter (`record-read.test.ts:20-38`) and `fakeOrigin`
(`claims-remote-take.test.ts:13-39`). Replace the three `landed()` copies with `seedRecord`.

## Deliverables

- [ ] `recordPortContract` passing on `gitRecordPort` (real, `beforeAll`) — `record-ref.git.test.ts` keeps only adapter-only cases beside it
- [ ] `fakeRef`/`fakeRecord` pass the same contract: hex ids, `failed` fetch, missing blob throws; `fake-record.test.ts` runs it in the fast tier
- [ ] `fakeRecordReadPort` + `seedRecord` + `docOf`/`recordPhaseOf`/`commitLog` in `fake-record.ts`; `record-read`, `page-answer`, `page-preview` use them
- [ ] `fake-remote.ts` + `remotePortContract` passing on `gitRemotePort` and `fakeRemote`; `claims-remote-take.test.ts` imports the shared fake

## Phase-local notes

- Non-ASCII bytes through `cat-file --batch` are a contract case (lesson `gotcha-runner-stdout-is-decoded-text`).
- Offline-by-timeout needs the blackhole address (`workaround-test-a-hanging-origin-with-a-blackhole-address`);
  offline-by-missing-path is enough for the contract.
