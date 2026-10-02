# Ledger Index (layout v1)

Warm cache for forward-propagating learnings. One row per ledger entry with its
`[applies-to]` scope tag. See `SKILL.md` for entry format and filtering rules.

## Gotchas
- `gotcha-stacked-prs-merge-into-their-base.md` — [general] — retarget stacked PRs (or auto-delete heads) before merging
- `gotcha-locate-spec-file-needs-absolute-paths.md` — [phase 1, 7, 8] — git prints relative paths; join onto repo root first
- `gotcha-deployed-marker-goes-after-the-pointer.md` — [phase 2] — reader only sees `· deployed` right after the pointer
- `docs/specs/_ledger/gotcha-bun-test-runs-in-utc-but-spawned-children-do-not.md` — [general] — bun test is UTC; spawned children aren't
- `docs/specs/_ledger/gotcha-execute-section-0-is-skipped-on-the-resume-path.md` — [general] — A step every execute session must run goes in execute.md §1, not §0
- `docs/specs/_ledger/gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner.md` — [general] — Code under test that spawns git must get `isolatedRunner`, not `systemRunner`
- `gotcha-github-ignores-merge-union.md` — [general, load-bearing] — GitHub PR check ignores merge=union; remove shared writes

## Principles
- `principle-writers-plan-validate-then-apply.md` — [phase 2+] — whole EditPlan, checked in-process, one applier

## Domain

- `domain-writer-building-blocks.md` — [phase 3, 4, 5] — findPhase, locate, newIssues, ledger-index, tree.spec
- `domain-gh-actions-shapes.md` — [phase 6] — job log tail is cleanup; workflow names repeat; link holds job id

## Decisions
- `decision-publish-docs-snapshot-merge.md` — [phase 7, load-bearing] — snapshot commit + merge-tree + merge-back (probe-verified)
- `decision-phase-ids-never-retire.md` — [phase 1, 3] — split keeps the original id; `comparePhaseIds` orders letters
- `decision-parse-prose-stays-as-fallback.md` — [phase 1] — SKILL.md parse rules stay, aligned with the tool
- `decision-bash-writes-denied-not-swept.md` — [phase 8] — PreToolUse deny on write signals, no mtime sweep
- `decision-index-pointer-check-scope.md` — [phase 5, 10] — only docs/specs/_ledger rows resolve; CRM cross-spec rows have no base
- `decision-parse-settings-returns-problems.md` — [phase 5+] — one schema walk: defaults + problems; settings.file marks presence
- `decision-pr-status-tails-first-three.md` — [phase 6, 10] — tails for 3 failures only; each log is ~1 MB
- `decision-publish-docs-pushes-first.md` — [phase 7, 10] — publish-docs pushes, publishes, merges back; handoff makes one call
- `decision-no-bash-guard.md` — [general] — no Bash write guard; hand/script edits allowed, doctor checks at handoff
- `decision-no-context-nudge.md` — [phase 10] — context nudge dropped (Anton); `nudge-at` setting removed

## Workarounds
