---
kind: gotcha
applies-to: [phase 2, phase 2b]
created: 2026-11-09T03:18:26-08:00
---

# Resolve native cwd aliases before judging pilot occupation

The pilot root is canonical, but another native session can expose a symlink spelling of its cwd. Raw equality/prefix checks in the original entry accepted that occupied checkout. Resolve non-self cwd values with realpath, use segment-aware relative containment, and refuse unresolved/relative evidence rather than calling the checkout free.

`runtime/codex/entry.ts` keeps this at the native pilot boundary and reuses qualified `sameSession`; equal IDs on another runtime/source remain other sessions. Real filesystem tests in `tests/codex-entry.test.ts` cover direct/nested/aliased occupation, unrelated/prefix-neighbor acceptance and missing/dangling/cyclic evidence. Paths are under `skills/spec/tools/`.

This is a bounded pilot fix, not a scanner, shared ownership or mutation-coordination redesign. Phase 2b still requires its full coverage/lease/cutover proof. The first installed attempt used an older frozen candidate while tests exercised changed source; that attempt did not prove installation of the fix.

The combined candidate composes this guard with the observed source-qualified native-descendant exemption; neither replaces the other. Keep both raw native-parent and real-filesystem alias regression groups. Compare actual installed and pilot asset revisions before claiming that tested source is the executed candidate; see `decision-runtime-boundaries.md` and the final combined acceptance report.
