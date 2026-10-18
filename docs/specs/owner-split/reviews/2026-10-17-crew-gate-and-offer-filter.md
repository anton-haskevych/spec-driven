# Review — owner-split: crew gate and offer filter (2026-10-17)

Panel: principal-engineer, integration-architect, adversarial-tester, code-quality-reviewer,
prior-art-reviewer. All five returned; all five said **fix-then-proceed**. Synthesis by the main thread.

## Verdict

The core is right: owners are explicit and land on base, filtering lives in the tool, and the crew is
gated once before a tree is cut. The spec went wrong in three places. (1) Suggestion plumbing: the
pack filter breaks rule 7 and makes a spec read "All phases complete", and `--who` was overloaded with
a second meaning that hides your own in-flight work. (2) Identity: the board, tick and launch each
had their own "me". (3) The launch gate was a new port with a sync type over async data, fed by a
reader that could never fire, and it failed open when base was unreadable. Phase/idea owners had no
setter. After the fork and the fixes below, the spec is smaller (no phase/idea owners, no new port,
no pack filter) and every path reads one identity.

## Forks put to the user

- **Phase and idea owners** (principal F2, prior-art F8, adversarial F9). Keep them with a
  `spec.ts owner <spec> [<phase>]` setter, or cut to spec-level only. Recommended: cut; no phase or
  idea in CRM has an owner, and the only way to set one was the branch hand-edit the spec rejects.
  **Anton: spec-level only.** → `ledger/decision-spec-level-owners-only.md`.

## Resolved by the synthesizer

- **Offer filter gets its own flag** — `board ready --for <name|me>`; `--who` keeps meaning "that
  person's work" (focus + person section). One flag, one predicate (principal F3, prior-art F5).
- **Flight and blocked are never offer-filtered** — in flight is about the holder, not the owner
  (integration F3, adversarial F7).
- **Own-spec pin via `--keep <spec>`** — the tool keeps that spec's rows, so *Next sessions* never
  re-derives a row (integration F2, adversarial F2).
- **Packs don't filter by owner at all** — with spec-level owners only, the person chose the spec;
  removes the false "All phases complete" (all five).
- **Launch gate = `PlaceOptions.onlyFor`** in `placeTree`, after `groupPhases` and before
  `findTree` — reuses placement's base-then-checkout read, refuses before any tree, fails closed
  because a failed world load already refuses; deletes `owner-on-base.ts`, `OwnerReader`, the tick
  reader (prior-art F1 over code-quality F2's `crewLaunch` placement: placeTree covers tick and hand
  launch in one spot).
- **Crew identity = run.md `runner:`** — written by `crew start`, rewritten on takeover; tick and
  `crew launch` read it, so the tick stays git-free. Integration/adversarial preferred a live read;
  the run file wins because the gate and the picker must agree on one name for a whole run.
- **Board identity = `runnerName`** — `Board.me` comes from it (absent when unknown), so FOCUS and
  `--for me` never disagree. `authorName` keeps only the claim-holder write.
- **Identity probe passes a placeholder email** — `git -c user.useConfigOnly=true -c
  user.email=spec-driven@invalid var GIT_AUTHOR_IDENT`; a name shorter than 3 key characters is
  refused (adversarial F4, F5; probed).
- **Invalid owner is offered to no one** — fail closed, marked `(owner?)` (adversarial F3).
- **Unknown runner in the tick still closes out** — only the refill stops (adversarial F6).
- **`spec.ts owner` shares `landSpecField` with `ship`** — extracted, not copied (principal F7,
  code-quality F8, prior-art F6).
- **Matching moves to `core/people.ts`** — crew and board import it; `UNKNOWN` lives there (code-quality F5).
- **Person data from `BoardInputs`** — `personWork` in `board/person-work.ts`; render separate (code-quality F7).
- **Rule 5 narrowed to the board** — `list`/`ready` get no owner mark (integration F7, adversarial F10).
- **Needs-you unchanged** — not filtered, not marked; a review request from the other person is
  exactly what you should see (integration F10, adversarial F12).
- **Overseer plan reads `board ready --for me --json`** (integration F6).
- **`pickRows` takes an object** (code-quality F9). **Crew start copy** follows the pinned line
  (code-quality F11, integration F11).

## Findings

| # | Finding | Signal | Sev | Verified | Raised by | Outcome |
|---|---|---|---|---|---|---|
| 1 | Pack filter before `firstUnheld` breaks rule 7; empty list falls to "All phases complete" (`commands/context.ts:113`, `context/packs.ts:89`) | consensus | high | verified | all five | packs unfiltered (spec edit) |
| 2 | Phase/idea owners have no setter; hand edit is the rejected path | consensus | medium | verified | PE, PA, AT | fork → cut |
| 3 | `--who` carries two predicates; flight filtered by owner hides own work | consensus | medium | verified (`board/people.ts:45-56`) | PE, PA, IA, AT | `--for`, ready only |
| 4 | Own-spec row 1 can't come from filtered JSON (`SKILL.md` "don't re-derive lanes") | consensus | high | verified | IA, AT | `--keep <spec>` |
| 5 | Two identities on one board (`board/load.ts:39` authorName vs runnerName) | consensus | medium | verified | PE, CQ, PA, AT, IA | Board.me = runnerName |
| 6 | Crew's `me`: `runner:` written but unread; gate's `me` unsourced | consensus | medium | verified (`crew/run-state.ts:29-35`, `launch-session.ts:34`) | PE, CQ, PA, IA, AT | run.md `runner:` is the source |
| 7 | Gate wiring: 5th param, sync `OwnerReader` over async `baseProject` (`mainline/load.ts:49`), tick reader can't fire and has no path to `launch` (`tick.ts:38,146`) | consensus | high | verified | CQ, IA, PA | gate in `placeTree` (`PlaceOptions.onlyFor`) |
| 8 | `OwnerReader` returns undefined on base read failure → shared → launches | unique | medium | verified by type | IA | superseded by #7 (placeTree refuses on world failure) |
| 9 | Malformed `owner:` reads as unset → shared (`core/spec-meta.ts:93-97`) | unique | high | verified | AT | fail closed, `(owner?)` |
| 10 | `useConfigOnly` fails when only the email is missing; message blames the name | unique | medium | verified (probe) | AT, IA | placeholder email |
| 11 | Non-ASCII / short names key to nothing; silently match no one (`board/people.ts:16-25`) | unique | medium | verified | AT | refuse key < 3 in `runnerName` and `spec.ts owner` |
| 12 | Tick on unknown `me` "mirror tick.ts:55" skips close-out | unique | medium | verified (`tick.ts:53-72`) | AT | close out, hold refill |
| 13 | Reassigned spec mid-run: relaunch refused once, then dropped; unmerged chunk stranded | unique | medium | verified (`tick.ts:113`) | AT | refusal names branch + tree; pr-opening note for CRM `permission-aware-ui` |
| 14 | `spec.ts owner` copies `ship.ts`; 5th copy of find-one-spec refusal | consensus | low | verified (`commands/ship.ts:41-57`) | PE, CQ, PA | `landSpecField` extracted |
| 15 | Owner resolution in 3–5 places; `board/flight.ts` missing | consensus | medium | verified | PE, CQ | moot after #2 (spec owner only); flight.ts added to phase 1 |
| 16 | Matching helpers in `board/` imported by crew/context | unique | medium | verified | CQ | `core/people.ts` |
| 17 | Person data isn't on `Board`; `boardFor(board)` can't build it | unique | medium | verified (`board/model.ts:49-60`) | CQ | `personWork(inputs, …)` |
| 18 | Rule 5 claims `list`/`ready` marks; nothing changes them | consensus | medium | verified (no `owner` in those files) | IA, AT | rule narrowed to board |
| 19 | Overseer plan reads unfiltered board, filters in prose (`oversee-crew.md:51,58-71`) | unique | medium | verified | IA | §1.2 reads `--for me` |
| 20 | `doctor/spec-meta.ts` omitted; spec-meta tests won't stay green | unique | medium | verified | IA | moot: owner stays in `readFocusFields` (spec-level only) |
| 21 | `git.test.ts:69-70` stub advice backwards | unique | low | verified | IA | new `runnerName` tests instead |
| 22 | `readSchedule` could host owner for spec/phase/idea | unique | medium | verified (`core/schedule.ts:16`) | PA | superseded by #2 |
| 23 | Needs-you rows undecided | consensus | low | — | IA, AT | decided: unchanged |
| 24 | `pickRows` 6 params; `fillSlots` 7 | unique | low | verified (`crew/pick.ts:12`) | CQ | object param |
| 25 | Crew start copy contradicts pinned test | consensus | low | verified (`overseer.ts:34`) | CQ, IA | copy aligned |
| 26 | `buildBoard(me)` in tick is a no-op | consensus | low | verified (`tick.ts:138`) | CQ, IA | dropped |
| 27 | `anonymousRunner` inherits env `GIT_AUTHOR_*`/`EMAIL` (`core/run.ts`) | unique | low | inferred | AT | helper blanks them |
| 28 | Old plugin on the other machine ignores owners | unique | low | inferred | AT | edge case + success metric note |
| 29 | Different owner copies per path (tick fetched, hand launch no fetch) | unique | low | verified | AT | noted in edge cases |

## Rejected or unverified

- Code-quality F1's "filter phase owners only in packs, fall back to unfiltered" and prior-art F2's
  "owner into `held`": superseded by the fork (no phase owners).
- Code-quality F2's gate in `crewLaunch`: rejected for `placeTree` — `crewLaunch` misses tick picks
  and relaunches.
- Integration F4's live `runnerName` per call: rejected for the run file (see resolved).
- Adversarial F5's "warn when an owner matches no known person": gold plating; the key-length refusal
  covers the silent case.
- Adversarial F15's "crew start prints the plugin version": run.md already records `cli:`; not added.
