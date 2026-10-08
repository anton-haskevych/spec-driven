# Active Work View — Design

## Problem

See `product-brief.md`. In short: in a busy repo (CRM: 186 `active` specs, 124 ready and 252 blocked
phase rows), the board is keyed by phase and sees sessions only through claims. The specs a team is
actually shipping are invisible among the rest, sessions without a claim don't show, a session idle for
days can hold a claim unnoticed, and neither developer sees what the other is on.

## Target audience

A small team (1–3 developers) sharing one repo, each running several Claude Code sessions. CRM today:
Anton and Taras, separate machines, different branch habits (`feat/<spec>-pr-<g>` vs `spec/<spec>`).
Nothing in the plugin may assume a person, project, branch convention or domain.

## Key decisions

Review 2026-10-07 (`reviews/2026-10-07-focus-storage-and-landing.md`) replaced decisions 2, 3, 4, 9, 12
and added 15–16; the originals are in git history.

| # | Decision | What we chose | Rejected alternative | Why |
|---|----------|---------------|----------------------|-----|
| 1 | Name of the concept | **focus** (`focus:` field, `FOCUS` section, `board focus`, `spec.ts focus`) | "now", "shipping", "active" | "active" already means nothing (186 specs). "focus" is the user's word for it, short, and unused as an identifier. The prose "Currently focused: Phase N" in `status.md` is a different file and stays |
| 2 | Where the rank lives | **`focus: <number>` in the spec's own `CLAUDE.md` frontmatter** (`ledger/decision-focus-rank-in-spec-meta.md`) | (a) `docs/specs/_focus/<spec>.md`, one file per spec; (b) a list in `_playbook/settings.md` | (a) lets entries dangle (renamed, deleted, finished, branch-only specs) and needs its own loader, two doctor checks, a hook regex and `unknown` / `branch-only` / `shipped → drop` handling; the field rides the spec through renames, drops out when the spec finishes, and reuses `SpecMeta`, `checkSpecMeta` and `setFrontmatterLine`. An added key lands just before the closing fence, far from `updated:`, so it merges cleanly. (b) is the shared-append file the project retired (`gotcha-github-ignores-merge-union`) |
| 3 | Order | `focus:` is any finite number ≥ 0, ascending, ties by spec name. Add = max + 10 (first: 10); top = min − 10, or min / 2 when that would go below 0; after X = midpoint of X and the next higher rank (none → X + 10). Never renumbers | Integers with gap renumbering; filename order | Every write is one file, so it never touches another spec's `CLAUDE.md`. `12.5` is still readable |
| 4 | Who a focus spec belongs to | The documented optional **`owner:`** key (`SKILL.md` → *Priority, due dates and owners*), any name of the person (gh login preferred). Matched by normalized prefix (lowercase, drop non-alphanumerics, one side a prefix of the other, min 3 chars) against **me** only; everyone else is keyed by exact normalized name. `unknown` never matches | A new `who:` key; a `_people/` alias file; exact gh login only | `owner:` is already the house key for "one named person"; a second key would split it. In code the identifier is `person` (not `owner`, which `ownerOf` uses for a path's worktree). Bucketing against me only keeps grouping deterministic ("anton" vs "antonio" can't merge two teammates) |
| 5 | Who "me" is | Local claims and this machine's sessions are always mine. For PRs and remote claims: the normalized git author name, one `git var GIT_AUTHOR_IDENT` in `loadBoard` (not in `loadBoardInputs`, which `claim` and `trees place` also call) | `gh api user` per board run | No network call; the board budget is < 5 s (`decision-board-timing-accepted`) |
| 6 | Session → spec | First keep only this repo's sessions (cwd inside any `git worktree list` path). Then, in order: (1) the session holds a claim on the spec; (2) its name parses as launch's `<spec> <sub-command> [<phase>]` with `<spec>` a spec on the base; (3) its cwd is in a **non-main** worktree whose spec changes name exactly one *focus* spec. Every match shows, not just the newest per tree. The rest of this repo's sessions are `other sessions` | Branch names; transcript `gitBranch`; newest-per-tree (today); tree before name | ROADMAP rule: no branch-to-spec mapping. The main checkout is always "live" and collects prep/idea edits, so it can't stand for one spec. Trees are reused across specs, so the launch name outranks the tree. `~/.claude/sessions` spans every repo on the machine |
| 7 | Teammate's work | Remote claims (exist) + **open** PRs linked from the spec's `pr-opening.md` on the base (`prLinks`), labelled by PR author; an author-less PR shows unlabelled | Reading origin branches; `gh pr list --author` per person | No branch mapping (rule). One field (`author`) on the existing `gh pr list` call. A teammate's links on an unmerged branch stay invisible until they reach the base: accepted |
| 8 | A live claim whose session is idle | Needs-you kind `idle-claim` after **2 days** idle (`IDLE_CLAIM_DAYS`), one row per session: `claim idle 3d` · `<spec> · 1, 2, 4a → switch to <session> or take it over`. Board-wide, focus set or not | Calling it "stale"; reusing `REMOTE_CLAIM_STALE_DAYS` (3); "release" | `isStale` already means "safe to take over". `claim release` only frees the caller's own claims, and take-over needs the user's word, so the copy names the two real actions |
| 9 | Finished focus specs | Shown while the base says finished but a linked PR is still open (`now: merging #n`); hidden once no linked PR is open. `abandoned` / `good-enough` hide at once. The leftover `focus:` is harmless; no drop step, no attention row | A `shipped → drop from focus` row plus a handoff drop | In `docs: main` projects the last tick reaches main at handoff, before the code merges; hiding then would drop the team's #1 while it's unmerged. With the rank in spec meta there is nothing to clean up |
| 10 | Focus vs the rest of the board | FOCUS is a new lane, printed first; the other lanes are unchanged. Ready rows carry `focus?: number` and rank focus specs first (by focus rank), then today's order | (a) A separate command; (b) filter the board to focus specs only | (a) breaks "no new user command". (b) loses the blocked/needs-you picture. Ranking focus first makes *Next sessions*, execute's "offer the top ready row" and "what's next" recommend focus work with no prose change |
| 11 | Filter mine / a teammate's | `board focus --who <name\|me>`, applied to the model before JSON and text; Claude maps "my focus", "what's Taras on" to it (`list.md`) | `list mine` / `list <name>` words; filtering in the renderer | Free words on `list` are the table filter (`decision-board-command-surface`). Filtering the model keeps agents reading `--json` on the same answer |
| 12 | Writing the set | `spec.ts focus add\|drop\|move` reads the set from `origin/<default>` and pushes a one-file commit onto it (pin, commit, push, retry on non-fast-forward), from any checkout and in any docs mode (`ledger/decision-focus-writes-land-on-default-branch.md`) | Write the checkout and land via `publish-docs` | `publish-docs` skips deletions, runs only in `docs: main`, and a worktree's view of the set can be days old. Focus is shared team state, like claims: read and written at the base |
| 13 | JSON | Additive: `lanes.focus`, `footer.otherSessions`, `me`, `ReadyRow.focus`, one attention kind. `BOARD_VERSION` stays 1 | Bump to 2 | Precedent `decision-remote-claims-landing-shape`: additive fields don't break readers |
| 14 | No focus set | FOCUS lane, header count and `other sessions` omitted; the board prints as today except `claim idle` rows (decision 8) | An empty "FOCUS none" lane | The brief: solo users and repos without a set see no change to their lanes |
| 15 | Focus vs `priority:` | Separate axes. Focus = the team's short, totally ordered shipping list; `priority` = urgency across all specs. In ready ranking focus comes before priority. No doctor coupling (`ledger/decision-focus-is-not-priority.md`) | Focus = `priority: p1` ordered by due | CRM has 22 `p1` specs, no total order, no per-person view. A "focus must be p1" warning would push everything to p1 again |
| 16 | Sessions and joins | FOCUS has its own resolver (decision 6); `board/joins.ts` keeps today's per-row pick for IN FLIGHT | One resolver for both | Rewiring joins would change in-flight output, which this spec leaves alone. A session can show on an IN FLIGHT row and in `other sessions` when its tree touches two focus specs: accepted |

## Core flow

```
Anton: "put multi-location-studios and cross-studio on top of focus"
  Claude ─► spec.ts focus add multi-location-studios --top      (commit on origin/main: focus: in its CLAUDE.md)
         ─► spec.ts focus add cross-studio --after multi-location-studios
Taras (later, any session): /spec list
  board ─► reads origin/main specs' focus: ─► same FOCUS order on both machines
```

## Board — default view (wireframe)

```
spec board · crm · origin/main 0f91711 · fetched 18:30
12 focus · 4 in flight · 124 ready · 252 blocked · 8 need you

FOCUS
  1  multi-location-studios          5/12  needs deploy of 1–5             anton: resume idle 6h
  2  cross-studio                    2/16  ready 3, 4                      —
  3  frontend-crash-safety      ⚠    1/14  executing 2                     anton: execute 2 busy 5m · #910 2 failing
  4  recurring-series-lifecycle…     10/14 executing 7 · 6caaa on branch   anton: execute 7 idle 3d, execute 6caaa shell 3h
  5  fast-parallel-backend-tests     5/12  executing 6                     anton: execute 6 busy 6m, 8 idle 6h, 9 idle 4h, 10 idle 3h
  6  gift-cards                      0/9   in flight 1, 2, 3, 4a           taras: 4 claims 2d · #904 #905 draft
  7  local-test-cost                 3/8   paused                          — (anton)
  …
  other sessions: crm-d1 busy 4h, crm-82 idle 6h, crm-ac idle 3d

IN FLIGHT
  … (unchanged)

READY   ★ = shares no files with anything in flight
  1 ★  cross-studio · 3            /spec execute  p1         focus 2
  …

NEEDS YOU
  claim idle 3d          recurring-series-lifecycle-clarity · 7 → switch to recurring-series-lifecycle-clarity execute 7 or take it over
  …
```

- Columns: focus position · spec (`⚠` when overdue) · progress `done/total` (`prep` / `draft` for specs
  without phases) · **now** · **who**. Due day after `now` when set and not overdue.
- **now** (first match, model kind in brackets): `executing <ids>` / flight `next` text [`flight`] →
  `ready <ids>` (max 3, then `+N`) or `ready: /spec create` / `ready: /spec prep` [`ready`] →
  `needs deploy of <ids>` [`deploy`] → `blocked: <first reason>` [`blocked`] → `paused` [`paused`] →
  `merging #<n>` (finished on base, linked PR open) [`merging`] → `—` [`none`].
- **who**: per person, `<name>: <sessions> · <claims> · <PRs>`, me first, then others by name.
  Session: `<sub> <phase> <status> <ago>` from the parsed launch title, else `<session label> <status> <ago>`.
  Remote claims collapse to `N claims <age>` when more than 2. PRs (open only): `#<n>` + `draft` /
  `N failing` / `checks pass`; an author-less PR shows after the people, unlabelled. Nothing known → `—`.
- The spec's `owner:` shows when nobody is on it: `— (taras)`.
- `other sessions:` lists this repo's sessions on no focus row, at most 5, then `+N`. Omitted when none
  or when the focus set is empty.

## `board focus` and `--who`

```
$ spec.ts board focus --who taras
spec board · crm · origin/main 0f91711 · fetched 18:30
FOCUS · taras
  6  gift-cards                      0/9   in flight 1, 2, 3, 4a           taras: 4 claims 2d · #904 #905 draft
```

`--who` keeps rows whose `owner:` matches or where that person has a who bucket; `--who me` uses `me`
(decision 5). It filters the model, so `--json` returns the same rows. No match → `FOCUS · <name>\n  none`.
Empty focus set → `FOCUS\n  none`. When `--who <name>` finds none, `list.md` has Claude fall back to that
person's remote claims across all specs.

## Copy

| Where | Text |
|---|---|
| Lane title | `FOCUS` (filtered: `FOCUS · <name>`) |
| Header count | `<n> focus · ` prefix, only when the set is non-empty |
| Attention, idle claim | `claim idle <ago>` · `<spec> · <phases> → switch to <session> or take it over` |
| Writer success | `focus: added <spec> at <position>/<total> (<sha>)` · `focus: dropped <spec> (<sha>)` · `focus: moved <spec> to <position>/<total> (<sha>)` |
| Writer refusals | `focus add: no spec named <x> on origin/<default>; land the spec first` · `focus add: <x> is already in focus (<position>/<total>)` · `focus drop: <x> is not in focus` · `focus move: --after <y>: <y> is not in focus` · `focus move: <x> is not in focus` · `focus: push to <default> refused: <git's reason>` · `focus: can't read origin/<default>: <reason>; nothing written` (offline) · `focus: <default> moved twice while writing; nothing pushed — run it again` |

## Edge cases

| Case | Behavior |
|---|---|
| No spec has `focus:` | No FOCUS lane, no header count, no `other sessions`; board identical to today except `claim idle` rows |
| Spec renamed | `focus:` moves with its `CLAUDE.md`; nothing to fix |
| Spec exists only on a branch | `focus add` refuses (`land the spec first`); the board never shows it |
| Two specs with the same rank | Ordered by spec name; `--after` puts the moved spec at the midpoint to the next higher distinct rank |
| Malformed `focus:` (not a number ≥ 0) | Skipped by the board; doctor and spec-file hook error; `focus add`/`move` overwrite it |
| Paused focus spec | Row with `now: paused` |
| Finished on base, linked PR open | Row with `now: merging #n` |
| Finished, no open linked PR; or `abandoned` / `good-enough` | Hidden; `focus:` stays in its meta, harmless |
| Sessions unreadable | Who cell shows only claims/PRs; footer keeps `sessions unavailable: …`; nothing is called idle |
| Session in another repo | Not on this board at all |
| `--local` / gh unavailable | PRs omitted from who cells; footer's `PRs unavailable` line as today |
| A tree touches two focus specs, session has no claim and no launch name | `other sessions` |
| Session in the main checkout with no claim and a derived name | `other sessions` (main never attributes by tree) |
| Main rejects the writer's push (branch protection, offline) | `focus: push to <default> refused: …`; nothing written locally |
| Teammate's git name and gh login don't share a prefix | Their claims and PRs show under two names; harmless, documented in `list.md` |
