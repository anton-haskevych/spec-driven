# Isolated native installation evidence

Actual CLI/app-server 0.167.0, an owned disposable CODEX_HOME and a Git marketplace served only on loopback. The baseline was the complete historical `22e7ec7` package, not the relocated historical-reader fixtures. Five cache files matched their Git objects before upgrade; their SHA-256 values are retained. The candidate was explicitly synthetic `2.51.0-phase1.1`, adding only a harmless native hook and fixture version changes. Auth/trust was never copied or accepted.

Native selected-marketplace upgrade → selected-plugin add succeeded. Catalog discovery and localVersion moved to the candidate path. The original 2.51.0 cache was removed even though the original client still held a started native thread, whose loaded hook list remained empty after the candidate was installed. This falsifies relying on native cache retention for all already-started threads. No model turn was started in this scratch home; active model execution and native CLI/desktop resume fences remain unverified.

The new thread's bundled hook was enabled but untrusted. This records trust metadata only; no trusted-hook execution, changed-script re-review or model-visible feedback is claimed. Both empty owned threads were archived, and the exact standalone server/loopback HTTP children were stopped.

The tests are executable assertions about these observations and their limits; they do not invoke a native installer. Full reproduction, errors and the parked decision are in `docs/specs/codex-runtime-support/research/phase-1/2026-11-08-isolated-install-observations.md`.
