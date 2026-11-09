---
needs: [1]
pr: A
---

# Phase 2 — First usable local Codex execute and handoff

## Outcome

Anton can use a source-packaged Codex entry to complete a real code chunk, commit a local handoff and resume it in a fresh session. This is an explicitly restricted adoption pilot; full managed workflow parity remains required in the later phases.

## Files to touch

Existing runtime identity/readers and configured context commands; minimal native entry/manifest assets; shared spec entry/execute/handoff capability handling; focused bootstrap, dispatch and installed-candidate fixtures.

## Completed foundations

- [x] Add explicit initiating-runtime resolution and qualified identity, preserving legacy Claude decoding and refusing conflicting or unavailable identity evidence.
- [x] Implement injected, paginated Codex loaded-session reading and per-source coverage composition.
- [x] Add an opt-in read-only context entry using qualified claim inputs, one resolved identity and one configured snapshot, preserving exact-source unknown coverage in phase selection.
- [x] Back the opt-in context command with versioned claim documents, explicit legacy Claude source binding and one disk read for both inference and held phases; refuse unknown versions/unreadable records and retain unknown fields.
- [x] Add SourceRef binding and a single source-qualified identity equality/key helper.
- [x] Extract narrow dependency objects for contextPack and placeTree before adding native ports; separate async context input loading from pure pack/phase rendering.

## Connected entry

- [x] Bind a native Codex entry to createStoredRuntimeContextCommand and the existing dispatcher using one explicitly supported local source; verify actual initiating ID/cwd and candidate asset revision before work.
- [x] Enforce the pilot's allowed operations before command dispatch; update the shared mode capability contract so automatic execute/handoff actions cannot fall through to Claude defaults or report skipped ownership as success.
- [x] Package the minimum entry/assets in source using existing manifests/version tooling; add fixture coverage for entry, identity refusal and unsupported actions, keeping Claude dispatch behavior unchanged.

## Complete the local cycle

- [x] Validate exclusive separate-clone/common-directory isolation with existing Git primitives and an actual legacy prune-enumeration fixture. Refuse same-common-directory managed use until Phase 2b; disable remote claim mirroring and all unready automation.
- [x] Invoke existing lesson recall before edits and per-file/doctor validation after spec edits while native hooks are pending; prove invalid-edit feedback and correction without a new validator.
- [x] Preserve authoritative native parentage and permit verified recon descendants while retaining independent-occupant refusal; prove actual concurrent child recall/doctor, independent-root refusal and recovery — `research/phase-2/2026-11-09-subagent-parentage-native-results.md`, fix fc10395.
- [ ] Support local progress/ledger/in-flight updates and commits through shared workflow rules, then explicit fresh-session pickup. Report unavailable push/publication, ownership, launches and cleanup honestly; do not mark the full managed handoff complete.
- [x] Add the installed-candidate/local-cycle acceptance driver and focused Claude regressions. Resolve obsolete automatic-update/retention capability wording only where touched; introduce no updater.

## Implementation guidance

Compose the tested functions already present; do not re-extract context/placement or build another runtime framework. Preserve raw claim documents separately from policy values. Propagate async only through the I/O paths this slice actually uses.

The pilot is one exclusive checkout with a distinct Git common directory, outside the legacy clone's linked-worktree/prune domain. An assigned sibling worktree, marker or Codex-only prune refusal is insufficient. Use ordinary Git operations; build no clone/profile manager. No global/default Claude restrictions change. Shared mode capability handling defines the temporary pilot once; host bindings contain mechanics only.

Remaining shared claims, board, placement, pruning and remote identity work is in Phase 2b. Full interactive modes/personas/native hooks are in Phase 4; normal launching in Phase 3; worker records/control in Phase 3b. The full scope is tracked in ../workflow-parity.md.

## Phase-local notes

The six completed foundations and three connected-entry items are fixture-tested implementation, not installed acceptance. `tools/codex.ts` binds actual candidate content, qualified identity and the existing native probe/snapshot to `createStoredRuntimeContextCommand`. Its read-only checks refuse missing target/revision/identity, unsupported source/home, shared common directories, linked pilot checkouts and other observed Codex occupation. Every command also refuses existing stored claims using the same context disk rows: a phase hint cannot bypass missing managed ownership. `runtime/workflow-capabilities.ts` guards before dispatch; canonical modes follow `skills/spec/capabilities.md`. Raw `spec.ts` from Codex refuses; Claude dispatch stays unchanged. The entry reports no acquired ownership. Read ../in-flight/phase-2.md for exact state and the assigned tree.

The copied candidate fixture runs the actual packaged CLI with a disposable Unix socket/CLI response fixture and no `.git` or `node_modules`. It now exercises explicit recall, existing per-file invalid-edit feedback/correction, phase/progress/ledger/in-flight updates, local code check/commit and fresh-process pickup with a different synthetic ID. It is not a native install, model-driven execute/handoff cycle or fresh native pickup. The frozen historical enumerator proves separate-clone exclusion beside an actually nominated linked worktree with the same origin/HEAD; no removal runs. No source claim is written or remote action enabled.

`doctor <spec> --file <spec-relative-path>` reuses `issuesForWrittenFile`; absent/outside files refuse. Shared context/park advice follows the declared workflow, retaining unchanged Claude hook/push guidance. `skills/spec/installed-local-cycle.md` is the packaged agent-operated real acceptance driver. The local-handoff/fresh-pickup item remains open until both real model sessions pass; the implemented source cycle cannot tick that acceptance. Phase 2 and its native PR gates remain open.

Installed evidence must identify the candidate files actually executed. Do not infer candidate use from a catalog version or the already installed cached skill. Preserve all existing proof fixtures and do not repeat platform/login/retention research.

Running the real self-use scenario is a Phase 2 PR gate in ../pr-opening.md; building its entry/driver belongs here. Approval for a live personal installation/publication is separate from this planning change.

## Real installed run — 2026-11-09

The scoped native candidate was installed under Anton's authorization, exercised by two actual model sessions in the separate pilot, then removed through native operations. Useful code work, local handoff, exact committed-HEAD fresh resume, Stage A halt and separately confirmed Stage B were observed. See `../research/phase-2/2026-11-09-native-acceptance-results.md` for exact IDs/revision/commits and restored install state.

The canonical first attempt failed: execute spawned its own recon subagents, then the blanket occupation guard refused recall. The completed local cycle required a controller-authorized serial-recon override. This does not pass default execute acceptance; the open local-cycle item, Phase 2 and PR gates remain open. Subagent spawning itself worked and remains critical to full parity. Resolve the parent/child classification gap with existing workflow semantics before retrying canonical acceptance; do not make serial recon a permanent restriction or introduce another ownership system.

Pilot-only code/handoff/evidence commits end at `6931a26`; they are not integrated into this assigned implementation tree. Both model-written reports and learnings remain in that clone. The frozen installed candidate did not contain the source fix tested there. Source fixture checks, actual installed model work and unresolved default-flow acceptance remain distinct.

The subagent-specific rejection is now corrected in source commit fc10395 and independently verified with a newly installed exact candidate: two concurrent native recon children remained loaded through successful recall/doctor; an unrelated root still refused; doctor recovered after that root closed. See `../research/phase-2/2026-11-09-subagent-parentage-native-results.md`. No serial override is required by the corrected entry. This targeted proof closes the parentage deliverable, while the open consolidated local-cycle/PR gates remain unchanged. Full agent/persona/hook/shared-workflow parity is still required in its owning phases.
