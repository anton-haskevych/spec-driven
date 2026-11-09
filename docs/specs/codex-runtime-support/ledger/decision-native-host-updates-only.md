---
kind: decision
applies-to: [general]
created: 2026-11-09T01:37:56-08:00
---

# Native hosts own plugin updates; withdraw Phase 5

Anton confirmed the proposed trim and asked why it had not been applied. Withdraw Phase 5 as executable work. Keep its historical ID/file, move native manifest/hook/required-file wiring into Phase 4, and put normal install/version checks in the existing release checklist. Phase 6 depends directly on Phase 4.

No custom freshness checks, release-state records, coalescing helper, updater, installer, scheduler, activation coordinator or freshness diagnostic. Use native host mechanisms and the existing release process. Host defaults need not be identical to justify this boundary: Claude has marketplace auto-update settings; Codex provides native refresh/install mechanisms. This plugin does not replace or supplement them with polling.

This corrects the residual update requirements left after the earlier scope cuts. Historical research is preserved; neither a native acceptance test nor a live update is claimed. Phase 2 implementation continues unchanged.
