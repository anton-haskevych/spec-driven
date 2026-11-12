# Code Map — Live Board

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|
| `skills/spec/tools/core/land-on-ref.ts` | The fetch → plan → commit → lease-push → retry loop over a `RefPort` | 1 |
| `skills/spec/tools/core/remote-push.ts` | Lease push, 10 s timeout, no prompt, `--no-verify`; shared by claims and the record | 1 |
| `skills/spec/tools/record/write.ts` | `writeRecord(port, plan, { validate })`: every record write goes through it | 1 |
| `skills/spec/tools/record/plan-writes.ts` | Pure op planner: versions, conflicts, validation | 1 |
| `skills/spec/tools/record/ref.ts` | `RecordPort` + `gitRecordPort`: fetch (absent, offline, busy), commit, push | 1 |
| `skills/spec/tools/record/outbox.ts` | Queued intents; `sendIntent` is the write that may run offline | 1 |
| `skills/spec/tools/record/mirror.ts` | The local copy, one folder per tip | 1 |
| `skills/spec/tools/commands/record.ts` | `record status \| sync \| drop` | 1 |
| `skills/spec/tools/tests/fake-record.ts` | `fakeRecord()`, `viewOf(docs)`: the in-memory record later phases test on | 1 |

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/tools/core/spec-state.ts` | The one funnel for phase state; takes a swappable reader | |
| `skills/spec/tools/graph/nodes.ts` | The funnel for spec fields, and a second parser of `progress.md` done marks | `gotcha-readers-outside-the-spec-state-funnel.md` |
| `skills/spec/tools/commands/phase.ts` | Every phase write starts here; becomes a dispatcher over the `PhaseWriter` port | `decision-one-phase-writer-port-for-both-homes.md` |
| `skills/spec/tools/core/apply-edits.ts` | Plan-then-apply for file edits; the record path sits beside it | |
| `skills/spec/tools/publish/commit-onto.ts` | Scratch-index commit; gains an optional base for the record's first commit | |
| `skills/spec/tools/core/land-on-main.ts` | The fetch → plan → commit → push → retry loop, lifted into `core/land-on-ref.ts` | `principle-record-reuses-the-house-loop-and-cache.md` |
| `skills/spec/tools/mainline/base-cache.ts` | One folder per commit, moved into place by rename: the model for the local copy | `principle-record-reuses-the-house-loop-and-cache.md` |
| `skills/spec/tools/publish/push.ts` | `pushBranch`: the tick's save; gains network options and a typed result | |
| `skills/spec/tools/board/activity.ts` | "In progress in another tree"; feeds claim take and trees place | `gotcha-readers-outside-the-spec-state-funnel.md` |
| `skills/spec/tools/core/phase-entry.ts` | Task counts parsed from entry text; one count rule over tasks | `gotcha-readers-outside-the-spec-state-funnel.md` |
| `skills/spec/tools/ready/ready-set.ts` | Reads `edges.declared`; why join writes edges out | |
| `skills/spec/tools/runtime/workflow-capabilities.ts` | What a Codex pilot may run; phase writes refuse on a joined spec | `decision-codex-reads-the-board-refuses-writes.md` |
| `skills/spec/tools/commands/context.ts` | Pack entry; shared with `codex-runtime-support` 2b | |
| `skills/spec/tools/commands/claim.ts` | Push on take; shared with `codex-runtime-support` 2b | |
| `skills/spec/tools/trees/place-system.ts` | Reads `pr:` and activity; shared with `codex-runtime-support` | |
| `skills/spec/tools/claims/remote.ts` | Lease push, timeout and no-prompt rules; moved to `core/remote-push.ts` and imported back | |
| `skills/spec/tools/playbook/settings.ts` | Where the `board.record` switch is read | |
| `skills/spec/tools/hooks/spec-file-check.ts` | Blocking feedback after a hand edit to state in a joined spec | |
| `skills/spec/SKILL.md` | Layout rules and the *Tools* section | |

## External references

- Academy board (CRM repo): `ops/src/academy-board/doc-writes.ts`, `board-store.ts`, `board-schema.ts`
- Data model page: https://claude.ai/artifact/UtB3HsPKyqBLMupkt1hn2g
- Implementation page: https://claude.ai/artifact/47cx1m6MJBwKoYXmh63gww
