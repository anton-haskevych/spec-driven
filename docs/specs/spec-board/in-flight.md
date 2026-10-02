# In-flight state

**Session ended:** 2026-10-01
**Active phase:** 5b — Tree placement (5 of 6 deliverables done)

## Where things stand

- `spec.ts trees place <spec> <phase> [--json]` and `trees prune [--apply]` work and are tested (713 pass).
  Dogfood: place finds this checkout for 5b and 6 in 0.5 s; CRM prune lists 42 of 64 trees in 2.3 s.
- The board targets each ready row at its PR group's tree, marks busy trees, and shows `prune N merged trees`.
- Left: the last deliverable — `execute.md` §0 (place, then `EnterWorktree {path}` when the session isn't in the
  placed tree, then `claim take`), SKILL.md *Tools* → Trees, README *Teammates*. Docs only, plus a
  `tests/skill-wiring.test.ts` check if that test covers execute.md steps.

## Implicit context

- The installed plugin is still the 2.33.0 cache: its execute.md and handoff.md have no claim or placement steps
  until 2.36.0 ships. Run `claim take` / `release` and `trees place` by hand (repo `skills/spec/tools/spec.ts`).
- `place` never runs `gates.bootstrap`: gates are checklists. It reports `bootstrap: <gate>` for a new tree, and
  the session works through it (execute §1 *Fresh worktree?*). The §0 text must keep that order.
- Nothing was placed or pruned in CRM: those runs were listing only. No `local.md` was written outside test repos.
- The full suite has one known flake, the stale-claim race test (`gotcha-displace-put-back-can-drop-a-winner.md`).

## Pick up from here

- `/spec execute spec-board 5b`: write the execute §0 placement step, SKILL.md *Tools* → Trees, README
  *Teammates* (needs Bun + plugin; shared settings in `_playbook/settings.md`; personal root detected into
  `<git-common-dir>/spec-driven/local.md`, change it by asking; the WorktreeCreate hook is optional).
