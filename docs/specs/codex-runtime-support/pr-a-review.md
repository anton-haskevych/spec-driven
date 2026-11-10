# Add isolated native Codex execute and handoff

Release 2.52.0 review content for `feat/codex-runtime-support-pr-a`; base `origin/main` is `22e7ec7`. Anton authorized a non-draft PR and squash merge once CI is green. The canonical version helper from current main sets all three release declarations.

## Proposed PR description

Add a source-packaged Codex entry that can execute one explicit spec/phase in an exclusive separate clone, update local progress, commit a restricted handoff and resume in a fresh model session. Bootstrap verifies the actual candidate bytes, initiating native identity/cwd and configured-source coverage before reusing existing context and validation tools. Unready managed actions refuse before dispatch.

Native parentage distinguishes the coordinator's recon descendants from competing sessions. Canonical real-path checks also catch symlinked occupants. Existing Claude behavior and full managed defaults remain intact; the broader Claude-to-Codex port stays required by workflow-parity.md.

Validation:

- 1,506 Bun tests across 204 files passed, plus typecheck, frozen install without changes and version consistency at 2.52.0 (release metadata bump after code acceptance). Final packaged-CLI diagnostics checks also passed.
- Two real model sessions used the same installed asset revision `cfe50053`: execute with concurrent native recon, useful code integration, explicit invalid-file feedback/correction, actual update/local handoff and independent resume with Stage A halt and separately confirmed Stage B.
- Historical-reader tests retain actual source hashes, an unsafe linked-worktree positive control and separate-clone exclusion. Capability/identity/source/claim refusals and Claude compatibility regressions pass.
- Temporary native install/marketplace removed; 30 preexisting plugins' installed/enabled/version/source metadata restored. Final source doctor/graph/whitespace checks are recorded with gate closure.

Supported pilot configuration: CLI/app-server 0.167.0, Bun 1.4.4, normal configured home and an explicitly assigned separate clone/common directory. Explicit recall and per-file doctor remain required while native hooks are pending. Shared claims/board/worktrees, complete native modes/personas/hooks, publication/managed cleanup/launches and workers remain in later increments.

One copied-package fixture initially exited 1 in the pilot regression run; its cause was not captured. The unchanged isolated and full-batch reruns passed. The failure remains in the acceptance evidence, and the existing assertion now includes stdout/stderr for future diagnostics. This did not become a native-cycle failure or get counted as a passed attempt.

[Final combined native acceptance](research/phase-2/2026-11-09-final-combined-acceptance.md) records exact candidate/host/session IDs, commits, source checks, initial failures and restoration. [PR checks](pr-opening.md) and [full parity inventory](workflow-parity.md) retain authoritative scope and remaining gates.
