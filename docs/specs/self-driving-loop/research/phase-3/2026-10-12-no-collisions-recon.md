# Phase 3 recon — parallel sessions stop colliding

## Seam

- `core/spec-state.ts:45-49` `specStateFrom` reads `in-flight.md` through a `ReadSpecFile` (path-in-spec reader; disk or in-memory). No listing in that abstraction, so per-phase files are read by known name: `in-flight/phase-<id>.md` for each phase in progress.md, `in-flight/pr-<group>.md` for each phase `pr:` group, then the legacy `in-flight.md`.
- Only consumer of `SpecState.inFlight`: `context/packs.ts:93-96` `inFlightBlock` (resume pack :50, execute pack :75), clipped at `IN_FLIGHT_LIMIT` 2000.
- `doctor/run.ts:74-77` reads `in-flight.md` from disk; `doctor/phases.ts:29-33` `checkInFlight(file, text, everyPhaseDone)` is file-agnostic — call it per file (`core/files.ts` `markdownFilesIn` lists a folder, missing-safe).
- `graph/suggest.ts:12` `TOP_FILES` lists `in-flight.md`; `specProseFiles` adds `phases/` via `markdownFilesIn` — mirror for `in-flight/`.
- Board/base cache never read in-flight (no `BASE_LAYOUT` bump).
- Prose: SKILL.md (tree :215, artifacts :245, :278, semantics :456-461, pr-opening :467, :500, on-demand :523, Doctor :110, overseer :84), handoff.md (:7, :20, :54-58, :87-105, :179-182), update.md (§7 :131-138, :175, :3/:68/:100), execute.md (:28, :125, :143, :164, :203, :208), resume.md (:5, :17, :23-25, :74), list.md (:21), create.md (:168, :208, :363), legacy-layout.md:57, babysit.md:89, spec-handoff/SKILL.md description.
- Out of bounds: `oversee-crew.md:179-180` reads workers' `in-flight.md` from origin; oversee-crew-spec phase 4 owns that file now.

## Reuse

- `markdownFilesIn` for the folder scan; `clip` for the budget; `PhaseState.edges.pr` for groups.

## Testing issues

- `tests/spec-state.test.ts:17` asserts `inFlight` undefined; becomes an empty list.
- `context.test.ts` has a disk fixture (`write(...)`) — add per-phase files there.
- `doctor.test.ts` tests `checkInFlight` only as a pure function; per-file doctor behaviour needs a small pure `inFlightIssues(files, everyPhaseDone)` or a disk fixture. Files all well under 250 lines.
