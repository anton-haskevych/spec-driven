# List Mode

Answers "what's open and what matters most": open specs and backlog ideas, sorted by priority. No briefing and no questions. Print the result and stop.

## 1. Run the tool

```bash
bun ${CLAUDE_SKILL_DIR}/tools/spec.ts list [all] [<filter>]
```

- **No arguments**: the top 30 open specs plus every open backlog idea.
- **`<filter>`** (whatever follows `list`): keeps specs whose status, priority, area, domain or scope equals it, or whose name contains it. Ideas are kept when a tag or the priority equals it, or the slug or title contains it. A filter shows every match, with no cap.
- **`all`**: adds finished specs (`done`, `good-enough`, `abandoned`, or every phase ticked).
- **`--json`**: the same data for another agent, a skill or an MCP. Use it when a flow needs to read the list, not show it.

Order: open before finished, then `p1` → `p3` → no priority, then the nearest due day, then the most recently updated. A due day that has passed shows `⚠ overdue`.

Print the tool's output exactly as given. Don't recast it as cards or bullets.

## 2. Without Bun

Glob `docs/specs/*/CLAUDE.md` and `*/docs/specs/*/CLAUDE.md`, skipping folders that start with `_`. Read each file's frontmatter and its `progress.md` phase lines, then read `docs/specs/_backlog/*.md`. Render the same two tables:

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
