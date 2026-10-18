# Code Map — Owner Split

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|
| `skills/spec/tools/core/people.ts` | person matching and the offer rule (`isOffered`, `ownerOf`) | 1 |
| `skills/spec/tools/core/land-spec-field.ts` | set or remove one key in a spec's `CLAUDE.md` on main (`ship`, `owner`) | 1 |
| `skills/spec/tools/commands/owner.ts` | `spec.ts owner` | 1 |
| `skills/spec/tools/board/person-work.ts` | person section data from `BoardInputs` | 4 |
| `skills/spec/tools/board/render-person.ts` | person section text; reuses FOCUS's `nowText` for lane states | 4 |

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/tools/crew/pick.ts` | the crew's only pick rule | |
| `skills/spec/tools/trees/place.ts` | the crew launch gate (`PlaceOptions.onlyFor`), before any tree is cut | `decision-launch-gate-in-place-tree` |
| `skills/spec/tools/crew/run-state.ts` | run.md `runner:`, the crew's identity | `decision-crew-identity-is-the-run-file` |
| `skills/spec/tools/commands/crew/tick.ts` | refill and close-out; reads the runner | |
| `skills/spec/tools/commands/crew/launch-session.ts` | every crew start passes here; hands `onlyFor` to placement | |
| `skills/spec/tools/launch/place-for-launch.ts` | `LaunchPlace.onlyFor` reaches placement for execute only; babysit never gated | `decision-launch-gate-in-place-tree` |
| `skills/spec/tools/tests/trees-place-owner.test.ts` | real-git owner gate fixture: base owner, branch-only owner, malformed owner | |
| `skills/spec/tools/board/people.ts` | `--who` (that person's work) and `--for` (offered to them) filters | `decision-offer-filter-is-its-own-flag` |
| `skills/spec/tools/board/lanes.ts` | ready rows are built here | |
| `skills/spec/tools/core/git.ts` | identity (`authorName`, `runnerName`) | `gotcha-invalid-owner-reads-as-shared` |
| `skills/spec/tools/core/spec-meta.ts` | `owner:` parsing | `gotcha-invalid-owner-reads-as-shared` |
| `skills/spec/tools/commands/board.ts` | flag parsing for `--who`/`--for`/`--keep` | `gotcha-board-lane-json-is-the-whole-model` |
| `skills/spec/tools/commands/ship.ts` | moves onto `landSpecField` | |
| `skills/spec/tools/tests/git-repo.ts` | `anonymousRunner`: a machine with no git identity, for identity tests | `gotcha-empty-git-author-name-overrides-user-name` |

## External references

- CRM run file `~/IdeaProjects/crm/.git/spec-board/crew/run.md` — q40/q41 skip rows this replaces
