# Phase 3 recon — add and split (chunk 1)

Paths are relative to `skills/spec/tools/`. Inline recon: phase 2 built and mapped this seam today.

## Seam

- `commands/phase.ts:13-16`: the `ACTIONS` table gets `add` and `split` rows. `resolveSpec` and `parseFlags` are reused as they are.
- `phases/find-phase.ts`, `phases/locate.ts` (`locatePhaseLine`, `locateOpenItem`) and `phases/validate.ts` (`issuesIntroducedBy`) are the building blocks (ledger `domain-writer-building-blocks.md`).
- `core/phase-title.ts:23` `comparePhaseIds` and `:57` `samePhase` handle id ordering and collisions (`decision-phase-ids-never-retire.md`).
- `core/progress.ts:20-27` `parsePhaseLines` drops depth > 0 tasks silently, which is the doctor warning's source. `outlineMarkdown` gives `depth`.
- `doctor/run.ts:64-74` `progressIssues` is where the indented-line warning joins.
- `doctor/phase-edges.ts:7` `phaseEdgeIssues(state, nodes)` resolves `needs` refs, local and `spec#id`. It isn't in `issuesIntroducedBy` today.
- `graph/nodes.ts:27` `loadNodes` gives every spec's `relations` (CLAUDE.md `needs/supersedes/related/part-of` with `phases`), and `graph/relations.ts:41` `phasesInRef` matches a ref against ids. Other specs' *phase* edges (`needs: [spec#7]`) need each spec's `loadSpecState`.
- Template: `create.md:282-310` (flat shape). Phase 9 adds `**Outcome:**`; the TS template carries it now.

## Reuse

- There's no slug helper in tools/. `slugify(title)` is new: lower-case, non-alphanumerics → `-`, trimmed. It gets its own test.
- The phase line format is ``- [ ] Phase <id> — <title> → `phases/phase-<id>-<slug>.md` ``, matching every progress.md in the repo.

## Testing-issue estimate

- Writers read disk through `loadSpecState`. Tests use `tests/tree.ts`, one tree per test.
- `issuesIntroducedBy` doesn't see edge errors, so `--needs 99` would pass. Extend it with `phaseEdgeIssues` (nodes injected).
- `commands/phase.ts` is at 76 lines. With add and split it stays under ~150.
