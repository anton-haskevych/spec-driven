---
kind: decision
applies-to: [phase 4+]
created: 2026-10-01T15:57:45-07:00
---

# Board timing: cold 3.3 s accepted for PR A; measure PR B against the same split

PR A's gate targeted < 3 s without gh. On CRM: warm 2.2 s, cold 3.3 s (fetch 0.6 s + archive 0.7 s +
worktree scan 0.9 s + loaders 0.6 s), offline 2.2 s. Anton accepted it and merged (#8, 2.35.0): cold only
happens when origin moves, and the fetch part is network.

Phase 4 adds two gh calls (~2.3 s, wave 1) against PR B's "< 5 s total" target. Run them concurrently
with the worktree scan, not after it, or the cold path lands near 5.6 s.
