---
kind: decision
applies-to: [phase 2a+]
created: 2026-11-11T23:19:01-08:00
---

# Join and the plan documents as phase 2 built them

What later phases call, and where it differs from `technical.md`:

- **Readers** `readSpecDoc` / `readPhaseDoc` (`plan/docs/`) return `{ doc?, problems }`; `doc` only when there
  are no problems. `validateRecordDoc` (`plan/kinds.ts`) is what `writeRecord` gets as `validate`; it also
  checks the name or id against the path and refuses a path no kind owns. Cross-document checks are
  `specPlanProblems(spec, phases)`: a write that changes the phase list or edges (phase 3a) must call it on the
  plan it is about to write, since the store sees one document at a time.
- **A phase with no tasks** is written with `tasks: []`. "Done = every task done" would make it done; the
  golden test's docs → state treats it as open. Phase 2a's state source must decide this on purpose.
- **Task text** keeps its markdown (`entryTasks` reads raw lines); match with `taskKey`. A ticked item's
  ` — ` note becomes `evidence` only when `hasEvidence` accepts it (a bare sha does not); otherwise the
  matcher retries without the note and the evidence is the tree's full head sha.
- **Edges** come from `phaseNeeds` (`ready/ready-set.ts`), so a joined spec's needs equal what the ready set
  computed from files. `needsDeployed` / `sameFilesAs` are omitted when empty.
- **`deployed`** is the progress line's date (`PhaseLine.deployedOn`), else the join day.
- **SpecDoc** carries focus, owner, ship, stale, dropped through the plugin's readers, but join doesn't fill
  them: phase 6 moves spec fields.
- **Already joined** = the plan sees `spec.json` (`unchanged`) or the create conflicts. The banner date is the
  record's `joinedAt` day, so a re-run lands the same line.
