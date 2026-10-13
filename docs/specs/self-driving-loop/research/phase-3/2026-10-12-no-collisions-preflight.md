# Phase 3 preflight — parallel sessions stop colliding

## Findings that change the plan

1. Phase file line refs are stale after phase 2 (SKILL.md grew): in-flight semantics is `SKILL.md:456-461` (not :424-429), pr-opening semantics `:463-470` (not :431-438), Timestamps `:538` (not :506); execute.md §6 step 6 is `:125`, §10 step 3 `:164`. Recon's seam is the truth.
2. `core/spec-state.ts:45` `specStateFrom` reads through `ReadSpecFile` (path → text), which cannot list a folder, and in-memory readers use it (`phases/validate.ts:20`, tests). "Read the folder" must mean: read `in-flight/phase-<id>.md` for every phase in progress.md and `in-flight/pr-<group>.md` for every `pr:` group, then the legacy file. The doctor (`doctor/run.ts:74`) is disk-only and scans the folder, so a stray file name is still checked.
3. More readers of the old path than the phase file lists: `handoff.md:179-182` (Crew line says `needs you <n> (in-flight.md)`), `execute.md:203,208` (Crew worker writes `## Needs you` to `in-flight.md`), `create.md:168,208,363`, `legacy-layout.md:57`, `babysit.md:89`, `skills/spec-handoff/SKILL.md:3`, SKILL.md :84, :110, :278, :500. All wording; update them in the same commit as SKILL.md layout.
4. `oversee-crew.md:179-180` reads a worker's `## Needs you` from `origin/<branch>:…/in-flight.md`. After this phase a crew worker writes `in-flight/phase-<id>.md`, so the overseer would miss its questions. Out of scope here (oversee-crew-spec phase 4 is editing that file in parallel); raise it in the handoff for the overseer.

## Canon against phase 3

| Pass | Rule | Verdict | Consequence |
|---|---|---|---|
| A | Names | Bites | `SpecState.inFlight` changes from `string?` to `InFlightNote[]` (`{ file, text }`); a list named in the plural-neutral `inFlight` reads fine, keep it |
| A | Small functions / no flags | Bites | `inFlightBlock(notes)` takes the notes already chosen; the phase filter is its own pure function (`notesForPhase`) in a new `core/in-flight.ts`, not a flag on the block |
| B | Policy vs detail | Bites | The file-name rule (`in-flight/phase-<id>.md`, `pr-<group>.md`, legacy) lives once in `core/in-flight.ts`; packs, doctor, graph import it instead of re-spelling paths |
| C | SRP / OCP / LSP / ISP / DIP | Inert | Reader shape unchanged; no new variants |
| D | DDD | Skipped | Tooling over markdown files, no domain model |

## Seam and testability (deltas from recon)

- No size-cap pressure: `packs.ts` 148, `spec-state.ts` 72, `run.ts` 79 lines.
- Doctor per-file behaviour: keep `checkInFlight` pure; `run.ts` only maps it over the folder listing. Test through a disk fixture is not needed: one test that `inFlightFiles`-style listing + `checkInFlight` covers it is enough; prefer a pure `inFlightNotePaths(dir)` helper tested with a temp dir.

## Amendments

1. Add `core/in-flight.ts`: `IN_FLIGHT_DIR`, `LEGACY_IN_FLIGHT`, `phaseInFlightFile(id)`, `groupInFlightFile(group)`, `readInFlight(read, phases)`, `notesForPhase(notes, id)`.
2. Execute pack shows `notesForPhase` (picked phase's file, then legacy); resume pack shows every note; both clip the joined text at `IN_FLIGHT_LIMIT` with each note headed by its file.
3. Doctor and graph list `in-flight/*.md` with `markdownFilesIn` plus the legacy file.
4. Fix the wording lines in finding 3 alongside the SKILL.md layout commit.

## Decisions for you

None.
