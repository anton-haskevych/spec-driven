---
kind: decision
applies-to: [phase 2+]
created: 2026-11-11T19:41:31-08:00
---

# `progress.md` is never deleted; `record export` is the way back

- A joined spec keeps `progress.md` as a stub: the banner and the manual read line. Routing, *Preconditions*,
  `prep.md`, cloud and no-Bun sessions all tell a spec from a prep folder by that file. A spec created with
  the board on gets the stub from birth.
- `join --tidy` removes the frozen lines only when no worktree of this clone **and no remote
  `feat/<spec>*` branch** differs from the default branch in those files, checked per file.
- `record export <spec> [--unjoin]` writes the lists back into files. It is the rollback for one spec and for
  all of them. Turning `board.record` off only stops more specs joining.
- Joined decides how a spec is read, in every tree. The setting is read from the default branch.
- The board needs `docs: main` in this version; `join` refuses otherwise.

**Rejected:** tidy deleting `progress.md` (the original plan); "turn the setting off" as the rollback; reading
the setting per checkout. Source: review 2026-11-11, R7, R9, R10; ROADMAP "every flow keeps its manual read
path".
