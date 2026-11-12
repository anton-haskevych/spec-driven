---
kind: principle
applies-to: [phase 1+]
created: 2026-11-11T19:41:31-08:00
---

# The record reuses the plugin's loop, lease, cache and readers

Before writing a mechanism for the record, find the one the plugin has:

| Need | Already here | Use |
|---|---|---|
| fetch → plan → commit → push → retry | `core/land-on-main.ts:23-48` | lifted to `core/land-on-ref.ts` in phase 1; `landOnMain` calls it from phase 6 |
| lease push, 10 s timeout, no prompt, `--no-verify` | `claims/remote.ts:15-19,56-59` | moved to `core/remote-push.ts`, imported back |
| absent vs unreachable | `branchOnOrigin`, `claims/remote.ts:46-50` | the port's fetch; add "busy" |
| a local copy nobody reads half-written | `mainline/base-cache.ts:14-32,71-79` | one folder per tip, moved by rename, two kept |
| a remote ref mirrored locally | `refs/spec-claims-remote`, `claims/remote.ts:16,39` | `refs/spec-board-remote/record` |
| exclusive create, remove-if-unchanged | `claims/atomic-file.ts:8-36` | outbox entries |
| once-per-session memory | `hooks/lesson-recall.ts:38-45` (tmpdir) | the plan-version memory |
| spec field readers | `core/spec-meta.ts:52-120`, `core/schedule.ts:16` | called by the record readers on the parsed JSON |
| people matching | `samePerson`, `core/people.ts:17` | card assignees |
| the board model as JSON | `buildBoard`, `board --json` | what the page serves |

`core/` never imports `record/` or `plan/`; `record/` imports no document reader (it is handed a
validator and intent runners). Source: review 2026-11-11, R13–R15, R23, R24.
