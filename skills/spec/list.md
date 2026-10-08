# List Mode

Answers "what can I start next, what waits on what, and what's open": a board of every open phase across every spec, or the table of open specs and backlog ideas. No briefing and no questions. Print the result and stop.

## 1. Run the tool

| The user asked for | Run |
|---|---|
| `/spec list` (nothing after it) | `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts list` — the board |
| One lane: `focus`, `ready`, `blocked`, `in flight` / `flight`, `needs you` / `you` | `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts board <focus\|ready\|blocked\|flight\|you>` — that lane, uncapped |
| "my focus", "what am I on" | `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts board focus --who me` |
| "what's Taras on", "Taras's focus" | `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts board focus --who taras` |
| `table`, `all`, or any other filter | `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts list [table] [all] [<filter>]` — the table |

**The board** reads `origin/<default>` (fetched, 10 s timeout) plus every worktree's unmerged spec docs, so it is the same from any checkout or worktree (the current one is marked `◀ here`). Lanes: FOCUS first, when any spec has `focus:` (one row per focus spec in focus order: progress, what is happening now — executing, ready, needs deploy, blocked, paused, or `merging #n` while a finished spec's linked PR is open — and who is on it, per person, me first: `<person>: <sessions> · <claims> · <PRs>`, from this repo's sessions on this machine, other machines' claims and the open PRs its `pr-opening.md` links, by author; an owner with nobody on the row shows as `— (<owner>)`; `other sessions:` lists this repo's other sessions), in flight (phases ticked or half-done in a worktree), ready (ranked: focus specs first, by focus position and marked `focus <n>`; then overdue, priority, due, unblocks most, recently updated; ★ = shares no files with anything in flight; a phase whose need is ticked only in one worktree is ready `in <worktree>`; a spec only on a branch says `only on <branch>`), blocked (with the reasons), needs you (overdue work, a done phase another one waits to see deployed, a session idle 2+ days that still holds a live claim). The header says when origin couldn't be fetched. If the board can't be built (not a git repo, no origin), the tool prints the table and a `board unavailable: <reason>` line.

**The table**:
- **No filter** (`list table`): the top 30 open specs plus every open backlog idea.
- **`<filter>`**: keeps specs whose status, priority, area, domain or scope equals it, or whose name contains it. Ideas are kept when a tag or the priority equals it, or the slug or title contains it. A filter shows every match, with no cap.
- **`all`**: adds finished specs (`done`, `good-enough`, `abandoned`, or every phase ticked).
- Order: open before finished, then `p1` → `p3` → no priority, then the nearest due day, then the most recently updated. A due day that has passed shows `⚠ overdue`.

**`--who`** keeps the focus rows a person owns (`owner:`) or works on; a name matches by prefix, so `taras` finds `Taras Korpach` and `taraskorpach`. When it prints `none`, the person may be on specs outside the focus set: run `spec.ts board flight --json` and list the rows whose `holder` starts with their name (`<user>@<host>`, another machine's claim). Someone whose git name and gh login share no prefix shows under two names; say so if both appear.

**For another agent or skill**: `spec.ts board --json [--local]` is the board model (`{ board }`, or `{ board: null, error }`); `spec.ts list --json [<filter>]` is the table's data. `--local` skips the fetch.

Print the tool's output exactly as given, code fence included. Don't recast it as cards or bullets.

**Starting rows.** When the user then says "start 1", "start 1 and 2" or "go" about board rows, launch them exactly as SKILL.md → *Next sessions* step 3 says: `launch execute <spec> <phase>` per row, which places each tree first.

**Idle claims.** `claim idle 3d  <spec> · <phases> → switch to <session> or take it over` means a session on this machine still runs and holds those phases, but has done nothing for 2+ days (a forgotten tab). Busy sessions are never listed. It is not stale: nothing frees it on its own. Offer the two actions:
- "switch to it": name the tab (`<session>` is its title) so the user finishes or hands off there.
- "take it over": `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts claim take <spec> <phase> --take-over`, once per phase, only on the user's word. `claim release` can't help: it frees only the calling session's own claims.

## Focus

The team's focus set is a `focus: <rank>` line in each focus spec's `CLAUDE.md` on the default branch (lower = higher). Change it only when the user says so: every write lands on `origin/<default>` at once, one commit, for the whole team.

| The user says | Run |
|---|---|
| "focus on X", "add X to focus" | `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts focus add X` (last) |
| "put X on top" | `focus add X --top`, or `focus move X --top` when X is already in focus |
| "X after Y" | `focus add X --after Y`, or `focus move X --after Y` |
| "drop X from focus" | `focus drop X` |

Print the tool's line. A refusal (`focus add: …`, `focus: push to main refused: …`) means nothing was written; pass it on. "X is Taras's" is not a focus write: set `owner: taras` in X's `CLAUDE.md` with an ordinary spec-doc edit.

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
