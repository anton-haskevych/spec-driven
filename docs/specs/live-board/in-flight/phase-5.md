# In-flight state

**Session ended:** 2026-11-12
**Active phase:** 5 — CRM turns the board on

## Where things stand

- `board.record: on` is on CRM's main (`edb353d357`, written with git plumbing onto `origin/main`; the shared
  `~/IdeaProjects/crm` checkout was never touched). A paragraph under the frontmatter of
  `docs/specs/_playbook/settings.md` says why.
- `explicit-charge-handling` joined (22 phases, 83 tasks, banner `baeb65d`). Smoke test passed and is ticked:
  phase 4 (tree `-pr-c`) and phase 5 (tree `-pr-d`) ticked on the record and each saw the other's progress.
  PR C is held for Anton's review (babysitter in iTerm tab 12); phase 5's 5.7 waits on PR E (#983).
- 2.53.0 is on Anton's Mac (installed 2026-11-12 20:54). Taras's machine: not confirmed. Not urgent: it only
  matters before he touches `explicit-charge-handling` (`ledger/gotcha-old-plugin-sessions-only-break-on-joined-specs.md`).
- `join --tidy` has not run on `explicit-charge-handling`: its own sessions' handoffs run it as their branches merge.

## Pick up from here

- **Taras:** when Anton says Taras is on 2.53.0, tick 5.1 with Anton's word and the date as evidence.
- **On or after 2026-11-19, the metric:** in CRM, count over 2026-11-12 21:00 → 2026-11-19 21:00:
  - spec-docs-only commits on main: `git log origin/main --since=… --until=… --format=%H` and keep commits whose
    files are all under `docs/specs/` (baseline in `progress.md`: 419 of 508 in the week to 2026-11-11, ~60 a day;
    target under 20 a day). Expect little change yet: only one spec is on the board.
  - hand-offs that printed `diverged on main`: grep the CRM session transcripts under
    `~/.claude/projects/-Users-antonhaskevych-*crm*/` for `diverged on main` in that window.
  - Tick the last deliverable with both counts against the baseline, then close the phase.
- More specs can join on their own: any 2.53 execute / review / update / handoff on a CRM spec joins it now.
