---
kind: decision
applies-to: [phase 1, phase 2, phase 4, phase 6]
created: 2026-11-08T23:18:52-08:00
---

# Use native updates; defer seamless old-session continuity

Anton stopped the proposed retention investigation: “This is an edge case. We should not spend too much time on it.” This narrows the earlier version-coexistence requirement. Use the native scoped install/update flow; fresh sessions use the installed release. Uninterrupted old-session execution across an update is deferred. Starting a fresh session is the recovery path when a native update invalidates old helper paths.

Do not build per-session resource copies, a retention subsystem, an external bootstrap or another activation selector for this edge case. No further probing agents, isolated sign-in or active-model-across-update experiment is needed for this deferred guarantee. Preserve the existing observations/tests as evidence of the known limitation; do not mark missing proof as passed.

The core prep/review/execute/handoff loop, source-qualified ownership, scoped hooks and worker lifecycle remain the priority. Native hook trust, incompatible writer-contract safety, and honest supported-host coverage remain required. This scope reduction does not authorize unsafe ownership, later phases, live installation, push or publication. It supersedes `decision-plugin-updates-preserve-session-versions.md` only as a release requirement; historical evidence stays unchanged.
