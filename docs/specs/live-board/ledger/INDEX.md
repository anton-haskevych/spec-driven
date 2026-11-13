# Ledger Index (layout v1)

Warm cache for forward-propagating learnings. One row per ledger entry with its
`[applies-to]` scope tag. See `SKILL.md` for entry format and filtering rules.

## Gotchas
- `gotcha-2-53-writes-files-on-a-newer-record.md` — [phase 6, 7, 8, load-bearing] — 2.53.0 writes files on a layout-2 record; update all installs first
- `gotcha-readers-outside-the-spec-state-funnel.md` — [phase 2a+] — five readers bypass SpecState; move each or it reads frozen files
- `docs/specs/_ledger/gotcha-codex-packaged-entry-test-runs-near-its-timeout.md` — [general] — Codex packaged-entry test runs at its 5 s limit under load; rerun with --timeout
- `docs/specs/_ledger/gotcha-workspace-scan-skips-trees-with-no-commits-off-base.md` — [general] — scanWorkspaces skips trees with no commits off base; force them live
- `docs/specs/_ledger/gotcha-phase-tick-hash-n-counts-open-items.md` — [general] — phase tick #N counts open items; numbers shift after each tick

## Principles
- `principle-record-reuses-the-house-loop-and-cache.md` — [phase 1+] — reuse land-on-main loop, claim lease, base cache, field readers

## Domain

## Decisions
- `decision-writes-are-plans-rerun-per-tip.md` — [general, load-bearing] — a write is a plan re-run per tip; outbox holds intents
- `decision-progress-md-stays-as-a-stub-export-is-the-way-back.md` — [phase 2+] — never delete progress.md; record export is the rollback
- `decision-one-phase-writer-port-for-both-homes.md` — [phase 3+] — one PhaseWriter port; mode files never branch on joined
- `decision-codex-reads-the-board-refuses-writes.md` — [phase 3+] — Codex pilot reads a joined spec, phase writes refuse (Anton)
- `decision-data-moving-releases-raise-the-layout.md` — [phase 6, 7, 8] — PR C/D/E raise RECORD_LAYOUT and upgrade specs on touch
- `decision-cards-shard-by-hundreds.md` — [phase 8+] — cards/<n div 100>/c<n>.json; flat folder pushes the whole list per write
- `decision-the-store-api-as-built.md` — [phase 2+] — writeRecord(port, plan, {validate}); only sendIntent queues; RefPort
- `decision-phase-writer-and-tick-as-built.md` — [phase 3a+] — PhaseWriter port, task close fields, intent runners, read overlay
- `decision-join-as-built.md` — [phase 2a+] — readers, specPlanProblems, task text and evidence, zero-task phases
- `decision-readers-read-a-snapshot-not-the-folder-copy.md` — [phase 2a+] — readRecord: snapshot of git objects; fetch only with board on
- `decision-joined-spec-guards-until-record-writes.md` — [phase 3, 3a] — writers refuse and the hook blocks plan edits; lift per write
- `decision-plan-changes-as-built.md` — [phase 3b+] — planChangePlan vs phaseStatePlan, PLAN_INTENTS, dry run then send, parks
- `decision-plan-notice-as-built.md` — [phase 4+] — plan-changed memory holds shapes; notice before result; hook only for seen specs
- `decision-phase-4-tools-as-built.md` — [phase 4+] — plan apply draft, stub, tidy holders and edge keys, export without ids
- `decision-phase-6-fields-and-prs-as-built.md` — [phase 6+] — four fields move; upgrade on touch; PR sync by branch+head; built rows
- `decision-phase-7-questions-and-notes-as-built.md` — [phase 8+] — question docs, gate approvals, phase note, layout steps 2/3
- `decision-phase-8-cards-as-built.md` — [phase 8+] — card docs, plans, intent, cover, board rows, ideas, spec cards, layout 4

## Workarounds
- `docs/specs/_ledger/workaround-test-a-hanging-origin-with-a-blackhole-address.md` — [general] — Test a hanging origin with http://10.255.255.1/…; a missing path fails at once
