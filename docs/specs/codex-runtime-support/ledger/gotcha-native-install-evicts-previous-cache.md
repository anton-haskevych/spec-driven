---
kind: gotcha
applies-to: [phase 1, phase 4, phase 5, phase 6]
created: 2026-11-08T20:00:00-08:00
---

# Native selected-plugin installation does not prove old cache retention

An isolated real CLI/app-server 0.167.0 Git-marketplace install of historical 2.51.0 was upgraded using the existing scoped marketplace upgrade → selected plugin add flow. Installing the fixture candidate removed the old version's cache directory while an already-started native thread remained held by its original client. That thread's loaded hook list stayed old; the fresh candidate thread saw the new hook. No active model turn was run, so in-use execution after eviction and per-thread loaded-release attestation remain unverified.

Do not assume versioned native paths are retained until old plugin sessions end. The cache observation remains valid, but its effect on running old-session scripts is unproven. Anton has now chosen Claude-style version coexistence; the prior recommendation to wait for every old session was not adopted. See `decision-plugin-updates-preserve-session-versions.md`. Next prove actual old-session execution/resource access during an update. Automatic activation is not implemented or enabled; no hand-edited cache retention or parallel activation authority is approved.

Materialized localVersion and force-reloaded skills are installation/catalog observations, not loaded-session identity. Native enabled:true hook metadata may still be untrusted; no hook execution/trust bypass was performed. Positive trust, native CLI/desktop old-session reentry and safe rollback remain required proofs. See immutable isolated-install research and sanitized executable fixtures for scope, IDs, errors and cleanup.
