---
needs: []
pr: A
shape: harness-first
---

# Phase 1 — The shared record

**Goal:** a store that any session on any machine can read and write: a write is a plan re-run against the
newest record, batches are all-or-nothing, the local copy is searchable and never half-written, and an outbox
keeps what could not be sent.

**Outcome:** nothing changes for anyone yet; this is the ground the other phases stand on, and it tells us how
much the repo grows before anything depends on it · medium · low risk: nothing reads it.

**Files to touch:**
- `skills/spec/tools/core/land-on-ref.ts`, `core/remote-push.ts` (new); `claims/remote.ts` (imports the moved
  push and network options; no behaviour change)
- `skills/spec/tools/record/` (new): `layout.ts`, `ref.ts`, `view.ts`, `plan-writes.ts`, `write.ts`,
  `mirror.ts`, `outbox.ts`
- `skills/spec/tools/publish/commit-onto.ts` (optional base, for the first commit)
- `skills/spec/tools/commands/record.ts` (new), `spec.ts`, `runtime/workflow-capabilities.ts`
- `skills/spec/tools/tests/fake-record.ts` (new), `tests/fixtures/record-writer.ts` (new)
- `skills/spec/SKILL.md` (*Tools*)

## Implementation guidance

**Reuse before building** (`ledger/principle-record-reuses-the-house-loop-and-cache.md`). The loop already
exists in `core/land-on-main.ts:23-48`: pin the tip, run a plan against it, commit with a scratch index, push,
retry when the ref moved. Lift it into `core/land-on-ref.ts` taking a ref, a lease and a plan function; give it
the timeout and no-prompt options that `landOnMain` lacks. `landOnMain` itself is not touched in this phase
(phase 6 makes it a caller). Move `push` and `NETWORK` out of `claims/remote.ts:15-19,56-59` into
`core/remote-push.ts` and import them back; the claims tests must pass unchanged.

`writeRecord(port, plan)` takes a **plan function** (`technical.md` → *Writing*,
`ledger/decision-writes-are-plans-rerun-per-tip.md`). Start with `planWrites`: it is pure and takes its
validator as a parameter, so `record/` imports no document reader. The Academy board's
`ops/src/academy-board/doc-writes.ts` in the CRM repo is the model for its cases (conflict returns the current
document, create over an existing path, duplicate paths, a field removed by a patch); rewrite it without zod.
Note what its `mergePatch` does to arrays (replaces them whole): that is why a tick is a plan, not a patch.
A document's version is `git hash-object` of its bytes, so the planner can compute new versions without git.

`RecordPort` follows `RemotePort` / `gitRemotePort` in `claims/remote-take.ts:7-34`: an interface, a factory
that returns `undefined` when the repo has no origin. Its fetch tells absent, unreachable and busy apart
(`ls-remote --exit-code`, as `branchOnOrigin` in `claims/remote.ts:46-50`); only unreachable may queue.

The local copy copies `mainline/base-cache.ts`: fetch into `refs/spec-board-remote/record`, extract with
`git archive` into a scratch folder, rename to `<tip>.<layout>`, keep two. Do not read blobs through `Runner`
stdout (`gotcha-runner-stdout-is-decoded-text`). The view reads versions from `ls-tree` and a document's text
on demand.

The outbox stores intents and replays them through runners the caller registers; in this phase the tests
register a toy intent. Entries are created with `createExclusive` and flushed under the claims store's lock.

`fake-record.ts` is the in-memory port every later phase's tests use; model it on `fakeOrigin()` in
`tests/claims-remote-take.test.ts:13` (lease rules; `offline`, `absent` and `busy` switches). Real git is only
for what only git can prove: two clones, a racing writer, the unreachable origin (`set-url` to a missing path,
as `tests/claims-remote.test.ts:58-63`).

The growth measurement decides the shard rule for `cards/`. Run it against a bare origin in a temp dir, never
against a real remote.

## Deliverables

- [x] `core/land-on-ref.ts`: fetch, plan, scratch-index commit, lease push, retry up to 5; timeout and no credential prompt; lease push and network options moved to `core/remote-push.ts` with the claims suites green unchanged
- [x] `planWrites(view, ops, validate)`: create, update, replace, delete; a stale `ifVersion` returns `conflict` with the current document; create over an existing path conflicts; a path used twice or more than 50 ops is `invalid`; the validator is a parameter
- [x] `RecordPort` + `gitRecordPort`: fetch into the tracking ref and tell absent, unreachable and busy apart; versions from `ls-tree`, a document's text on demand (real git, two clones)
- [x] `writeRecord(port, plan)`: the plan runs against each fresh tip; the first write creates the ref from an empty tree; a plan may refuse
- [x] Race (real git): three clones each add a different entry to one document's list through a plan and all three land; three write the same value with `ifVersion` and exactly one lands
- [ ] Local copy: one folder per tip under `<git-common-dir>/spec-board/record/`, moved into place by rename, two kept; a failed fetch leaves it and reports its age; a reader during a refresh sees one tip
- [x] Outbox of intents: an unreachable origin returns `queued`; entries created exclusively and flushed under the lock, oldest first, each re-planned; two queued intents on one document both land; a refused one stays and is reported to its own session only
- [ ] `spec.ts record status | sync | drop <n>` registered, refused under Codex local-pilot, documented in `SKILL.md` → *Tools*
- [ ] Growth measurement against a bare origin: 1,000 changes across a 3,000-document record; pack size, tree size and seconds per write, plus the fetch cost of 3,000 separate refs for comparison, recorded in `research/phase-1/`; the `cards/` shard rule set from it

## Phase-local notes

- A failed `gh api` prints valid JSON, but this phase uses no `gh`: plain git only.
- `spec.ts` exits 0 when it refuses; tests assert the result line, not the exit code.
- `claims/remote.ts` is also edited by `codex-runtime-support` 2b. The move here is two symbols; merge main first.
