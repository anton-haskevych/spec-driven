# Focus bands — exploration (2026-10-08)

Three waves of read-only explorers, run while seeding CRM's focus set (phase 6). Anton asked for tiers
that Taras could understand, and asked us to learn the plugin before proposing anything. This note
records what the waves found. The decision is `ledger/decision-focus-is-a-band.md`.

## Words already taken (plugin)

- **now:** the FOCUS row's column (`FocusNow`, `model.ts:79-88`) and `Ready now:` (`ready/render.ts:6`).
- **next:** `Next sessions:` (`SKILL.md`), `ReadyRow.next` / `NextStep` (`model.ts:40-46`), and resume's
  `Suggested next:`.
- **backlog:** un-specced ideas. The folder is `docs/specs/_backlog/`, the table heading is
  `## Backlog (N)`, and the board footer says `N backlog ideas`.
- **lane:** the board's sections (`render.ts:5-6`).
- **active / focused:** each already has two meanings (spec status vs. phase status; team `focus:` vs.
  status mode's "Currently focused: Phase N").
- **Free:** tier (only "multi-tier phases" in prose), later, sprint, milestone, must / should / could.

## Priority today

- `core/schedule.ts:3`: `PRIORITIES = p1, p2, p3`. It is the single source and is case-insensitive.
  It is also parsed on phases (`lanes.ts:147`), which the docs don't mention.
- No document defines what each level means. The only rules are "only if the user said how urgent"
  and "never invent urgency" (`idea.md:16,23`; `SKILL.md:350`).
- CRM on origin/main, 2026-10-08:
  - 189 open specs, of which 22 have a priority: 20 p1, 2 p2, 0 p3.
  - 59 backlog ideas, of which 30 have a priority: 7 p1, 9 p2, 14 p3.
  - All 31 commits that add priority, due or focus to a spec are Anton's.
  - Taras has never set `priority`, `due`, `focus` or `owner` on a spec, and his last 30 PR bodies never
    use priority words.
- The board lists all three in the table but has no meaning for any of them.

## Earlier decisions

- **Focus ≠ priority** (`decision-focus-is-not-priority`). A "focus spec should be p1" coupling was
  rejected because it would recreate the 22-p1 problem.
- **The 2.28–2.30 plan** (specs replace Linear, https://claude.ai/artifact/MuwvKTZM6Tnnxqvjsqijbi) lists
  under not doing: "No status pipeline or cycles", "No owner by default".
- **Out of scope:**
  - `spec-board/product-brief.md:41-42`: limits on how much can be in flight; re-labelling priorities.
  - `active-work-view/product-brief.md:42`: re-tagging other specs.
- **Linear** was an add-on to the spec workflow and was barely used (Anton, 2026-10-08). The
  engineering team ran with "No cycles/sprints" (CRM `.claude/skills/linear/references/engineering.md:9`),
  and `/linear migrate` carries over only the due date.

## Cadence precedent (CRM)

- `docs/growth/README.md:40`: "Weekly (Wednesday, 30 minutes, Anton and Maksym) … Pick 2 or 3 pieces to
  go live by next Wednesday." This is the team's only selection ritual.
- `docs/backlog/README.md:5-13`: the commitment ladder. `docs/backlog/` (someday) → `_backlog/`
  (committed, small) → spec.
- Engineering has no written rule for what to pick next.

## Fit and cost

- **Ranks conflict with any grouping.** `rankFor` (`focus/rank.ts:21-32`) works on one global order, so
  `--after` across groups breaks. `focusPosition` and `ReadyRow.focus` are global positions.
- **"Kind of work" can't be read from the taxonomy.** The five DX specs share no scope, area or domain
  value that product specs lack (`improvement` and `platform` appear on both). Taxonomy values are
  multi-value, and the board ignores them.
- **Priority is one field away on `FocusRow`.** `specSummary` already returns it, and `focus.ts:56`
  drops it.
- **`FocusRow.rank` readers:** only `board/focus.ts` and tests.
- **CRM's own frontmatter validator** (`ops/src/hooks/frontmatter.ts`) is wired to nothing and ignores
  unknown keys and values.
