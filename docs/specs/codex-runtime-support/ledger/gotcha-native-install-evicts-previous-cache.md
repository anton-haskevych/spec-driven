---
kind: gotcha
applies-to: [phase 1, phase 4, phase 5, phase 6]
created: 2026-11-08T20:00:00-08:00
---

# Native selected-plugin installation does not prove old cache retention

An isolated real CLI/app-server 0.167.0 Git-marketplace install of historical 2.51.0 was upgraded using the existing scoped marketplace upgrade → selected plugin add flow. Installing the fixture candidate removed the old version's cache directory while an already-started native thread remained held by its original client. That thread's loaded hook list stayed old; the fresh candidate thread saw the new hook. No active model turn was run, so in-use execution after eviction and per-thread loaded-release attestation remain unverified.

Do not assume versioned native paths are retained until old plugin sessions end. The cache observation remains valid, but its effect on running old-session scripts is unproven. Anton has now chosen Claude-style version coexistence; the prior recommendation to wait for every old session was not adopted. See `decision-plugin-updates-preserve-session-versions.md`. Next prove actual old-session execution/resource access during an update. Automatic activation is not implemented or enabled; no hand-edited cache retention or parallel activation authority is approved.

Materialized localVersion and force-reloaded skills are installation/catalog observations, not loaded-session identity. Native enabled:true hook metadata may still be untrusted; no hook execution/trust bypass was performed. Positive trust, native CLI/desktop old-session reentry and safe rollback remain required proofs. See immutable isolated-install research and sanitized executable fixtures for scope, IDs, errors and cleanup.

Session 3 extended this with actual native `thread/shellCommand` execution of the historical version helper and `spec.ts settings`: both succeeded before selected installation, then their identical old paths failed (exit 2 missing file; exit 1 missing module) in the same owned native thread. Candidate paths succeeded in a fresh thread. This is concrete deferred-resource failure for controller-selected historical paths, **not** a model-loaded plugin proof: all command items were userShell with null plugin attestation, and isolated account/read reported authentication required with no account. No model turn ran. See `research/phase-1/2026-11-08-resource-execution-observations.md` and the distinct `codex-resource-execution` fixture.

Do not select native cache paths as the immutable execution location without an additional supported guarantee. The proposed owner-tracked bundle outside the cache is an unapproved feasibility fork; script retention alone cannot fix old bundled hook commands that still resolve the evicted PLUGIN_ROOT. Preserve native version selection and trust, and keep managed/update capabilities disabled until the complete route is proved.
