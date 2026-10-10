# Ledger Index (layout v1)

Warm cache for forward-propagating learnings. One row per ledger entry with its
`[applies-to]` scope tag. See `SKILL.md` for entry format and filtering rules.

## Gotchas
- `docs/specs/_ledger/gotcha-hook-payload-cwd-follows-cd.md` — [general] — hook payload.cwd follows cd; resolve with findProjectDir

## Principles

## Domain

## Decisions
- `decision-review-follows-create.md` — [phase 1] — a new spec's row 1 is its review unless Anton skips it
- `decision-preflight-defaults-vs-forks.md` — [phase 1, 2] — preflight splits defaults/forks; execute stops on forks
- `decision-in-flight-one-file-per-phase.md` — [phase 3] — in-flight/phase-<id>.md; sections conflicted in a git test
- `decision-pr-link-stays-in-spec-state.md` — [phase 3] — keep the one-time PR line; tools read it
- `decision-project-dir-is-outermost-docs-specs.md` — [phase 4] — outermost docs/specs ancestor, not nearest
- `decision-release-version-at-merge.md` — [general] — version = main's minor + 1 at merge

## Workarounds
