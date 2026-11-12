# Phase 2a preflight — count rule, state source, one view

Chunk: deliverables 1–3. Inputs: the phase entry, `2026-11-11-count-rule-and-state-source-recon.md`,
`principles.md`. Paths under `skills/spec/tools/`.

## Findings that change the plan

1. **There are four count rules, not three.** `phases/split.ts:54` also uses `countCheckboxes` (whole file) to
   decide whether the kept part flips `progress.md`. Fold it with the other three.
2. **`core/` can't import `Task`** (`plan/docs/phase-doc.ts`; technical.md → `core/` never imports `plan/`). The
   one rule takes `readonly { done: boolean }[]`; text callers map `TaskItem.checked` through one helper in
   `core/phase-entry.ts` that also strips frontmatter (tick and the doctor count the raw entry today,
   `phases/tick.ts:41`, `doctor/phases.ts:19`).
3. **Zero-task phases** (`ledger/decision-join-as-built.md`): the rule is "complete = at least one task and every
   task done", which already matches split (`:55`) and the doctor (`:23`); tick's `unchecked === 0` only differs
   at zero tasks, where tick can't run. For a joined phase, `deployed` set also means done (join only writes it
   for a ticked phase, `plan/join.ts:84`).
4. **A fetch on every pack and board with the switch off breaks "nothing changes".** `fetchRecordTip`
   (`record/ref.ts:42-56`) is a fetch plus an `ls-remote` when the ref is absent. The view loader fetches only
   when the caller says so; callers say so when `board.record` is on; otherwise they read the tracking ref if
   one exists (a spec joined while the switch was on) and never touch the network.
5. **`stateSourceFor` needs no `projectDir`.** Prose and in-flight notes come from the `SpecFolder` it is given
   (checkout or base cache); the record decides only phases, tasks, edges and marks. Signature:
   `stateSourceFor(view: RecordView | undefined) → (spec: SpecFolder) => SpecState`.

## Canon against the chunk

| Rule | Verdict | Consequence |
|---|---|---|
| Single source of truth | Violated, fix here | Four count rules → `countTasks` in `core/phase-entry.ts`, used by tick, split, doctor, summary, state source |
| Pure functions | Bites | `joinedSpecState(spec, read, specDoc, phaseDocs)` pure; `stateSourceFor` only reads the view |
| DIP | Bites | Callers receive a `SpecSource` function; nobody below the command opens a view |
| Dependency rule | Bites | `core/` → nothing new; `plan/state-source.ts` → `core/`, `plan/docs`, `record/view` |
| Size caps | Bites | `context/packs.ts` 162: Board line goes in `context/board-lines.ts`; `board/load.ts` 117 fine |
| SRP / Clean Code names, ISP, LSP, DDD | Inert | No new actor or aggregate; `SpecState` keeps its shape |

## Amendments

1. Commit 1: `countTasks` + `entryTaskStates(text)` in `core/phase-entry.ts`; tick, split, doctor, summary use it.
2. Commit 2: `plan/state-source.ts` with `joinedSpecState` and `stateSourceFor`; `tests/plan-join-golden.test.ts`
   uses it instead of its local `stateFromDocs`.
3. Commit 3: `plan/record-reader.ts` `readRecordView(git, { fetch })` → `{ view, live, ageMs } | undefined`,
   offline → tracking ref; refuses a higher `meta.json` layout (reads nothing).
4. Then callers, one commit per group: packs (context, codex entry), board path (mainline/load, views,
   activity), single-spec commands (ready, trees place, pr open/resolve, phase, review-refs), hook + doctor.

## Defaults applied

- Rendered task line: `- [x] 2a.1 <text> — <evidence>`, under `## Deliverables` in place of the frozen section;
  a prose file with no Deliverables section gets its checkbox lines removed and the section appended.
- `summary.nextRun` from tasks: first contiguous open run, capped at 5, as `<id> <text>`.
- Edges for a joined phase: `declared: true` always.

## Forks for you

None.
