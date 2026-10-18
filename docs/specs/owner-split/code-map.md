# Code Map — Owner Split

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/tools/crew/pick.ts` | the crew's only pick rule | |
| `skills/spec/tools/commands/crew/launch-session.ts` | every crew start passes here; gate goes before `placeForLaunch` | |
| `skills/spec/tools/commands/crew/tick.ts` | builds the board without `me` today | |
| `skills/spec/tools/board/people.ts` | person matching (`samePerson`), `--who` filters | |
| `skills/spec/tools/board/lanes.ts` | ready rows are built here | |
| `skills/spec/tools/core/git.ts` | identity (`authorName`) | |
| `skills/spec/tools/core/spec-meta.ts` | `owner:` parsing | |
| `skills/spec/tools/commands/board.ts` | `--who` argument guard | |

## External references

- CRM run file `~/IdeaProjects/crm/.git/spec-board/crew/run.md` — q40/q41 skip rows this replaces
