# List Mode

Answers "what can I start next, what waits on what, and what's open": a board of every open phase across every spec, or the table of open specs and backlog ideas. No briefing and no questions. Print the result and stop.

## 1. Run the tool

| The user asked for | Run |
|---|---|
| `/spec list` (nothing after it) | `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts list` — the board |
| One lane: `ready`, `blocked`, `in flight` / `flight`, `needs you` / `you` | `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts board <ready\|blocked\|flight\|you>` — that lane, uncapped |
| `table`, `all`, or any other filter | `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts list [table] [all] [<filter>]` — the table |

**The board** reads `origin/<default>` (fetched, 10 s timeout), so it is the same from any checkout or worktree. Lanes: in flight, ready (ranked: overdue, priority, due, unblocks most, recently updated), blocked (with the reasons), needs you (overdue work, a done phase another one waits to see deployed). The header says when origin couldn't be fetched. If the board can't be built (not a git repo, no origin), the tool prints the table and a `board unavailable: <reason>` line.

**The table**:
- **No filter** (`list table`): the top 30 open specs plus every open backlog idea.
- **`<filter>`**: keeps specs whose status, priority, area, domain or scope equals it, or whose name contains it. Ideas are kept when a tag or the priority equals it, or the slug or title contains it. A filter shows every match, with no cap.
- **`all`**: adds finished specs (`done`, `good-enough`, `abandoned`, or every phase ticked).
- Order: open before finished, then `p1` → `p3` → no priority, then the nearest due day, then the most recently updated. A due day that has passed shows `⚠ overdue`.

**For another agent or skill**: `spec.ts board --json [--local]` is the board model (`{ board }`, or `{ board: null, error }`); `spec.ts list --json [<filter>]` is the table's data. `--local` skips the fetch.

Print the tool's output exactly as given, code fence included. Don't recast it as cards or bullets.

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
