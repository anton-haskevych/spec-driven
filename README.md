# spec-driven

A spec-driven development toolkit for [Claude Code](https://claude.ai/code). Write specifications first, review them with an expert panel, then implement with confidence.

## The workflow

```
Prep → Create → Review → Implement → Update → Handoff → Resume → ...
```

This plugin gives you the complete lifecycle:

| Step | What you do | What the plugin provides |
|------|------------|------------------------|
| **Prep** | `/spec prep my-feature` | Pre-spec reconnaissance. Align on the *real* change, scaffold the folder + a ≤30-line `product-brief.md` (business only, no code), then fan out adaptive recon waves (read-only Explore agents) across two lenses — **implementation** (seam, reuse, blast radius, tests) then **craft** (naming, fixtures, extraction-for-reuse) — locking ground truth into `research/`. One hard stop — right after the brief. |
| **Create** | `/spec my-feature` | Interactive spec creation — decisions, wireframes, API contracts, per-phase plans. Consumes prep's brief + research when present; otherwise cold-discovers. |
| **Review** | `/spec my-feature` + "review" | 5 expert agents evaluate the spec in parallel; the main thread verifies their claims against code, synthesizes the verdict itself, and pauses once to put genuine forks (contradictions, cross-spec scope moves, rethink verdicts) to you with a recommendation. Then it writes immutable `reviews/<date>.md`, applies findings to the spec + ledger, and commits as one `[review]` commit |
| **Update** | `/spec my-feature` + "update" | Checks off sub-items inside phase entries, captures durable learnings as ledger entries, updates the code map |
| **Status** | `/spec my-feature status` | Print a 4-column phase snapshot — Phase, Status (`✅ done` / `🟡 WIP (x/y)` / `🟢 active` / `⬜ pending`), Delivers, Work — without the resume briefing. `active` is reserved for the first unchecked phase; later unchecked phases are `pending`. `Work` falls back to `N/A` if the phase has no implementation guidance. Format is a markdown table — never cards or vertical lists. |
| **Handoff** | `/spec my-feature` + "handoff" | Reflects on the session and redirects findings: durable learnings → ledger, pending state → `in-flight.md`. Commits and signals. |
| **Resume** | `/spec my-feature` | Two-stage. Stage A: prints the status table, reads `in-flight.md` if present, suggests the next chunk, halts. Stage B (only on confirmation): loads stable references + the active phase entry + filtered ledger + scoped code-map, then hands off to **execute** mode. |
| **Execute** | `/spec execute my-feature` (or entered automatically from Resume Stage B) | Inner work loop. Invoked directly it skips Stage A's halt — picks the next unchecked chunk (or the one you name: `/spec execute my-feature phase 3a`), loads Stage B context itself, then starts working. Decompose the chunk into testable units, run red→green→commit per unit, update the phase entry's sub-checkboxes, add ledger entries for durable learnings, and trigger `/spec handoff` at a clean boundary once the stopping rule fires — three chunks done, the conversation compacted, or the next chunk belongs to another phase. |

No arguments required for the feature name — the `/spec` skill infers it from conversation context. **Sub-commands** (`prep`, `create`, `resume`, `execute`, `review`, `update`, `handoff`, `status`, `list`) can lead or trail the feature name: `/spec resume my-feature`, `/spec my-feature resume`, or `/spec resume` (alone, with the feature inferred from context) all work.

### Why prep first

A spec is only as good as the facts under it. Writing `technical.md` and phase plans straight from a customer ask bakes in assumptions — the wrong gate, a reinvented mechanism, an unseen blast radius. Prep front-loads the grounding: a frozen ≤30-line business brief becomes the contract, then read-only Explore agents fan out in adaptive waves — each wave aimed by the last one's findings at whatever's still unknown — until the codebase ground truth is *locked* into `research/` — across two lenses: **implementation** (where the change lives, what to reuse, blast radius) and **craft** (naming, test fixtures, extraction-for-reuse), so the result reads like the codebase wrote it. Only then does `/spec create` write the spec, citing verified `file:line` facts instead of guesses. The single human checkpoint sits where it matters most: right after the brief, before any token is spent on recon.

### Why two-stage resume

A non-trivial spec carries hundreds of KB across `design.md`, `technical.md`, ledger entries, and per-phase plans. Loading all of it on every `/spec resume` burns 100K+ tokens before any work starts.

Stage A reads only `progress.md` and per-phase Goal/Implementation lines — same materials as `/spec status`. The user sees the full picture (table + suggested next chunk) and decides what to work on. Stage A renders bullets, not paragraphs — every line earns its place, and there's no magic-word CTA: any natural confirmation ("yep", "go ahead", "do this phase") triggers Stage B. Stage B then loads the focused subset relevant to that decision and hands off to **execute** mode, which runs the per-unit TDD loop and ends the session cleanly via `/spec handoff` on signals it can observe — chunks completed, compaction, a phase change — rather than a token count it can't measure.

## The review panel

When you trigger a review, 5 agents launch in parallel:

| Agent | Central question | What it catches |
|-------|-----------------|----------------|
| **principal-engineer** | Is this fundamentally right? | Wrong-layer fixes, premature abstractions, tech debt traps |
| **integration-architect** | How does this fit? | Boundary violations, data flow breaks, blast radius |
| **adversarial-tester** | What will break? | Edge cases, lifecycle state leaks, concurrency, null guards |
| **code-quality-reviewer** | How does this affect code quality? | God objects, duplicated logic, testability gaps |
| **prior-art-reviewer** | Does the system already do this? | Reinvented wheels, grandfathered decisions, hand-built defenses an existing mechanism makes structurally unnecessary, misplaced ownership |

After all 5 return, **the main thread synthesizes — no synthesizer agent.** It verifies load-bearing claims against the real code, deduplicates, classifies signal (consensus / unique-insight / contradiction / superseded), and weighs severity on consequence. Mechanism-level forks it resolves itself and states; genuine forks — reviewers contradicting on a design decision, scope moving between specs, a "the approach is wrong" verdict — it puts to you in one message with a recommendation, and waits.

With the forks answered, the review finishes itself: spec corrections are applied directly, cross-phase learnings become ledger entries, every answered fork becomes a `decision` entry, and everything lands in a single `[review] <spec-name>: <slug>` commit. The run ends with a compact report — what was found, what was applied, what you decided, what it decided for you.

Why no synthesizer agent: a hand-off compresses forty findings into an output budget and hides the reasoning in a context you can't inspect. The thread that will apply the edits should be the one that did the weighing.

## Standalone agents

| Agent | Role | When to use |
|-------|------|-------------|
| **deep-research-analyst** | Comprehensive research | Before creating a spec — gathers info from multiple sources |
| **debugger** | Root-cause diagnosis | During implementation — traces to the originating defect, never modifies code |

## Included skills

| Skill | Used by | Purpose |
|-------|---------|---------|
| **spec** | You (via `/spec`) | The core spec lifecycle — prep, create, review, update, status, resume, execute, handoff |
| **code-quality-review** | code-quality-reviewer agent | Deep quality review framework |
| **phase-preflight** | You (via `/spec-driven:phase-preflight`) and `execute` mode (*Preflight the plan*, a mandatory gate before decomposition) | Pre-implementation review of a planned chunk against house idioms + named canon, every finding anchored to `file:line` |
| **structural-principles** | code-quality-reviewer agent | Mechanism vs business logic classification, size gates |

**Optional companion:** execute mode's phase-seam recon uses the `explore-waves` skill when it is installed, and falls back to running the same read-only Explore-agent waves inline when it isn't.

The `spec` skill ships an `engineering-principles` reference (`skills/spec/principles.md`) that **execute** mode loads at the start of every chunk. 18 rules covering self-documenting code, hard size caps (function < 50 lines, file < 250 lines), extract-on-second-use with mandatory unit tests, frontend layered separation (with backend deferring to project-specific rules), and the rest of the engineering hygiene the workflow enforces.

## Install

```bash
/plugin marketplace add anton-haskevych/spec-driven
/plugin install spec-driven
```

## Session lifecycle and tools

One fresh session per chunk: `/spec resume <name>` (or `execute`) → work → `/spec handoff` → end the session. The `/spec` invocation ties the session to the spec; nothing is inferred from branches or worktrees.

The skill ships small Bun scripts in `skills/spec/tools/` that Claude and hooks call. You never run them. They need [Bun](https://bun.com) on `PATH`; without it every step falls back to reading files.

- **Spec-file check:** a PostToolUse hook declared in the skill's frontmatter. It registers only once `/spec` is invoked, so other sessions get no hooks and no extra context. After a write to a spec's `CLAUDE.md` or a ledger entry, it sends broken frontmatter back to Claude, for example a `status` the project's `.claude/taxonomy.md` doesn't allow.
- **Context pack:** when `/spec resume|status|execute <name>` loads, the skill injects a `<spec-pack>`. It holds the rendered status table, the next chunk, and for execute the picked phase entry, the phase-scoped ledger rows and matching code-map rows. Sessions start working instead of reading 10+ files.
- **Project ledger:** `docs/specs/_ledger/` holds codebase lessons that any spec can hit, with `paths:` globs and `seen-in:` specs. Before writing a general lesson, Claude checks for a similar one and records the spec on it instead of writing a duplicate. A PreToolUse hook, also scoped to `/spec` sessions, adds matching lessons as context before Claude edits a file those globs cover. Each lesson is shown once per session, at most 3 per edit.
- **Doctor:** a drift check that runs at handoff. It compares frontmatter against the taxonomy, the ledger against its INDEX, `progress.md` boxes against phase entries, and checks for stale `in-flight.md`.

Development: `bun install`, `bun test`, `bun run typecheck`. See [ROADMAP.md](ROADMAP.md) for the planned releases.

## Release

Set every Claude, Codex, and marketplace version declaration with one command:

```bash
python3 scripts/version.py --set <version>
```

CI runs the same command in check mode and rejects split-version releases.

## Spec file structure

Each spec lives in `docs/specs/<feature-name>/`. The layout separates **stable reference** (brief, design, technical), **thin index** (progress), **per-phase detail** (phases folder), **forward-propagating learnings** (ledger), and **ephemeral state** (in-flight):

```
docs/specs/<feature-name>/
├── CLAUDE.md               # metadata + relationship to code
├── product-brief.md        # business intent (≤30 lines, no code) — by prep
├── design.md               # stable reference — problem, decisions, UX
├── technical.md            # stable reference — contracts, architecture
├── progress.md             # thin index: phase list + checkboxes + pointers
├── pr-opening.md           # PR-readiness gate: spec state + pre-PR checks (not a phase)
├── code-map.md             # load-bearing files inventory
├── in-flight.md            # ephemeral pending work (on-demand)
├── phases/                 # per-phase detail (see below)
│   ├── phase-1-<slug>.md   #   flat file — small phase
│   └── phase-8-<slug>/     #   folder — complex phase with supplementary files
│       ├── plan.md
│       └── ...
├── reviews/                # on-demand — dated YYYY-MM-DD-<slug>.md, immutable
├── research/               # on-demand, immutable — prep snapshots at the root,
│   └── phase-<N>/          #   per-chunk execute recon + preflight notes
└── ledger/                 # forward-propagating learnings
    ├── INDEX.md            # warm cache — one row per entry with [applies-to] tag
    └── <kind>-<slug>.md    # kinds: gotcha, principle, domain, decision, workaround, …
```

### The ledger model

The ledger holds small files, each one a durable learning that forward-propagates across phases. Entries are tagged with `applies-to:` scopes (`[general]`, `[phase 5+]`, `[phase 6, 7]`, `[general, load-bearing]`) and indexed in `ledger/INDEX.md` as the warm cache. When resuming work, the skill filters the index by the active phase's scope and opens only the relevant entries — so a new session never has to scan the whole ledger or read a bloated progress file.

### Per-phase shape

Every phase lives in its own entry inside `phases/`. Small phases are flat `.md` files. Complex phases are folders containing `plan.md` plus supplementary files (tier breakdowns, sub-plans, wireframes, fixture notes). A phase can start as a flat file and be promoted to a folder later, when it outgrows single-file scale. `progress.md` points at each phase with a direct path, so resume always knows where to go.

### Phases are code-only — verification lives in `pr-opening.md`

A phase is a unit of code that ships and leaves the tree functional and tested. Verification, manual QA, and opening the PR are **not** phases — a "Phase 5 — Verification" is a smell. They live in **`pr-opening.md`**, a per-spec gate with two sections: a **Spec state** (<20 lines: phases done/left, branch, PR link, suggested PR split) kept current by execute/handoff, and **Pre-PR checks** — checkboxes scoped to the subprojects the spec touches (backend tests, frontend lint+compile, feature e2e, …), ticked before the *draft* PR opens, never straight to `main`. Sub-checkboxes inside a phase are each sized to one TDD commit (red → change → green → commit).

### Handoff redirects the brain dump

The handoff "brain dump" that reflects on a session — business decisions, problems encountered, reasoning behind approach changes — is not appended to `progress.md`. Instead it's **redirected**: durable learnings become ledger entries (`decision-*`, `gotcha-*`, `principle-*`, `domain-*`), and ephemeral "pick up from here" state goes to `in-flight.md`. Nothing gets lost; nothing bloats.

### Legacy specs

Specs created before this layout are detected by the absence of `ledger/INDEX.md` and handled by `skills/spec/legacy-layout.md` — a reference the agent loads only on detection. No migration; legacy content is never rewritten, and `update` can create a `ledger/` on request so old specs adopt the new model incrementally.

## Customization

### Project-specific overrides

Create `.claude/agents/<agent-name>.md` or `.claude/skills/spec/` in your project to override any agent or skill with a project-specific version. Project-level definitions (priority 3) automatically override plugin definitions (priority 5).

Example: your project's `.claude/agents/adversarial-tester.md` can include domain-specific entity states, lifecycle patterns, and common bug references.

### Taxonomy

The plugin ships with a generic taxonomy (status, scope, area, domain). To customize for your project, create `.claude/taxonomy.md` with your own controlled vocabulary — the spec skill will pick it up automatically.

### Priority order

```
Project (3) > User (4) > Plugin (5)
```

## License

Apache 2.0
