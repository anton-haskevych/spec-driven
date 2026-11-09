---
kind: decision
applies-to: [general]
created: 2026-11-08T19:10:00-08:00
---

# Release behavior belongs in versioned source artifacts

All host adaptations ship in source and self-contained packages. Identify the actual candidate/installed assets and revision executed by acceptance sessions; a catalog version or manifest string alone does not establish that this branch ran. Keep native trust authoritative.

Reuse existing manifests, scripts/version.py and the scoped native publish/install process. Native hosts own selection and updates. Phase 2 ships minimum entry/assets, Phase 4 adds full binding/hooks, and Phase 6 closes release enforcement. Existing sessions may need fresh-session recovery after native old-path invalidation.

Rejected: cache-only patches, another host's cache/node_modules, automatic reruns, custom activation selection, staging/freshness journals or a retention subsystem. Earlier retention/staging proof obligations are superseded by decision-use-native-updates.md and decision-native-host-updates-only.md; do not revive them through this entry.

Keep required writer-contract transition/rollback safety with shared-state activation in Phase 2b and required hook trust with Phase 4. These are capability acceptance, not permission to build a second update authority.
