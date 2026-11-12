# In-flight state

**Session ended:** 2026-11-12
**Active phase:** 4 — The modes use the commands

## Where things stand

- Done and ticked: `plan apply`, `record export [--unjoin]`, doctor checks for a joined spec.
- Built but not ticked: `join --tidy` works and is tested (`tests/join-tidy.test.ts`); its deliverable also
  says "handoff calls it and names the blocker otherwise", which is the handoff.md wiring below.
- Not started: `create.md`, the seven mode files, `SKILL.md` (+ `skill-wiring` / `commands-table` tests),
  ROADMAP row and version bump.

## Implicit context

- Preflight finding 5 (`research/phase-4/2026-11-12-modes-use-commands-preflight.md`): two plan changes
  have no command yet, so "one instruction per plan change" can't be met for them. Decided (listed as *Say if
  wrong*): add `phase task <spec> <phase> --add "<text>"… | --edit <task-id> "<text>" | --drop <task-id>` on
  both homes (record: a `planChangePlan` edit + a `PLAN_INTENTS` row, raises `planVersion`; files: like tick's
  item locating in `phases/locate.ts`), and `phase set --needs-deployed … --same-files-as …`. Review edits
  deliverables of existing phases (`review.md:293`), so it needs them.
- Mode-file line inventory (what to replace, with line numbers): recon note
  `research/phase-4/2026-11-12-modes-use-commands-recon.md` → *Mode files*. The `status:` field has no
  command until phase 6 (`spec-status`): leave those lines as they are.
- Handoff wiring for tidy: after publish-docs in `handoff.md` §3 (around lines 140–147), run
  `spec.ts join <spec> --tidy` for a joined spec; pass its `left …` text on as is. The command refuses a spec
  that isn't joined, so the instruction can be unconditional ("run it; a spec not on the board says so").

## Pick up from here

- Build `phase task` and the two `phase set` flags first (tooling, TDD), then the mode files in one chunk:
  create.md (board on → write phase files with `phaseFileText({ onBoard })` shape, a draft JSON, then
  `plan apply`; board off → today's text word for word), then the rest, then `SKILL.md`.
- Read `ledger/decision-phase-4-tools-as-built.md` first.
