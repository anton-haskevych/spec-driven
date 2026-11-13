# Phase 3a preflight — plan changes on the port (2026-11-12)

Inputs: phase entry, `2026-11-12-plan-changes-recon.md`, `principles.md`.

## Findings that change the plan

1. **The phase file says the record path runs doctor's `phaseEdgeIssues`; it can't.** `doctor/phase-edges.ts:7`
   takes a file `SpecState` plus `nodes` from disk, and `specPlanProblems` (`plan/docs/spec-plan.ts:9-18`) has no
   cycle check. So 5→3 vs 3→5 would both land today. Lift the walk (`doctor/phase-edges.ts:34-43`) into one
   function over `id → needs` that the doctor and the record share; check only problems the change introduces.
2. **A park only on the record would vanish.** Every park reader parses in-flight note text
   (`board/parked.ts:24`, `core/park.ts:42-50`), and `joinedSpecState` builds notes from files only
   (`plan/state-source.ts:46-49`). The crew would never see a worker's question. Render `PhaseDoc.parks` into the
   joined state's notes with `withPark | withAnswer`.
3. **A record `phase add` makes a phase nobody can give tasks to.** The joined reader replaces the prose
   Deliverables with the record's tasks (`plan/state-source.ts:81-91`), and no command adds a task. Add a
   repeatable `--task "<text>"` to `phase add` for both homes.
4. **The port is synchronous except `tick`** (`plan/phase-writer.ts:24-29`); every record action awaits a write.
   Widen all methods to `PhaseOutcome | Promise<PhaseOutcome>` and render in one helper.
5. **`TickWorld` already names a crew type** (`commands/crew/tick.ts:27`). The shared send goes in its own file as
   `RecordWorld`, keeping `record-tick.ts` (133 lines) from growing.

## Canon against phase 3a

| Rule | Verdict | Consequence |
|---|---|---|
| Pure functions (house §3) | Bites | Each action is a pure `(JoinedPlan) → new phases` edit in `plan/ops/`; the change wrapper turns it into ops; I/O stays in the record writer |
| Single source of truth (house §8) | Bites | One cycle walk (finding 1); ids from `phases/ids.ts`; park text from `core/park.ts` |
| Size caps (house §5) | Bites | New ops one per file; `record-writer.ts` stays a thin table; `record-tick.ts` sheds `send/outcomeOf` |
| SRP by actor | Bites | Plan-version bump and edge checks belong to the change wrapper, not to each op |
| OCP | Bites | A new action = an op file + an intent row; `plan/intents.ts` becomes a table keyed by command |
| DIP | Inert | `RecordPort` / `PhaseWriter` already exist |
| ISP / LSP | Inert | — |
| Errors are values | Bites | Ops return `{ refused }`; a local dry run gives `invalid` before any network step |
| Clean Architecture boundaries | Bites | Store never imports readers: validation still goes through `validateRecordDoc` |
| DDD invariants | Bites | `planVersion` raised only by plan changes (`spec-doc.ts:10`); deployed and park are state, not plan |
| Pass D aggregates | Inert beyond the above | spec.json + phase docs written in one batch already |

## Amendments

1. Add `needsCycle(byId, start)` shared by doctor and the record; `planChangePlan` checks problems introduced
   (`specPlanProblems` + cycles), comparing before and after.
2. Phase docs change through RFC 7386 `update` patches (diff of top-level keys), never `replace`, so a field a
   newer plugin writes survives an older one's write.
3. `PhaseDoc.parks?: ParkEntry[]`; record park/unpark update it; `joinedSpecState` merges them into notes.
   Unpark on the record falls back to the file note when the open park is only there (parked before 3a).
4. `phase add --task` (repeatable); task ids `<phase>.<n>`, `n` the next free across the whole spec at the tip.
5. Shared send in `plan/record-send.ts` (`RecordWorld`, `sendPlan`, outcome mapping).
6. `deployed --land` on a joined spec writes the record.

## Defaults applied

- Deployed, park and unpark don't raise `planVersion` (state, not plan).
- On the record, cross-spec edge refs aren't resolved (no file nodes there); local refs and cycles are.
- `phase move` on a file spec needs `--from <phase>` and selects like tick (`#N` or prefix); on the record
  `--from` is only where to look first.
- `phase set` takes `--needs`, `--pr`, `--gate`, `--title`, `--outcome`; `none` clears `needs | pr | gate`.
- Record add/split write the new phase's prose file from the template when it doesn't exist.

## Forks for you

None.
