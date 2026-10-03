---
date: 2026-10-02
phase: 10
chunk: shell-status
---

# Phase 10 recon + preflight — background shells

*Source of record — do not edit.* Inline; the seam was read in phase 7.

- `~/.claude/sessions/*.json` on 2026-10-02 (CLI 2.1.288): `status` values `busy` (2), `idle` (7), `shell` (2).
  The academy phase 4 session read `"status":"shell"` after its turn ended with "1 shell still running".
- `sessions/live.ts:36` mapped everything but `idle` to `busy`; `trees/find.ts` `treeHolder` treats `busy` as
  mid-turn, so a handed-off session with a local stack up held its tree.
- `treeHolder` already compares `status === "busy"`; only the parser and the types change
  (`LiveSession.status`, `board/model.ts:14` `SessionCell`). The board cell prints the status verbatim
  (`board/cells.ts` `sessionCell`), so it shows `shell 3m`.
- Preflight: no findings. Unknown values keep failing toward `busy` (gotcha
  `gotcha-claude-session-files-are-undocumented.md`).
