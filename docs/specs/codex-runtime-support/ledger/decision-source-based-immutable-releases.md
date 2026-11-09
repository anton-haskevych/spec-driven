---
kind: decision
applies-to: [phase 5+]
created: 2026-11-08T19:10:00-08:00
---

# Release behavior belongs in versioned artifacts

All host adaptations ship in source and self-contained packages. Pin active sessions to immutable release artifacts; stage verified updates for fresh sessions and honor native trust. Rejected: editing cache files, linking another host cache/node_modules, or automatically rerunning an active request. Version identity includes native installed content/revision, not just a manifest string.

Review refinement: native installed/loaded state is authoritative. Reuse the existing plugin-publish scoped native install/verification flow, prove retention/trust in phase 1, and add only demonstrated freshness gaps. A local journal records observations; it never competes with native activation.

Update semantics clarified by Anton on 2026-11-08: existing sessions retain their loaded version while fresh sessions use the newer installed release. Staging does not mean waiting for all older sessions by default; see `decision-plugin-updates-preserve-session-versions.md`. Actual old-session asset availability remains a proof requirement.
