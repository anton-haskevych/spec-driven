# In-flight state

**Session ended:** 2026-11-12
**Active phase:** 6 — PRs and spec fields on the record

## Where things stand

- Done and ticked: 6.7 landOnMain → landOnRef (5 tries, timeout, no prompt, server declines fail at once);
  6.1 PR documents (reader, created at join, upgrade and new group); 6.6 layout 2 + upgrade on first write;
  6.4 readers (`PlanSource.fields`, `readSpecFields`); 6.5 owner/ship/focus/spec-status on the record.
- Open: 6.2 `pr open` / `pr merge` write the PR document, `specPrNumbers` reads the record, GitHub sync from
  `pr status` and board load; 6.3 `phaseStage` + board lanes + built-not-opened *Needs you* row; 6.8 mode
  docs (execute §10, babysit merge line), ROADMAP row, version bump to 2.54.0.
- SKILL.md already says 2.54.0 in *Spec fields on the board*; the bump itself isn't done.

## Implicit context

- Preflight (`research/phase-6/2026-11-12-prs-and-fields-preflight.md`) finding 5: `joinedActivity` drops
  phases whose tasks are all done, so a built phase has no flight row today. `phaseStage` must feed it;
  done-for-edges stays "every task done".
- The full `bun test` run hung once in this session (low CPU, no output after the first failure); every one
  of the 263 files passed when run alone with a 60 s limit. Not chased; run per file if it repeats.
- Write path for PR documents: a direct `writeRecord` (pr commands run online), after `upgradeIfBehind`.
  Use `prSeenOf(view)` (`plan/upgrade-read.ts`) for GitHub → `PrState`; `prDocsFromFiles` already maps.

## Pick up from here

- Start with 6.2: in `pr/actions/merge.ts` `recordMerge`, a joined spec writes `prs/<group>.json` merged
  fields instead of `landOnMain`; `pr/actions/open.ts` writes number/branch/state/headRefOid after create or
  mark-ready; `pr/resolve.ts` `resolveGroupPr` and `board/load.ts` `prLinks` take numbers from PR documents.
