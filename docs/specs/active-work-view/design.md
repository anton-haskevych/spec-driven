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

| # | Decision | What we chose | Rejected alternative | Why |
|---|----------|---------------|----------------------|-----|
| 1 | Name of the concept | **focus** (`_focus/` folder, `FOCUS` section, `board focus`, `spec.ts focus`) | "now", "shipping", "active" | "active" already means nothing (186 specs). "focus" is the user's word for it, short, and unused as an identifier. The prose "Currently focused: Phase N" in `status.md` is a different file and stays |
| 2 | Where the set lives | **One file per spec**: `docs/specs/_focus/<spec>.md` with `rank:` (+ optional `who:`) | (a) `focus: <rank>` frontmatter in each spec's `CLAUDE.md`; (b) a list in `_playbook/settings.md` | (b) is the shared-append file the project retired (`gotcha-github-ignores-merge-union`): two people adding on branches conflict. (a) spreads one ranking over N `CLAUDE.md`s that every session on that spec also bumps, and branch edits to existing specs' meta never reach the board (`workspaces/views.ts` overlays only state). Per-entry files reuse the backlog pattern, are in the base `READ_SET` already, and two people adding different specs never touch the same file |
| 3 | Order | Integer `rank:`, ascending, ties by spec name. New entries go last (max + 10); "top" = min − 10; "after X" = midpoint, renumbering only the files between when no gap is left | Filename order; a fractional/lexicographic key | Gaps of 10 make every common move a one-file write (no conflict surface). Integers stay readable when someone opens the file |
| 4 | Who a focus spec belongs to | Optional `who:` with any name of the person (gh login preferred). Matched by **normalized prefix**: lowercase, drop non-alphanumerics, one side a prefix of the other | (a) A `_people/` alias file; (b) exact gh login only; (c) a field named `owner` | Real data: git author "Taras Korpach" → `taraskorpach` = gh login `taraskorpach`; "anton-haskevych" = login `anton-haskevych`. Normalized prefix joins git names, logins and first names ("taras") with no config. (a) is machinery for a 2-person team. (c) collides with `ownerOf` (a path's worktree) |
| 5 | Who "me" is | Local claims and this machine's sessions are always mine. For PRs and remote claims: the normalized git author name (`git var GIT_AUTHOR_IDENT`, already read by `readHolder`) | `gh api user` per board run | No extra network call; the board budget is < 5 s (`decision-board-timing-accepted`). Same normalization as #4 |
| 6 | Session → spec | In order: (1) the session holds a claim on the spec; (2) its cwd is in a worktree whose spec changes name exactly one spec; (3) its name parses as launch's `<spec> <sub-command> [<phase>]` with `<spec>` a known spec. Every session that matches is shown, not just the newest per tree. The rest count under "other sessions" | Branch names; transcript `gitBranch`; newest-per-tree (today) | ROADMAP rule: no branch-to-spec mapping (and the two developers' conventions differ). Transcripts are large and undocumented. Newest-per-tree hides execute 8, 9 and 10 sharing one tree |
| 7 | Teammate's work | Remote claims (exist) + open PRs linked from the spec's `pr-opening.md` (`prLinks`), labelled by PR author when it isn't me | Reading origin branches; `gh pr list --author` per person | No branch mapping (rule). One field (`author`) on the existing `gh pr list` call costs nothing extra |
| 8 | A live claim whose session is idle | New needs-you kind `idle-claim` after **2 days** idle (`IDLE_CLAIM_DAYS`), copy `claim idle 3d → resume or release` | Calling it "stale"; reusing `REMOTE_CLAIM_STALE_DAYS` (3) | `isStale` already means "safe to take over"; an idle live claim is not that. 2 days: an overnight pause is normal, a weekend-plus is not |
| 9 | Shipped focus specs | Hidden from FOCUS once finished; needs-you `focus-shipped` row `shipped → drop from focus`; handoff drops the entry when its spec's last phase lands | Auto-delete on read; keep showing as done | The board never writes. A row tells the team, and handoff already writes spec docs at that moment |
| 10 | Focus vs the rest of the board | FOCUS is a new lane, printed first; the other lanes are unchanged. Ready rows rank focus specs first (by focus rank), then today's order | (a) A separate command; (b) filter the board to focus specs only | (a) breaks "no new user command". (b) loses the blocked/needs-you picture. Ranking focus first makes *Next sessions* and "what's next" recommend focus work with no prose change |
| 11 | Filter mine / a teammate's | `board focus --who <name\|me>`; Claude maps "my focus", "what's Taras on" to it (`list.md`) | `list mine` / `list <name>` words | Free words on `list` are the table filter, and idea/prep dedupe pass free words there (`decision-board-command-surface`) |
| 12 | Writing the set | `spec.ts focus add|drop|move` (validated, one file per write), called by Claude on the user's words; landed like spec docs | Claude hand-writes files (backlog style) | Rank arithmetic and renumbering are easy to get wrong by hand; a validated writer keeps one-file writes. Landing reuses `publish-docs` (carries any `docs/specs/**` path) |
| 13 | JSON | Additive: `lanes.focus`, `footer.otherSessions`, two attention kinds. `BOARD_VERSION` stays 1 | Bump to 2 | Precedent `decision-remote-claims-landing-shape`: additive fields don't break readers |
| 14 | No focus set | FOCUS lane omitted entirely; the board prints exactly as today | An empty "FOCUS none" lane | The brief: solo users and repos without a set see no change |

## Core flow

```
Anton: "put multi-location-studios and cross-studio on top of focus"
  Claude ─► spec.ts focus add multi-location-studios --top      (writes _focus/multi-location-studios.md)
         ─► spec.ts focus add cross-studio --after multi-location-studios
         ─► commit "[focus] …" ─► land (publish-docs / push docs to main)
Taras (later, any session): /spec list
  board ─► reads origin/main _focus/*.md ─► same FOCUS order on both machines
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
  …
  other sessions: crm-d1 busy 4h, crm-82 idle 6h, crm-ac idle 3d

IN FLIGHT
  … (unchanged)

READY   ★ = shares no files with anything in flight
  1 ★  cross-studio · 3            /spec execute  p1         focus 2
  …

NEEDS YOU
  claim idle 3d          recurring-series-lifecycle-clarity · 7 → resume or release
  shipped                getting-started → drop from focus
  …
```

- Columns: focus rank · spec (`⚠` when overdue) · progress `done/total` (`prep` / `draft` for specs
  without phases) · **now** · **who**. Due day after `now` when set and not overdue.
- **now** (first match): `executing <ids>` / flight `next` text (in flight) → `ready <ids>` (max 3, then
  `+N`) or `ready: /spec create` / `ready: /spec prep` → `needs deploy of <ids>` → `blocked: <first
  reason>` → `not on main` (spec only on a branch) → `unknown spec` (no such spec; doctor errors).
- **who**: per person, `<name>: <sessions> · <claims> · <PRs>`, people sorted me first.
  Session: `<sub> <phase> <status> <ago>` from the launch name, else `<session label> <status> <ago>`.
  Remote claims collapse to `N claims <age>` when more than 2. PRs: `#<n>` + `draft` / `N failing` /
  `checks pass`. Nothing known → `—`.
- `who:` from the entry shows when nobody is on it: `— (taras)`.
- `other sessions:` lists sessions attributed to no focus spec, at most 5, then `+N`. Omitted when none.

## `board focus` and `--who`

```
$ spec.ts board focus --who taras
FOCUS · taras
  6  gift-cards                      0/9   in flight 1, 2, 3, 4a           taras: 4 claims 2d · #904 #905 draft
```

`--who` keeps rows whose entry `who:` matches or where that person appears in the who cell. `--who me`
uses the identity from decision 5. No match → `FOCUS · <name>\n  none`.

## Copy

| Where | Text |
|---|---|
| Lane title | `FOCUS` (filtered: `FOCUS · <name>`) |
| Header count | `<n> focus · ` prefix, only when the set is non-empty |
| Attention, idle claim | `claim idle <ago>` · `<spec> · <phase> → resume or release` |
| Attention, shipped | `shipped` · `<spec> → drop from focus` |
| Writer success | `focus: added <spec> at <position>/<total>` · `focus: dropped <spec>` · `focus: moved <spec> to <position>/<total>` |
| Writer refusals | `focus add: no spec named <x>` · `focus add: <x> is already in focus (rank <n>)` · `focus drop: <x> is not in focus` · `focus move: --after <y>: <y> is not in focus` |

## Edge cases

| Case | Behavior |
|---|---|
| No `_focus/` folder or it's empty | No FOCUS lane, no header count; board identical to today |
| Entry for a spec that doesn't exist (renamed/deleted) | Row `unknown spec`; doctor error; writer `drop` still works |
| Entry exists only on a branch | Not shown until it reaches the default branch (board truth is base, spec-board decision 4); `publish-docs` lands it at handoff, or Claude lands it right after writing |
| Two entries with the same rank | Ordered by spec name; doctor warning |
| Malformed entry (bad rank) | Skipped by the loader; doctor and spec-file hook error |
| Sessions unreadable | Who cell shows only claims/PRs; footer keeps `sessions unavailable: …`; nothing is called idle |
| `--local` / gh unavailable | PRs omitted from who cells; footer's `PRs unavailable` line as today |
| Same session matches two focus specs (tree touches both) | Rule 3 (name) decides; if it doesn't, the session counts under "other sessions" |
| A session in the main checkout with no claim and a derived name | "other sessions" |
| A spec finished but still in focus | Hidden from FOCUS; `shipped` row |
| Teammate's git name and gh login don't share a prefix | Shown under both names; fix by writing their gh login in `who:` and matching on it (documented in `list.md`) |
