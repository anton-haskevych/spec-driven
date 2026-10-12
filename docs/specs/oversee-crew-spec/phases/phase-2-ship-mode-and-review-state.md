---
needs: [1]
pr: B
---

# Phase 2 — Ship mode and review state on the board

**Goal:** `ship:` is a checked spec field the PR moment reads instead of asking, the board shows held PRs as awaiting review and approved ones as ready to merge, the overseer merges approved held PRs, and the deployed marker can land on main in `docs: branch` projects.

**Outcome:** The board says "#930 awaiting review" instead of "checks pass → merge", and when you approve a held PR on GitHub the overseer merges and deploys it · small tool changes · risk: low; the board's JSON version bumps once.

**Files to touch:**
- `skills/spec/tools/core/spec-meta.ts`, `skills/spec/tools/doctor/spec-meta.ts`
- `skills/spec/execute.md` (§10), `skills/spec/handoff.md` (§4)
- `skills/spec/tools/pr/gh-lists.ts`, `skills/spec/tools/pr/checks/rollup.ts`
- `skills/spec/tools/board/model.ts`, `board/joins.ts`, `board/attention.ts`, `board/render.ts`
- `skills/spec/tools/phases/deployed.ts`, `skills/spec/tools/commands/phase.ts`
- `skills/spec/oversee-crew.md`
- tests: `spec-meta.test.ts`, `doctor.test.ts`, `pr-gh-lists.test.ts`, `board-attention.test.ts`, `board-render.test.ts`, `board-joins.test.ts`, deployed tests

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

`phase deployed --land` reuses `landOnMain` like `pr merge`'s merge line and `focus`.

## Deliverables

- [ ] 2.1 `ship:` field: `SHIP_MODES`, `ShipMode`, `readShipField`; doctor and spec-file check reject unknown values; tests
- [ ] 2.2 execute §10 and handoff §4 read `ship:` (auto → babysit, hold-for-review → babysit hold) and ask only when it is absent; wiring pins
- [ ] 2.3 PR review state: `reviewDecision` and `labels` in the open-PR list, carried on `PrRow` / `PrCell`; pinned field string updated; tests
- [ ] 2.4 Needs-you kinds `pr-review` ("#n awaiting review → open the PR") and `pr-approved` ("#n approved → merge"); `nextFromChecks` stops saying merge for a held PR; exhaustive render switch; `BOARD_VERSION` bump; tests, golden unchanged
- [ ] 2.5 `oversee-crew.md`: an approved held PR goes to a babysitter in auto mode
- [ ] 2.6 `phase deployed --land` writes the marker on `origin/<default>`; babysit uses it in `docs: branch` projects; tests (real git, few)

## Phase-local notes

- Release 2.44.0 with this PR (`python3 scripts/version.py --set 2.44.0`, ROADMAP row).
- Phase 3 edits the same board files (`same-files-as: [2]` there); land this first.
