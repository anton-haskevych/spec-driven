# Ledger Index (layout v1)

Warm cache for forward-propagating learnings. One row per ledger entry with its
`[applies-to]` scope tag. See `SKILL.md` for entry format and filtering rules.

## Gotchas
- `gotcha-invalid-owner-reads-as-shared.md` — [phase 1+] — malformed or unmatchable owner means shared; use ownerOf + isOffered
- `docs/specs/_ledger/gotcha-git-use-config-only-needs-an-email.md` — [general] — useConfigOnly fails on a missing email too: pass a placeholder email
- `docs/specs/_ledger/gotcha-empty-git-author-name-overrides-user-name.md` — [general] — An empty GIT_AUTHOR_NAME overrides user.name: unset identity env, never blank it

## Principles
- `principle-packs-never-filter-by-owner.md` — [general] — packs serve a chosen spec; filtering prints a false "complete"

## Domain

## Decisions
- `decision-spec-level-owners-only.md` — [general, load-bearing] — owners on specs only; no phase or idea owners
- `decision-offer-filter-is-its-own-flag.md` — [phase 3, 4] — `board ready --for` offers; `--who` stays X's work
- `decision-crew-identity-is-the-run-file.md` — [phase 2] — crew's me is run.md runner:, set at start/takeover
- `decision-launch-gate-in-place-tree.md` — [phase 2] — gate = PlaceOptions.onlyFor in placeTree, before any tree

## Workarounds
