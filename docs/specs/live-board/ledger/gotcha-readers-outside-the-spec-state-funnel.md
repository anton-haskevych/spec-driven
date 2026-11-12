---
kind: gotcha
applies-to: [phase 2a+]
created: 2026-11-11T19:41:31-08:00
---

# Five readers bypass `SpecState` and break when a spec's state leaves its files

"Only the inputs change" is false for these. Each reads a joined spec's frozen files unless it is moved:

1. `graph/nodes.ts:42-46` parses `progress.md` again for done marks → `isFinished`, cross-spec `needs`
   (`ready/refs.ts:21-29`), lanes, overlap, the list. A joined spec would never read as finished and every
   spec needing it would stay blocked.
2. `hasProgress`: `commands/context.ts:80` (empty pack), `mainline/load.ts:72` (board says "prep"),
   `runtime/codex/entry.ts:95`. The record path must set it true, and `progress.md` must never be deleted.
3. `PhaseActivity` (`board/activity.ts:35-42`) comes from the worktree overlay and feeds claim take's "in
   progress in another tree" refusal (`claims/rules.ts:55`) and `trees place` (`trees/find.ts:98-103`).
4. `summarizePhaseEntry` (`core/phase-entry.ts:18-31`) counts checkboxes in entry text: frozen boxes plus
   rendered tasks double the count, or the frozen ones win.
5. The doctor's `progressIssues` and `phases/validate.ts:15-22` check the frozen files; handoff's "fix every
   error" then pushes Claude to hand-edit them.

Also: `edges.declared` (`core/phase-edges.ts`) changes the ready set three ways and has no field on
`PhaseDoc`; join writes the implied edges out instead.

When a later phase moves another field onto the record, grep for direct reads of its file home first.
Source: review 2026-11-11, R2–R6.
