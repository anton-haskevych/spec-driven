---
needs: [1]
pr: B
---

# Phase 2 — Ship mode and review state on the board

**Goal:** `ship:` is a checked spec field the PR moment reads instead of asking, and Anton's ship answers are written to it. The board shows held PRs as awaiting review, approved ones as ready to merge and changes-requested ones as needing a relaunch. The overseer merges approved held PRs.

**Outcome:** The board says "#930 awaiting review" instead of "checks pass → merge". When you approve a held PR on GitHub, the overseer merges it. A ship answer you give once is kept for every session and machine.
- Shape: small tool changes.
- Risk: low; the board's JSON version bumps once.

**Files to touch:**
- `skills/spec/tools/core/spec-meta.ts`, `skills/spec/tools/doctor/spec-meta.ts`, `skills/spec/tools/commands/ship.ts` (new, `landOnMain` writer like `focus/land.ts`)
- `skills/spec/execute.md` (§10), `skills/spec/handoff.md` (§4)
- `skills/spec/tools/pr/gh-lists.ts`, `skills/spec/tools/pr/checks/rollup.ts`
- `skills/spec/tools/board/model.ts`, `board/joins.ts`, `board/attention.ts`, `board/render.ts`
- `skills/spec/oversee-crew.md`, `skills/spec/babysit.md` (an approved PR babysits in auto, even on a `hold-for-review` spec; preflight 2026-10-12)
- tests: `spec-meta.test.ts`, `doctor.test.ts`, `pr-gh-lists.test.ts`, `board-attention.test.ts`, `board-render.test.ts`, `board-joins.test.ts`, `board-command.test.ts` (version pin), a ship-writer test (real git, few)

## Implementation guidance

technical.md → *Phase 2*. Model `ship:` on the focus fields (`FOCUS_BANDS`, `readFocusFields`):
a const tuple, a reader that returns problems, one doctor line. The PR moment then reads it:
auto → babysit, hold-for-review → babysit in that mode, absent → the four-answer question.

Review state comes from `gh pr list` fields (`reviewDecision`, `labels`); the held signal is
the `hold-for-review` label babysit adds (phase 1), so the board needs no ship lookup to
render it. Check `gh` exit codes before trusting a body (`gotcha-gh-api-error-body-is-valid-json`).

Make the needs-you render switch exhaustive while adding the two kinds: today the last
branch renders anything unmatched as "not deployed → deploy". Share the `BOARD_VERSION`
bump with self-driving-loop phase 1 if both are open at once; the golden board stays green
because a kind with no data adds no line.

`spec.ts ship <spec> <mode>` writes `ship:` onto main through `landOnMain`, the way `focus` does. It runs only on Anton's word. The overseer's phase-1 `run.md` `## Ship modes` answers move to it, and that section goes away. (`phase deployed --land` moved to phase 1, review 2026-10-12.)

## Deliverables

- [x] 2.1 `ship:` field: `SHIP_MODES`, `ShipMode`, `readShipField`; doctor and spec-file check reject unknown values; tests
- [ ] 2.2 execute §10 and handoff §4 read `ship:` (auto → babysit, hold-for-review → babysit hold) and ask only when it is absent; wiring pins
- [ ] 2.3 PR review state: `reviewDecision` and `labels` in the open-PR list, carried on `PrRow` / `PrCell`; pinned field string updated; tests
- [ ] 2.4 Needs-you kinds:
  - `pr-review` ("#n awaiting review → open the PR"), `pr-approved` ("#n approved → merge"), `pr-changes` ("#n changes requested → relaunch")
  - `nextFromChecks` stops saying merge for a held PR
  - exhaustive render switch, `BOARD_VERSION` bump
  - tests; golden unchanged
- [ ] 2.5 `oversee-crew.md`:
  - an approved held PR goes to a babysitter in auto mode
  - changes requested → relaunch execute with the review comments in the brief
  - ship answers go through `spec.ts ship`
  - relaunch once per review: GitHub keeps changes requested until Anton reviews again
- [x] 2.6 `spec.ts ship <spec> <mode>` lands `ship:` on main through `landOnMain`; refuses a spec only on a branch; tests (real git, few)

## Phase-local notes

- Version picked at merge (main's minor + 1), ROADMAP row.
- Phase 3 edits the same board files (`same-files-as: [2]` there); land this first.
