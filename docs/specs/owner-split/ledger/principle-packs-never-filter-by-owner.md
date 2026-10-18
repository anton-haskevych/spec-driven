---
kind: principle
applies-to: [general]
created: 2026-10-17T20:59:58-07:00
---

# Packs never filter by owner

A resume or execute pack is for a spec the person named, claimed or is standing in (rule 7:
deliberate beats filtered). Don't filter its ready phases by owner. Filtering before `firstUnheld`
empties the list and falls through to "All phases complete — see pr-opening.md"
(`commands/context.ts` `noPhaseReady`, `context/packs.ts` `nextChunkAbsent`), sending the session to
the PR gate of an unfinished spec.

Owner filtering belongs only where work is picked for someone: the crew (`pickRows` + the placement
gate) and `board ready --for`.
