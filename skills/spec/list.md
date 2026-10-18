# List Mode

Answers "what can I start next, what waits on what, and what's open": a board of every open phase across every spec, or the table of open specs and backlog ideas. No briefing and no questions. Print the result and stop.

## 1. Run the tool

| The user asked for | Run |
|---|---|
| `/spec list` (nothing after it) | `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts list` — the board |
| One lane: `focus`, `ready`, `blocked`, `in flight` / `flight`, `needs you` / `you` | `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts board <focus\|ready\|blocked\|flight\|you>` — that lane, uncapped |
| "what am I on", "what am I working on" | `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts board --who me` |
| "what's Taras on", "what is Taras working on" | `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts board --who taras` |
| "my focus", "Taras's focus" | `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts board focus --who <me\|taras>` |
| `table`, `all`, or any other filter | `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts list [table] [all] [<filter>]` — the table |

**The board** reads `origin/<default>` (fetched, 10 s timeout) plus every worktree's unmerged spec docs, so it is the same from any checkout or worktree (the current one is marked `◀ here`). Lanes: FOCUS first, when any spec has `focus:` (one row per focus spec under a MUST / SHOULD / COULD sub-header, numbered 1…n down the lane: progress, what is happening now — executing, ready, needs deploy, blocked, paused, or `merging #n` while a finished spec's linked PR is open — and who is on it, per person, me first: `<person>: <sessions> · <claims> · <PRs>`, from this repo's sessions on this machine, other machines' claims and the open PRs its `pr-opening.md` links, by author; an owner with nobody on the row shows as `— (<owner>)`; `other sessions:` lists this repo's other sessions), in flight (phases ticked or half-done in a worktree), ready (ranked: focus specs first, in lane order and marked with their band, `must`; then overdue, priority, due, unblocks most, recently updated; ★ = shares no files with anything in flight; a phase whose need is ticked only in one worktree is ready `in <worktree>`; a spec only on a branch says `only on <branch>`; a stale spec is one `/spec review` row marked `⚠ stale: <text>`, and its FOCUS row shows `⚠ stale`), blocked (with the reasons), needs you (overdue work, a done phase another one waits to see deployed, a session idle 2+ days that still holds a live claim). The header says when origin couldn't be fetched. If the board can't be built (not a git repo, no origin), the tool prints the table and a `board unavailable: <reason>` line.

**The table**:
- **No filter** (`list table`): the top 30 open specs plus every open backlog idea.
- **`<filter>`**: keeps specs whose status, priority, area, domain or scope equals it, or whose name contains it. Ideas are kept when a tag or the priority equals it, or the slug or title contains it. A filter shows every match, with no cap.
- **`all`**: adds finished specs (`done`, `good-enough`, `abandoned`, or every phase ticked). An abandoned spec's status reads `abandoned, superseded by <spec>` or `abandoned, dropped: <why>`.
- **Lifecycle filters**: `stale` keeps specs carrying `stale:`; `done`, `good-enough` or `abandoned` lists finished specs of that status without `all`. Both list specs only, no ideas.
- **⚠ stale**: the Status cell reads `<status> ⚠ stale: <text>` and the summary counts them.
- Order: open before finished, then `p1` → `p3` → no priority, then the nearest due day, then the most recent status change or review (`updated:`; sessions don't bump it). A due day that has passed shows `⚠ overdue`.

**`--who`** answers what a person is working on. Bare `board --who <name|me>` opens with their section, across every spec and lane: `owns` (the specs whose `owner:` names them, with each one's state), `on now` (their live claims, on any machine), `PRs` (their open PRs), and for `me` this machine's `sessions` in this repo; `—` when a part is empty. `--local` shows `owns` only. The FOCUS lane below it keeps the focus rows they own or work on (`board focus --who` prints that lane alone). A name matches by prefix, so `taras` finds `Taras Korpach` and `taraskorpach`; someone whose git name and gh login share no prefix shows under two names, so say so if both appear. `--json` carries the section as `people`.

**For another agent or skill**: `spec.ts board --json [--local]` is the board model (`{ board }`, or `{ board: null, error }`); `spec.ts list --json [<filter>]` is the table's data, with `stale`, `dropped` and `supersededBy` per spec when set. `--local` skips the fetch.

Print the tool's output exactly as given, code fence included. Don't recast it as cards or bullets.

**Starting rows.** A reply about board rows follows SKILL.md → *Next sessions* step 3.

**Idle claims.** `claim idle 3d  <spec> · <phases> → switch to <session> or take it over` means a session on this machine still runs and holds those phases, but has done nothing for 2+ days (a forgotten tab). Busy sessions are never listed. It is not stale: nothing frees it on its own. Offer the two actions:
- "switch to it": name the tab (`<session>` is its title) so the user finishes or hands off there.
- "take it over": `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts claim take <spec> <phase> --take-over`, once per phase, only on the user's word. `claim release` can't help: it frees only the calling session's own claims.

## Focus

The team's focus set is a `focus: must | should | could` line in each focus spec's `CLAUDE.md` on the default branch. The bands are MoSCoW's:

- **must**: pick first.
- **should**: committed; pick when your must is done, blocked or in review.
- **could**: when there's room, e.g. a spare parallel session or while waiting on CI.
- No `focus:` line: not in focus, MoSCoW's "won't, this time".

Inside a band the board orders specs from their data: overdue first, then due date, then priority, then name. There is no rank: to put X ahead of Y in one band, give X a due date or a higher priority.

Change the set only when the user says so: every write lands on `origin/<default>` at once, one commit, for the whole team.

| The user says | Run |
|---|---|
| "focus on X", "add X to focus", "X is a should" | `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts focus add X <band>`; no band named → `should`, and say so |
| "move X to must", "X is a must now", "X can wait" (→ `could`) | `focus move X <band>`, or `focus add X <band>` when X isn't in focus |
| "bump X up", "push X down" | `focus move X` one band up or down (must ↔ should ↔ could) |
| "drop X from focus" | `focus drop X` |

A 2.37.0 number (`focus: 10`) shows under SHOULD and the doctor warns; `focus add X <band>` rewrites it and `focus drop X` removes it.

Print the tool's line. A refusal (`focus add: …`, `focus: push to main refused: …`) means nothing was written; pass it on. "X is Taras's" is not a focus write: run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts owner X taras` ("X is mine" → `owner X me`, "X is nobody's" → `owner X none`) and print its line. Owners are spec-level and set only on someone's word, never for the spec's creator; phases and ideas carry none.

## 2. Without Bun

There is no board without Bun; print the table. Glob `docs/specs/*/CLAUDE.md` and `*/docs/specs/*/CLAUDE.md`, skipping folders that start with `_`. Read each file's frontmatter and its `progress.md` phase lines, then read `docs/specs/_backlog/*.md`. Render the same two tables:

```
## Open specs (N)

| Spec | Status | Priority | Due | Area | Domain | Updated | Progress |
|------|--------|----------|-----|------|--------|---------|----------|

## Backlog (N)

| Idea | Priority | Due | Tags | Title |
|------|----------|-----|------|-------|
```

Missing values are `—`. `Updated` is the date only. `Progress` is ticked phases over all phases.

## 3. Edge cases

- **Nothing open and no ideas**: print `No open specs or backlog items.`
- **A spec without frontmatter** (legacy): listed with `—` in its metadata cells.
