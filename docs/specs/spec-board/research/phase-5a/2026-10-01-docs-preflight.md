# Phase 5a — docs chunk: preflight

Docs only; no code. All canon passes are inert.

## Findings that change the plan

1. The execute.md §1 wording must keep the output contract from ledger `decision-claims-landing-shape.md`:
   `claim:` means held, `claim refused:` means stop or re-pick. The offline line starts with `claim:`, so the
   session carries on. Say that explicitly, so an agent doesn't read "unreachable" as a failure.
2. The hatch is user-only. The doc must say never to run `--take-over` without the user's word, including when
   the pack re-picked. Otherwise an agent could treat "take it over" as a self-serve fix.

## Amendments

None beyond the two findings. Decisions for you: none.
