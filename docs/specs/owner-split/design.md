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
3. **Phase beats spec.** A phase file's `owner:` overrides its spec's; an idea's `owner:` is its own.
4. **Offer = mine or shared.** Crew picks, *Next sessions*, execute's "top ready row" and the
   packs' phase pick offer a row only when its owner is unset or is the person running them.
5. **Views mark, never hide.** The board, `spec.ts list` and `spec.ts ready` show everyone's
   work; owned rows carry `(owner)`.
6. **Can't tell who you are → say so.** If git has no configured name, the crew launches nothing
   and says why; suggestions show everything with owners marked, under one line saying why.
7. **Deliberate beats filtered.** A person who opens someone else's spec themselves
   (`/spec execute cross-studio`) is not blocked. Only the crew refuses.

## Decisions

| Decision | What we chose | Rejected alternative | Why |
|---|---|---|---|
| Where ownership comes from | Explicit `owner:` only, set on someone's word | Creator = owner (git first commit of the spec), or prep/create writing the creator | Anton: "owner doesn't equal a creator… specs should ship with an empty owner… unless someone explicitly claims" (2026-10-17) |
| How an owner is set | `spec.ts owner <spec> <name\|me\|none>` lands the line on `origin/<default>`, like `focus`/`ship` (`core/land-on-main.ts`) | Hand-edit `owner:` on the branch (today's `list.md:59` advice) | Docs live on branches here; the board, crew and other machine read base. A branch edit isn't seen until merge, and never by the other machine |
| Who "me" is | `git -c user.useConfigOnly=true var GIT_AUTHOR_IDENT` name, fail-closed | Reuse `authorName` (`git var`), or `git config user.name` | `git var` invents a name from the OS account on Mac and Linux; `useConfigOnly` fails instead and still honours `GIT_AUTHOR_NAME`, so env-based tests stay green (`research/…-craft-owner-split.md` → Identity probe) |
| Matching a person to an owner | Reuse `samePerson` prefix match (`board/people.ts:21`) | Exact match, or an alias table | `taras` must match `Taras Korpach` and `taraskorpach`; already shipped and tested; two people today |
| Where filtering happens | In the tool: `--who` accepted on every board lane; prose reads the filtered JSON | Owner field on rows, filtered by prose | `SKILL.md` *Next sessions* says "don't re-derive lanes"; one filter, tested once |
| Board under `--who` | Lanes filtered to mine-or-shared rows; FOCUS keeps today's rule | Filter the stored ready lane in `buildBoard` | `focusNow` and header counts read the unfiltered lane (`board/focus.ts:95-98`); filtering at build would hide others' work |
| Crew identity | Tick and `crew start` resolve "me" themselves; `crew start` prints whose crew it is | A `crew.owner` setting | No per-person setup (brief); the run file is per clone anyway |
| Crew launch gate | `launchCrewSession` refuses before `placeForLaunch`, reading owner from base via `originTip` → `baseProject` → `findSpecs`, falling back to the checkout for branch-only specs | Check after placement like `shipOf`, or in `placeForLaunch` | After placement a refused launch leaves a tree behind; `placeForLaunch` is shared with plain `launch`, which must stay unblocked |
| Babysitters | Not gated | Gate on the group's phases' owners | A babysitter follows a PR this crew's own worker made; gating adds a base read per PR for no case we've seen |
| Override for hand launch | None; the person runs `/spec execute` themselves | `--take-over`-style flag | Value first; rule 7 already gives the deliberate path |
| Skip rows in run.md | Left as is | Widen the `QUESTION` regex to spec-wide rows | The owner rule replaces them; CRM's q40/q41 go once this ships |
| "Anton" in crew prose | "the person running the crew" | Leave it | Taras running a crew would read "Anton answered …" in briefs |
| Session's own spec in *Next sessions* | Still row 1 even when owned by someone else | Filter it out | The person opened it deliberately (rule 7) |
| `BOARD_VERSION` | 2 → 3 | Keep 2 (additive field) | `--who` now changes what `--json` lanes contain; consumers should see it |

## Flows

```
assign:  "that's mine" ─► spec.ts owner gift-cards me ─► origin/main CLAUDE.md: owner: anton-haskevych
                                                        ─► both machines see it after their next fetch

crew tick ─► me = runner name ──none──► "crew tick: can't tell who runs this crew …; launching nothing"
                 │ok
                 ▼
          ready rows ─► pickRows: skip row.owner set and not me ─► launchCrewSession
                                                                     │ owner (base) not me → refuse, no tree
                                                                     ▼ place → claude --bg

Next sessions ─► board ready --who me --json ─► rows mine or shared (+ session's own spec at 1)
"what is Taras on" ─► board --who taras ─► person section
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
```

Crew:

```
crew start: started for anton-haskevych (workers 3, babysitters 2)
crew start: can't tell who runs this crew; set git user.name, then start again
crew tick: can't tell who runs this crew; set git user.name. Launching nothing
crew launch: cross-studio is taras's; this crew is anton-haskevych's. Open it in your own session instead
```

Board ready row (owner shown only when set):

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
- **Phase owned, spec unowned:** only that phase is held back; the spec's other phases stay shared.
- **Spec only on a branch:** the launch gate falls back to the checkout copy; `spec.ts owner` refuses (`land the spec first`), as `focus`/`ship` do.
- **One person, two names** (git `Taras Korpach`, gh `taraskorpach`): prefix match joins them; a pair with no shared 3-char prefix shows as two (already warned in `list.md`).
- **Stale remote claim** on a phase done on base: the person section drops it (`gotcha-remote-claims-never-read-as-done`).
- **Push to main refused** by `spec.ts owner`: nothing written; the line says so.
- **Taras has never pushed a claim:** "on now" for him shows only PRs until he runs `/spec` on his machine.
