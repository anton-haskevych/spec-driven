---
kind: decision
applies-to: [phase 3+, load-bearing]
created: 2026-11-13T15:46:11-08:00
---

# One `GitSeams` bundle on the deps that really carry git, not a field per adapter per type

Review 2026-11-13 (`reviews/2026-11-13-seam-reach.md`) found the first draft's seam couldn't reach the code the
migrations need. Its `recordAccess` union and fields on `PhaseDeps`/`JoinDeps`/`RecordDeps`/`BoardDeps` missed:

- the board loader, which takes `BoardRunners` and runs mainline fetch, archive and the worktree scan;
- read helpers that take a bare `runner` (`readPlansAt`, `readLocalPlans`, `plansOnDemandAt`);
- 5 of 6 land callers (`landSpecField`, `deployedOnMain`, `landFocus`, `landBanner`, `mergePr`).

The fix:

- **One bundle.** `core/git-seams.ts` defines `GitSeams`: `recordPorts`, `mainline`, `land`, `remote` and `boardBase`.
- **One field.** Each carrier gets `seams?: Partial<GitSeams>`: `BoardRunners`, `PhaseDeps`, `JoinDeps`, `RecordDeps`, `FieldWriteDeps` and `MergeDeps`.
- **Deps, not bare runners.** The helpers above take deps instead of a bare runner or git.
- **Ports only.** `recordPortsOf` resolves ports and never the default branch. Commands keep their own branch lookups, so session end, record sync, record-export and join-from-tree stay origin-only.
- **Trace first.** Phase 3 starts by recording every git argv the phase 4–8 targets reach. That trace, not this note, is the final list of what is a seam and what `gitStub` answers.

Phase 3 was split into 3 (record ports, reads, helpers) and 3a (board, land, remote). Phases 4–8 all need 3a; the
review file's "phase 8 needs only 3" was wrong (merge and trees-place go through land and board load).
