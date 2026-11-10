---
kind: decision
applies-to: [general]
created: 2026-11-09T01:37:56-08:00
---

# Native hosts own plugin updates; Phase 5 remains withdrawn

Anton withdrew Phase 5 as executable work. Preserve its historical ID/file. Native hosts own installation/update selection; this plugin uses the existing manifests, version helper and release process.

No custom freshness checks, release-state records, coalescing helper, updater, installer, scheduler, activation coordinator or freshness diagnostic. Fresh-session recovery handles old resource paths invalidated by a native update; custom retention remains deferred.

The adoption-first replan moves minimum entry/assets into Phase 2 and full native binding/hooks into Phase 4. Feature-specific install/version checks live in ../pr-opening.md; Phase 6 consolidates full parity/release enforcement after the operational increments. This is sequencing, not a revived distribution subsystem.

Historical research remains immutable; this decision does not establish native acceptance, change a live install or authorize publication.
