# Phase 5 preflight — packs, board, wiring (items 4–6)

## Findings that change the plan

1. **The pack must ignore the caller's own claim.** After `claim take`, execute §1 re-runs
   `spec.ts context execute <spec>` on a refusal; a session that holds 5 and re-packs would be told 5 is taken.
   Read `CLAUDE_CODE_SESSION_ID` and skip only other sessions' live claims.
2. **Claim status belongs in the loader, not the lanes.** `claimStatus` needs sessions + every worktree + base
   states; `buildBoard` is pure and sees sessions as `"local"` under `--local`. `loadBoardInputs` computes
   `claims: { claim, status }[]` (status `unknown` under `--local`), so lanes, joins and attention stay pure.
3. **Holder display reuses the session cell.** `design.md` → *Rows* has no holder column: a claimed row's
   session cell comes from the claim's session (`busy|idle`, or `closed` for a closed claim). The holder name
   goes in `FlightRow.holder` (JSON, for agents). Terminal layout unchanged.
4. **`render.ts:81-86` attention fallthrough.** Add an explicit `claim` branch:
   `claim by a closed session   <spec> · <phase> → resume or release` (design.md example).
5. **Context pack in a non-git dir.** `claimsDir` fails → no claims; the pack is unchanged. `claim take`
   remains the race guard (phase entry → *Packs*).

## Amendments

1. `claims/live.ts`: `liveClaimsOfOthers(projectDir, deps) → Map<"spec#phase", Claim>`, the only IO the packs add;
   `contextPack` takes it as an injected function (default reads the system).
2. Execute pick and resume next chunk use the first ready phase without another session's live claim; the
   note names skipped phases: `skipped 5 (in flight: <holder>)`.
3. `neighborhoodReport(nodes, name, projectDir, inFlight?)` → overlap line appends `(in flight: <holder>)`.
4. `BoardInputs.claims`; `flightRows` adds claim-only rows (`next: executing`); `attachSessions` joins by claim
   sessionId first, `closed` claims → session cell `closed`; `needsYou` adds `{ kind: "claim" }` for closed claims;
   `forceLive` = claim workspaces.
5. Docs: execute.md §1 first step, handoff.md release after push, SKILL.md Claims bullet + Next-chunk note.

## Canon

Clean Code / SOLID: Bites only on SRP (status computed once, in the loader; render stays a view) and DIP
(pack takes the claims reader as a function, like `ProcStarts`). Clean Architecture: lanes/joins/attention import
claim *types* only. DDD skipped (tool internals).

## Decisions for you

None.
