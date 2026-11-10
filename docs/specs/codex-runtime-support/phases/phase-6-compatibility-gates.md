---
needs: [2b, 4, 3, 3b]
pr: E
---

# Phase 6 — Full parity closure and release enforcement

## Outcome

Every existing spec workflow feature works on Codex in the supported configuration, and Claude has no regressions. A repeatable harness and CI gates enforce the complete port as the plugin evolves.

## Files to touch

Existing feature-owned contract/native fixtures; tools/tests integration runners; .github/workflows/plugin-metadata.yml; existing packaging/version checks and supported-runtime documentation.

## Deliverables

- [ ] Consolidate the behavior/native acceptance drivers shipped with Phases 2, 2b, 4, 3 and 3b into a repeatable suite; do not rebuild them or postpone basic feature checks until this phase.
- [ ] Close every remaining row in ../workflow-parity.md across public modes, all 21 command families and cross-mode behavior, with explicit Claude/Codex evidence.
- [ ] Wire deterministic contracts, version/package drift and import-boundary checks into CI; keep absent native runtime/credentials explicitly pending rather than counting a skipped probe as parity.
- [ ] Add the release evidence manifest: exact executed plugin revision/assets, CLI/API versions, supported environments, scenario results and native fixture cleanup.
- [ ] Complete supported-configuration, native-install and fresh-session recovery documentation through existing commands. Include compatible migration/rollback limits; build no updater, clone/profile manager or retention subsystem.

## Implementation guidance

All existing Claude features remain required on both runtimes. A restricted pilot, unsupported required operation or fixture-only native claim cannot close this spec. If native limitations prevent a required feature, report the exact gap and get an explicit product decision; do not silently trim parity or declare good-enough.

Preserve existing historical fixtures and observed limitations. Actual legacy readers, mixed-source IDs, shared-workspace revalidation, worker target/slot races, lost control responses and later user continuation stay in their feature-owned suites and run here too. Headless evidence cannot stand in for unexercised terminal/UI behavior.

Final real-host acceptance, rollout and publication remain in ../pr-opening.md. This phase implements repeatability/enforcement, not a standalone manual-QA phase.
