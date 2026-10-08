# Ledger Index (layout v1)

Warm cache for forward-propagating learnings. One row per ledger entry with its
`[applies-to]` scope tag. See `SKILL.md` for entry format and filtering rules.

## Gotchas
- `docs/specs/_ledger/gotcha-publish-docs-skips-deleted-files.md` — [general] — publish-docs skips deleted spec docs; edit a line or commit to main
- `docs/specs/_ledger/gotcha-session-files-span-every-repo.md` — [general] — Session files span every repo; scope by this repo's worktree paths
- `docs/specs/_ledger/gotcha-trees-place-reads-pr-group-from-base.md` — [general] — trees place reads pr: from base; a branch-only regroup is ignored
- `docs/specs/_ledger/gotcha-remote-claims-never-read-as-done.md` — [general] — Remote claims never read as done; the board keeps them in flight

## Principles
- `principle-session-attribution-scope-and-order.md` — [phase 3+, load-bearing] — repo scope first; claim → launch title → non-main tree

## Domain
- `domain-whole-spec-deploy-refs-never-wait.md` — [phase 3, 5] — needs-deployed on a whole spec never waits; deployWaits yields phase keys only

## Decisions
- `decision-focus-rank-in-spec-meta.md` — [general, load-bearing] — `focus:` + `owner:` in spec CLAUDE.md; no `_focus/` registry
- `decision-focus-writes-land-on-default-branch.md` — [phase 2, 6] — focus writer pins origin/<default>, commits one file, pushes
- `decision-focus-is-not-priority.md` — [phase 3+] — focus ≠ p1; focus ranks before priority in ready rows
- `decision-focus-row-sessions-stay-on-the-row.md` — [phase 3, 4] — sessions on FocusRow.sessions; phase 4 adds work; ReadyRow.focus = position

## Workarounds
