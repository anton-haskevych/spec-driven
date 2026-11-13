# Phase 6 recon — PRs and spec fields on the record (2026-11-12)

Inline recon (the seam was mostly named by the phase file and the as-built ledger rows). Paths are relative to
`skills/spec/tools/`.

## The seam

- **Branch landing.** `core/land-on-main.ts` had its own 2-try loop with a plain `git push` (pre-push hooks,
  no timeout, can prompt). `core/land-on-ref.ts` takes a `RefPort { fetchTip, commit, push }`. A branch port
  is `pinDefault` + `baseProject(tip)` + blobs/`commitOnto` + `leasePush` on `refs/heads/<branch>`. Six callers:
  `land-spec-field.ts`, `focus/land.ts`, `phases/deployed-land.ts`, `pr/actions/merge.ts:78`,
  `commands/join-tidy.ts:42`, `plan/land-banner.ts:10`. Tests `focus-land` and `pr-merge` expect a
  server-declined push (pre-receive hook) to fail with its reason, not retry: `leasePush` reads every `!` line
  as `refused` (a lost race), so the port needs to tell `[remote rejected] (<hook reason>)` apart.
- **Record kinds.** `plan/kinds.ts` KINDS registry (path regex → reader + identity check). `record/write.ts`
  writes `meta.json` only when absent (`withMeta`) and refuses when `meta.layout > RECORD_LAYOUT`; raising the
  layout needs `withMeta` to rewrite a lower layout too.
- **Join / apply batch.** `newSpecPlan` (`commands/join.ts:84`, also `commands/plan.ts:47`) creates `spec.json`
  and phase docs. `planJoin` (`plan/join.ts`) builds `SpecDoc` with `layout: RECORD_LAYOUT` and no spec fields.
- **Plan changes.** `planChangePlan` (`plan/ops/change.ts`) is the one wrapper for add/split/move/set/task:
  the place to create a PR doc for a group that first appears.
- **PR numbers.** `specPrNumbers(prOpening)` (`pr/resolve.ts:21`) parses `PR #n` in *Spec state*; read by
  `resolveGroupPr` (`pr/resolve.ts:50`) and `board/load.ts:100` (`prLinks`). `pr open` writes no line (the
  session adds `PR #n · branch` by hand); `pr merge` lands `PR #n merged <date> as <sha7> (<method>).` on main
  through `landOnMain` (`pr/actions/merge.ts:68-89`, `merge-line.ts`).
- **Spec fields.** `loadNodes` (`graph/nodes.ts:30`) reads `CLAUDE.md` → `status`, `relations`, `meta`
  (`readSpecMeta`); marks already come from the record for joined specs (`MarksSource`). Direct frontmatter
  reads: `trees/place-system.ts:84` `checkoutOwner`, `commands/crew/launch-session.ts:77` `shipOf`.
  Writers: `core/land-spec-field.ts` (`owner`, `ship` via `landSpecField`), `focus/land.ts`,
  `phases/deployed-land.ts` (deployed marker on main for files).
- **Board.** In-flight rows come from `PhaseActivity` (`board/activity.ts`: any box ticked off base = `wipIn`;
  joined: `board/joined-activity.ts`, a task closed `on origin/<branch>`). `board/flight.ts:40` sets
  `next` from `tickedIn`. Attention rows: `board/attention.ts` `needsYou`. `board/model.ts` is 224 lines.

## Reuse

- `missingPrDocs` is the one place that turns code phases into not-opened PR documents (join, apply, new group).
- Spec fields: the record reader already calls `readFocusFields`, `readShipField`, `readLifecycleFields`;
  `parseRelations` (`graph/relations.ts`) for relations.
- `landOnRef` for the branch, as the ledger planned (`principle-record-reuses-the-house-loop-and-cache.md`).

## Testing issues

- `tests/land-on-main.test.ts` races with a runner wrapper; 5 losing races take ~3 s of pauses (raise the test
  limit). Hook decline tests already exist (`focus-land`, `pr-merge`).
- "A PR B plugin refuses to write" can't run PR B's code: test the refusal rule with the plugin's own layout
  passed in, plus that this plugin raises `meta.json` from 1 to 2.
- `board/model.ts` at 224 lines: new attention rows go in `board/record-rows.ts`.
- The phase-6 commands run on CRM, where the board is on; this repo has it off. Real-git suites use
  `joinedRepo` (`tests/joined-repo.ts`).
