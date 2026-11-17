---
needs: [3]
same-files-as: [4]
pr: D
---

# Phase 5 — The final PR and ship-alone groups

**Goal:** In spec-branch mode, `pr open <spec> [default]` opens one PR from `feat/<spec>` covering every phase outside ship-alone groups, with a per-phase *How to review*; a babysitter carries it in the spec's ship mode; ship-alone groups keep their own PR to main.

**Outcome:** A spec ships as one PR you can review phase by phase, while a backend piece another phase needs deployed still goes out early on its own · medium · risk: touches PR resolve and PR documents, which every babysit reads.

**Files to touch:**
- `skills/spec/tools/pr/actions/open.ts`, `pr/actions/pr-text.ts`, `pr/resolve.ts`, `pr/groups.ts`
- `skills/spec/tools/plan/docs/pr-doc.ts`, `plan/pr-sync.ts`
- `skills/spec/tools/claims/pr-claim.ts`, `claims/rules.ts`, `crew/close-out-run.ts` (`claimKey`)
- `skills/spec/tools/context/babysit-pack.ts`, `skills/spec/tools/launch/place-for-launch.ts`, `skills/spec/babysit.md`
- tests: `pr-open-base.test.ts`, `pr-resolve.test.ts`, `plan-pr-observed.test.ts`, `pr-claim.test.ts`, `claims-rules.test.ts`

## Implementation guidance

technical.md → *Phase 5*. The final PR is group `default`, the group whose branch is already
`feat/<spec>` (`DEFAULT_PR_GROUP`). Spec-branch mode guarantees no phase uses it, because every code phase
carries `pr:`. So the claim (`pr-default`), the PR document, `launch babysit <spec> default` and the
no-group refusals all work as they do today. No new claim kind: `pr-spec` would parse as a group named
"spec" at `place.ts`, `board/flight.ts` and `board/joins.ts` (review 2026-11-17).

Resolve first: a spec in spec-branch mode with no group named resolves to `default`; groups that ship
alone resolve as today. Lane groups' PR documents stay `not-opened` and Phase 3 keeps them off the board.

*How to review* lists each phase: Outcome, files to touch, and its commits found by
`--grep "^\[handoff\] <spec> phase <id>"` (Phase 4's subject) over `origin/<default>..feat/<spec>`, plus
that handoff's lane commits.

Once every lane is done the babysitter is the only writer of main into `feat/<spec>`. It fixes review
comments itself: there is no group's last phase to relaunch.

## Deliverables

- [ ] `pr resolve` / `pr status` / `pr merge` resolve no group named to group `default` (`feat/<spec>`) in spec-branch mode
- [ ] `pr open <spec> [default]` from `feat/<spec>`: title and body over every phase outside ship-alone groups
- [ ] The `default` PR document matched by branch (board on); `pr merge` of it clears `spec-branch:` and `ship-alone:`
- [ ] `pr hold --how-to-review` text with one section per phase: Outcome, files, and the commits of its `[handoff] <spec> phase <id>` lane
- [ ] `launch babysit <spec> default` places a tree on `feat/<spec>`; claim `pr-default` accepted by `takeRefusal` in spec-branch mode; `claimKey` maps it
- [ ] `babysit.md`: the final PR merges `origin/<base>` and is the only writer of main into the spec branch once lanes are done; it fixes review comments in its own tree

## Phase-local notes

- `gotcha-changes-requested-outlives-the-fix`: one relaunch per review id, as today.
- `gotcha-pr-status-verdict-none-is-not-no-pr`.
