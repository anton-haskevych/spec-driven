# Owner Split — Design

## Problem

The plugin knows who owns a spec (`owner:` in its `CLAUDE.md`) and who "me" is (the git author
name), but nothing that picks or suggests work uses either. On 2026-10-17 Anton's crew started
workers on Taras's `cross-studio 1a` and `staff-ios-app-release 4`; the overseer's hand-written
skip rows (`cross-studio (all phases)`) never parsed, so later ticks ignored them too
(`research/2026-10-17-wave-1-owner-seams.md` → Crew). Anton and Taras share one repo and one
plugin from a Mac and a Linux box; each must get only their own work plus shared work, and be
able to ask what the other is doing.

## Rules

1. **Owner is assigned, never inferred.** A spec ships with no owner. It gets one only when a
   person says so ("that's mine", "assign this to Taras"), through `spec.ts owner`. The creator
   is not the owner: either person may work a spec the other made.
2. **No owner = shared.** Anyone's crew and suggestions may offer it.
3. **Spec-level only.** `owner:` lives on a spec's `CLAUDE.md`. Phases and backlog ideas have no
   owner (`ledger/decision-spec-level-owners-only.md`).
4. **Offer = mine or shared.** Crew picks, *Next sessions* and execute's "top ready row" offer a
   row only when its spec has no owner or is owned by the person they are for. A malformed owner
   is offered to no one.
5. **The board marks, never hides.** Plain `board` lanes show everyone's work; owned ready rows
   carry `(owner)`. Only `board ready --for <person>` narrows, and only the ready lane.
6. **One "me", fail-closed.** "Me" is the configured git name (`runnerName`). Unknown → the crew
   launches nothing and says why; suggestions show everything with owners marked, under one line
   saying why.
7. **Deliberate beats filtered.** A person who opens someone else's spec themselves
   (`/spec execute cross-studio`) is not blocked and the packs don't filter. Only the crew refuses.

## Decisions

| Decision | What we chose | Rejected alternative | Why |
|---|---|---|---|
| Where ownership comes from | Explicit `owner:` only, set on someone's word | Creator = owner (git first commit of the spec), or prep/create writing the creator | Anton: "owner doesn't equal a creator… specs should ship with an empty owner… unless someone explicitly claims" (2026-10-17) |
| What can be owned | Specs only | Phase and idea owners, phase beating spec | No setter for them except the branch hand-edit rejected below; none exist in CRM. Anton, review 2026-10-17 |
| How an owner is set | `spec.ts owner <spec> <name\|me\|none>` lands the line on `origin/<default>` through `landSpecField`, extracted from `commands/ship.ts` and shared with `ship` | Hand-edit `owner:` on the branch (today's `list.md:59` advice); a copy of `ship.ts` | Board, crew and the other machine read base. A second "set one key on main" command means extract, not copy |
| Who "me" is | `git -c user.useConfigOnly=true -c user.email=spec-driven@invalid var GIT_AUTHOR_IDENT` name; refused when unset or its match key is under 3 characters | Reuse `authorName` (`git var`), or `git config user.name` | `git var` invents a name from the OS account; `useConfigOnly` fails instead but also fails on a missing email, hence the placeholder (probe in the review); a Cyrillic or 2-letter name keys to nothing and would silently match no one |
| One "me" per surface | `Board.me`, `--for me`, `spec.ts owner … me` and `crew start` all use `runnerName`; `authorName` only writes claim holders | `authorName` for the board's display "me" | Two names on one screen: FOCUS filtered as the OS name under a "can't tell who you are" line |
| Matching a person to an owner | `samePerson` prefix match, moved with `personKey`, `isOffered`, `UNKNOWN` to `core/people.ts` | Exact match, or an alias table; leaving it in `board/` | `taras` must match `Taras Korpach` and `taraskorpach`; crew and context would import from `board/` |
| Malformed `owner:` | Offered to no one; marked `(owner?)`; doctor error as today | Treated as unset (today) | Unset means shared: a typo would hand Taras's spec to every crew |
| Where filtering happens | In the tool: `board ready --for <name\|me>`; prose reads the filtered JSON | Owner field on rows, filtered by prose | `SKILL.md` *Next sessions* says "don't re-derive lanes"; one filter, tested once |
| Flag for the offer filter | New `--for`, ready lane only | Reuse `--who` on every lane | `--who X` already means "X's work" (`board/people.ts:51-56`); "offered to X" is another predicate. Filtering IN FLIGHT by owner hid your own running workers |
| Own spec in *Next sessions* | `--keep <spec>` keeps that spec's ready rows under `--for`; still row 1 | Prose adds the row back | The row's `target`/`treeBusy` exist only in the tool; rule 7 |
| Packs | Not filtered | Filter ready phases before `firstUnheld` | The person named the spec; an emptied list printed "All phases complete" (`commands/context.ts:113`) |
| Needs-you items | Unchanged: not filtered, not marked | Filter by owner | A review request from the other person is exactly what you should see |
| Crew identity | run.md `runner:`: `crew start` writes it from `runnerName`, takeover rewrites it; tick and `crew launch` read it | Live `runnerName` per call; a `crew.owner` setting | Picker and gate must agree for the whole run; keeps the tick git-free; no per-person setup |
| Crew launch gate | `PlaceOptions.onlyFor` in `placeTree`, checked after `groupPhases`, before `findTree`; only `launchCrewSession` sets it | A new `OwnerReader` port before `placeForLaunch`; a gate in `crewLaunch` | Placement already reads the spec from base, then the checkout; refusing there cuts no tree; a failed read already refuses (fail closed); covers tick picks, relaunches and hand launches at one point; plain `launch` never sets it |
| Babysitters | Not gated | Gate on the group's owner | A babysitter follows a PR this crew's own worker made |
| Override for hand launch | None; the person runs `/spec execute` themselves | `--take-over`-style flag | Rule 7 gives the deliberate path |
| Skip rows in run.md | Left as is | Widen the `QUESTION` regex to spec-wide rows | The owner rule replaces them; CRM's q40/q41 go once this ships |
| "Anton" in crew prose | "the person running the crew" | Leave it | Taras running a crew would read "Anton answered …" in briefs |
| `BOARD_VERSION` | 2 → 3 | Keep 2 | `--for`/`--keep` change what `--json` lanes contain, and `people` is new |

## Flows

```
assign:  "that's mine" ─► spec.ts owner gift-cards me ─► origin/main CLAUDE.md: owner: anton-haskevych
                                                        ─► both machines see it after their next fetch

crew start ─► runnerName ──none──► refuse
                 │ok ─► run.md runner: anton-haskevych

crew tick ─► runner (run.md) ──none──► close out as usual; "can't tell who runs this crew"; launch nothing
                 │ok
                 ▼
          ready rows ─► pickRows: skip owner not offered ─► launchCrewSession
                                                              │ placeTree(onlyFor: runner)
                                                              │   owner not offered → refuse, no tree
                                                              ▼ place → claude --bg

Next sessions ─► board ready --for me --keep <own spec> --json ─► rows mine, shared, or own spec
"what is Taras on" ─► board --who taras ─► person section + his focus rows
```

## CLI copy

```
$ spec.ts owner gift-cards me
owner: gift-cards is anton-haskevych (3f2a91c)
$ spec.ts owner gift-cards taras
owner: gift-cards is taras (8b0c4de)
$ spec.ts owner gift-cards none
owner: gift-cards has no owner (51d7e02)
$ spec.ts owner gift-cards taras        # already
owner: gift-cards is already taras
$ spec.ts owner nope me
owner: no spec named nope on origin/main; land the spec first
$ spec.ts owner gift-cards me           # no git name
owner: can't tell who you are; set git user.name, or name the person
$ spec.ts owner gift-cards tk
owner: "tk" is too short to match anyone; use at least 3 letters of their name
```

Crew (the start line keeps today's shape, `commands/crew/overseer.ts:34`):

```
Crew: started for anton-haskevych · overseer 7f3c… · 3 workers, 2 babysitters
crew start: can't tell who runs this crew; set git user.name, then start again
crew tick: can't tell who runs this crew; run crew start again. Launching nothing
launch: cross-studio is taras's; this crew is anton-haskevych's. Open it in your own session instead
launch: permission-aware-ui is taras's; this crew is anton-haskevych's. Open it in your own session instead; its work so far is on feat/permission-aware-ui-pr-c in ~/claude-worktrees/crm/permission-aware-ui-pr-c. Push it or hand it to taras
```

The second line is what a relaunch gets when the spec changed owner mid-run: the group's tree exists, so the line names it.

Board ready row (owner shown only when set; `(owner?)` for a malformed one):

```
 3 ★ staff-ios-app-release   /spec execute 4   p1   due 10-20   (taras)
```

Suggestions when "me" is unknown (one line above the *Next sessions* rows):

```
Can't tell who you are (no git user.name): showing everyone's work, owners marked.
```

Person section (`board --who taras`):

```
TARAS
owns     cross-studio ready 1a · staff-ios-app-release blocked (needs 3) · gift-cards done · +3
on now   staff-ios-app-release 4 · claimed 2h ago on taras-thinkpad
PRs      #812 staff-ios-app-release pr-b · green
```

`board --who me` adds `sessions  2 here: owner-split prep · crm-a7`. Empty parts print `—`.
Nothing at all: `TARAS — owns nothing, nothing on now`.

## Edge cases

- **Owner names no one** (`owner: bob`): only bob's crew offers it; views mark `(bob)`.
- **Malformed owner** (`owner: [taras]`, `owner: 42`): offered to no one, marked `(owner?)`, doctor error.
- **Name too short or non-ASCII** (git `Тарас`, `owner: tk`): `runnerName` and `spec.ts owner` refuse; nothing matches silently.
- **Git name set, email unset:** works (placeholder email in the probe).
- **Spec only on a branch:** placement already falls back to the checkout copy, so the gate does too; `spec.ts owner` refuses (`land the spec first`), as `focus`/`ship` do.
- **One person, two names** (git `Taras Korpach`, gh `taraskorpach`): prefix match joins them; a pair with no shared 3-char prefix shows as two (already warned in `list.md`).
- **Owner changed mid-run:** the relaunch is refused with the branch and tree holding the unmerged work.
- **Stale remote claim** on a phase done on base: the person section drops it (`gotcha-remote-claims-never-read-as-done`).
- **Push to main refused** by `spec.ts owner`: nothing written; the line says so.
- **Hand `crew launch` right after `spec.ts owner`:** placement reads base with `--local` (no fetch); the tick fetches. A launch in that window sees the old owner.
- **The other machine on an older plugin** ignores owners until it updates (`gotcha-session-runs-the-cached-plugin-not-the-branch`).
- **Taras has never pushed a claim:** "on now" for him shows only PRs until he runs `/spec` on his machine.
