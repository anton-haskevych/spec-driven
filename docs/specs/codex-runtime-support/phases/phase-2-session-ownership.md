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

## Next chunk — connect the entry

- [ ] Bind a native Codex entry to createStoredRuntimeContextCommand and the existing dispatcher using one explicitly supported local source; verify actual initiating ID/cwd and candidate asset revision before work.
- [ ] Enforce the pilot's allowed operations before command dispatch; update the shared mode capability contract so automatic execute/handoff actions cannot fall through to Claude defaults or report skipped ownership as success.
- [ ] Package the minimum entry/assets in source using existing manifests/version tooling; add fixture coverage for entry, identity refusal and unsupported actions, keeping Claude dispatch behavior unchanged.

## Complete the local cycle

- [ ] Validate exclusive separate-clone/common-directory isolation with existing Git primitives and an actual legacy prune-enumeration fixture. Refuse same-common-directory managed use until Phase 2b; disable remote claim mirroring and all unready automation.
- [ ] Invoke existing lesson recall before edits and per-file/doctor validation after spec edits while native hooks are pending; prove invalid-edit feedback and correction without a new validator.
- [ ] Support local progress/ledger/in-flight updates and commits through shared workflow rules, then explicit fresh-session pickup. Report unavailable push/publication, ownership, launches and cleanup honestly; do not mark the full managed handoff complete.
- [ ] Add the installed-candidate/local-cycle acceptance driver and focused Claude regressions. Resolve obsolete automatic-update/retention capability wording only where touched; introduce no updater.

## Implementation guidance

Compose the tested functions already present; do not re-extract context/placement or build another runtime framework. Preserve raw claim documents separately from policy values. Propagate async only through the I/O paths this slice actually uses.

The pilot is one exclusive checkout with a distinct Git common directory, outside the legacy clone's linked-worktree/prune domain. An assigned sibling worktree, marker or Codex-only prune refusal is insufficient. Use ordinary Git operations; build no clone/profile manager. No global/default Claude restrictions change. Shared mode capability handling defines the temporary pilot once; host bindings contain mechanics only.

Remaining shared claims, board, placement, pruning and remote identity work is in Phase 2b. Full interactive modes/personas/native hooks are in Phase 4; normal launching in Phase 3; worker records/control in Phase 3b. The full scope is tracked in ../workflow-parity.md.

## Phase-local notes

The six completed items above are the original fixture-tested foundations, not installed acceptance. commands/runtime-context.ts and commands/stored-runtime-context.ts are opt-in; default executable ownership remains Claude-only. Read ../in-flight/phase-2.md for current implementation details and the assigned tree.

Installed evidence must identify the candidate files actually executed. Do not infer candidate use from a catalog version or the already installed cached skill. Preserve all existing proof fixtures and do not repeat platform/login/retention research.

Running the real self-use scenario is a Phase 2 PR gate in ../pr-opening.md; building its entry/driver belongs here. Approval for a live personal installation/publication is separate from this planning change.
