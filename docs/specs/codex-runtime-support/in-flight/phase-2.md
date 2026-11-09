# In-flight state

**Session ended:** 2026-11-09
**Active phase:** 2 — First usable local Codex execute and handoff

## Source state

Continue the assigned `feat/codex-runtime-support-pr-a` implementation tree at `~/claude-worktrees/spec-driven/codex-runtime-support-pr-a`; inherited HEAD was `0052610841bd1c7d5688fb9e4654260ce33d0515`. No implementation was changed during acceptance preparation. Full parity and all Claude behavior remain required.

Source implementation/local-cycle fixtures are done; the sole open local-cycle item and Phase 2 still require real installed-candidate model work and fresh native pickup. Previous verification at `0052610`: 1495 tests/203 files passed, typecheck, frozen install, version/file/doctor/graph/diff checks passed. This preparation does not rerun or upgrade that result into native acceptance. Historical details remain in Git and `research/phase-2/2026-11-09-local-cycle-{recon,preflight}.md`.

## Prepared acceptance inputs

- Read `research/phase-2/2026-11-09-native-acceptance-preparation.md` for the exact baseline, action/evidence plan and boundaries.
- Frozen package: `~/Downloads/codex-runtime-support-candidate-0052610/plugin`, complete archive of inherited HEAD. Intended revision: `sha256:d6b35e838ac1e361e9640840b65b871fd67293ddcf588b3993b624291c6912ea`, manifest version 2.51.0. `--assets` matched source. This is prepared source, not an installed candidate.
- Ordinary native catalog wrapper at `~/Downloads/codex-runtime-support-candidate-0052610/.agents/plugins/marketplace.json` exposes only `spec-driven@codex-runtime-support-pilot`. No registration/install ran. `native-actions.md`, `session-1.template.md`, `session-2.template.md`, `prepared.json` and generated 0.167.0 schemas are beside it. Fill installed path, authorization and handoff hash only from actual results.
- Pilot clone: `~/claude-worktrees/spec-driven/codex-runtime-support-native-pilot`, clean at inherited HEAD/branch, distinct `.git` common directory, one checkout, no remotes. It is absent from original managed worktree enumeration. No placement/claim/prune was used. Baselines are retained in `prepared.json`.
- Original managed checkout remains `~/IdeaProjects/claude-plugins/spec-driven`; assigned implementation shares that original's common directory and is never the accepted pilot.

## Native preflight and approval boundary

CLI/configured daemon are 0.167.0. Existing read-only probe correlated this controller's actual native ID/cwd with complete configured-source coverage; this is not pilot acceptance. The currently installed `spec-driven@spec-driven-marketplace` lacks `codex.ts`, so the candidate must be installed through authorized native operations before either acceptance model session starts. Existing home-ancestor trust is present; no new trust is requested.

Scoped authorization is still pending: native add of the dedicated local marketplace, selected candidate install, two sequential real model sessions in the pilot, then native removal of only those temporary additions. No unrelated install/default/profile/trust change. Resume Stage A must actually halt; obtain normal confirmation unless Anton explicitly delegates that acceptance confirmation. No approval is inferred from this plan.

## Next bounded work

The first installed model session should reproduce/fix the source-inspected pilot occupation gap: `runtime/codex/entry.ts` compares other sessions' raw cwd strings, missing a second native cwd reaching the pilot through a filesystem symlink. Keep the fix/tests at the native boundary with existing primitives; first confirm the gap is real. Do not implement it in the preparation controller. Follow installed driver recall, recon/preflight, invalid-edit correction, actual update and local restricted handoff. Keep two-session acceptance open at first handoff.

Use existing native transport with explicit `thread/start.cwd` and actual discovered installed skill input. The current TUI `create_thread` inherits the implementation cwd and cannot launch the pilot correctly here. Preserve configured model/permissions/home. Capture exact native thread/turn IDs, requests and useful tool activity. Complete/unload session one before an independent session two; loaded occupancy is a stop, never a reason to change identity or weaken guards. Fresh pickup receives minimal inputs and committed files, not conversation history.

Record session-one and session-two evidence in separate immutable reports and actual logs, retaining Stage A halt/confirmation/Stage B. Pilot commits stay in that clone until separately integrated; preserve this implementation tree. No source/native acceptance checkbox or PR gate was ticked in preparation.

No live personal install/trust change, credential copy, ID alias, legacy placement/claim/prune, push, PR, merge or release occurred. No updater, profile manager, launcher or acceptance framework was added. Shared coordination remains Phase 2b; full interactive modes/hooks/personas Phase 4; normal launches/DX Phase 3; workers/crew Phase 3b. Full parity remains required.
