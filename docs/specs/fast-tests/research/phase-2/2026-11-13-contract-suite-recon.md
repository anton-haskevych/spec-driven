# Phase 2 recon — contract suite (2026-11-13)

Inline recon (no explorer waves): the phase entry names every file, and all of them were read whole.
Paths relative to `skills/spec/tools/`.

## Seam

- Ports: `RefPort` `core/land-on-ref.ts:17-21`; `RecordPort` `record/ref.ts:12-16`; `RecordReadPort` `record/read.ts:9-14`;
  `RemotePort` `claims/remote-take.ts:7-13`.
- Real record behaviour: `fetchRecordTip` `record/ref.ts:43-59` (at → tracking ref set; absent → tracking ref deleted;
  timeout → offline; `.lock` → busy; fetch fails while ls-remote finds the ref → `failed`); push moves the tracking ref
  `ref.ts:29`; `readBlobBatch` `ref.ts:102-119` returns `{ ok: false, "record blob <id> is missing" }` (a value, not a throw).
- Real read port `record/read.ts:56-87`: tracking tip by `rev-parse`; fetched stamp is a file mtime under the common dir,
  so it survives a new port.
- Real claims: `claims/remote.ts` `pushClaim`/`deleteClaim` (lease push), `fetchClaims` (`--prune`), `branchOnOrigin`
  (`ls-remote --exit-code --heads`: 0 true, 2 false, else undefined).
- File names moved in phase 1: `record-read.test.ts` is now `record-read.git.test.ts`; its readRecord cases are fake-only
  (adapter at `:20-38`), one real case at `:97-115` (non-ASCII batch read + fetched stamp).

## Reuse

- `fakeRef` (`tests/fake-ref.ts`), `fakeRecord` (`tests/fake-record.ts`), inline `fakeOrigin`
  (`tests/claims-remote-take.test.ts:13-39`, uses `this`), inline read adapter (`record-read.git.test.ts:20-38`).
- `landed()` copies to replace with `seedRecord`: `record-read.git.test.ts:40`, `page-answer.test.ts:23`, `page-preview.ts:17`.
- `blobVersion` (`record/document.ts`) already gives real git blob ids in the fake.

## Testing issues

- A real `failed` fetch needs fetch to fail while ls-remote works: `git config fetch.negotiationAlgorithm bogus` does
  exactly that (probed on git 2.54: fetch 128, ls-remote 0). Missing path → offline, as before.
- One `beforeAll` repo per real file: reset per case = delete the record ref / claim refs on origin, the tracking ref
  in each clone, the `.lock`, the bogus config, the fetched stamp; restore origin URLs. Lets `record-ref.git.test.ts` and
  `claims-remote.git.test.ts` leave `REPO_BUILD_EXCEPTIONS`.
- Fake ids `c1`, `sha1`: no test asserts them (grep), so 40-hex ids are safe.
- `record-read.git.test.ts` keeps no real case once the contract runs `gitRecordReadPort`: it can become the fast
  `record-read.test.ts` (allowlist −1, cap 75 → 74).
