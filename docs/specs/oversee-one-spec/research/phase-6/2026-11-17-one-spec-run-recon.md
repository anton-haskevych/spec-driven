# Phase 6 recon — the overseer runs a spec end to end

Single inline pass: the seam is mode docs plus one brief field; Stage B made it obvious.

## Seam

- `skills/spec/tools/crew/brief.ts:14` `renderBrief` — pure; gains an optional spec-branch line. Its caller is
  `tools/commands/crew/launch-session.ts:61`, which already has the placed branch (`placed.value.branch`,
  `trees/place.ts:25`) and `deps.runner`.
- Whether a placed branch is a lane: `laneOf(layout, branch)` (`pr/groups.ts`), the spec branch `branchOf(layout,
  "default")`; the same pair is inlined in `crew/lane-close-out.ts:31-33` (`laneTarget`). The layout comes from
  `loadSpecLayout(dir, runner, spec, { fetch: false, now })` (`pr/load-layout.ts:11`): the tick fetched already.
- Only execute launches of a lane get the line: a ship-alone group PRs to main (no merge-back), and the final PR's
  babysitter follows babysit.md → spec-branch section (phase 5).
- `oversee-crew.md` has no `--spec` text at all yet; its intro says "It takes no spec." The *One spec* section is new.
  Tool lines it leans on: `crew overseer|start|tick --spec` (SKILL.md → Crew), `ready <spec> --order` (2.62.0),
  `phase set|split`, `crew start --spec [--ship-alone D,E]` (`commands/crew/spec-branch.ts`), the tick's
  `PR moment: <spec> final PR` (`crew/tick-step.ts:53`) and `PR group ready` suppressed for lanes (`tick-step.ts:42`).
- `execute.md` §1 *Decide when to push* → `spec.ts push` refuses on a lane (`pr/load-layout.ts:21` `laneRefusal`,
  used by `commands/push.ts:14` and `commands/publish-docs.ts:17`). A tick on the record still pushes the lane branch
  to its own name, so per-commit pushes happen there.
- `handoff.md` §3 runs `publish-docs`/`push`; §4 prints the `Crew:` line in the transcript only. Close-out falls back
  to the `[handoff] <spec>` commit body on `origin/<lane>` (`lane-close-out.ts:41-43`), so the Crew line must be in
  that body and the commit must be pushed by `merge-back --push` (which pushes the lane first).
- `crew check <id>` reads no record (`gotcha-crew-check-reads-no-record`): the one-spec section tells the overseer to
  trust the tick's verdict for lane workers.

## Reuse

- Brief stays data + one pointer; the rules live in execute.md *Crew worker* and handoff.md §4 (crew-brief.md).
- Lane test: reuse `laneOf` + `branchOf`; no new layout logic.
- `commands-table.test.ts` already validates every `tools/spec.ts <cmd>` a mode file names, so new `merge-back` /
  `ready` mentions are checked for free.

## Testing issues

- `launch-session.ts` has only refusal-path tests (`crew-launch-machine.test.ts`, busy placement); a full launch
  needs `claude --bg`. Keep the lane decision in a pure helper (layout + branch → spec branch) and test that plus
  `renderBrief`; the wiring is one call.
- No file near the 250-line cap: brief.ts 30, launch-session.ts 107.
