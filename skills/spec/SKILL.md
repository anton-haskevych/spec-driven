---
name: spec
description: Run pre-spec reconnaissance (prep), load an existing spec to resume work, execute the next chunk, update progress after implementation, review with the collegium panel, or create a new one. Also captures ideas into the backlog and lists what's open by priority. Use when starting a session around a feature, when the user mentions a spec by name, when asked to prep, scope, or review/critique a spec, after completing implementation work, when the user says "idea:", "add to the backlog" or "jot this down for later", or asks what's open, what's next or what matters most.
argument-hint: "prep|create|resume|execute|review|update|handoff|status|list|idea [spec-name]"
allowed-tools: Read, Glob, Grep, Write, Edit, AskUserQuestion, Bash, Agent
hooks:
  PreToolUse:
    - matcher: "Write|Edit|MultiEdit"
      hooks:
        - type: command
          command: 'command -v bun >/dev/null 2>&1 && [ -n "$CLAUDE_PLUGIN_ROOT" ] && bun "$CLAUDE_PLUGIN_ROOT/skills/spec/tools/hooks/lesson-recall.ts" || true'
          timeout: 10
  PostToolUse:
    - matcher: "Write|Edit|MultiEdit"
      hooks:
        - type: command
          command: 'command -v bun >/dev/null 2>&1 && [ -n "$CLAUDE_PLUGIN_ROOT" ] && bun "$CLAUDE_PLUGIN_ROOT/skills/spec/tools/hooks/spec-file-check.ts" || true'
          timeout: 10
---

# /spec — Feature Spec (Resume, Update, Review, Handoff, or Create)

!`cat ${CLAUDE_SKILL_DIR}/taxonomy.md`

!`cat .claude/taxonomy.md 2>/dev/null || echo "No project taxonomy found — use free-form area/domain values."`

!`command -v bun >/dev/null 2>&1 && bun "${CLAUDE_SKILL_DIR}/tools/spec.ts" context - 2>/dev/null <<'SPEC_ARGS' || true
$ARGUMENTS
SPEC_ARGS`

**If `$ARGUMENTS` is empty:** Infer the feature name from the current conversation context. Propose a kebab-case slug and ask the user to confirm before proceeding.

## Sub-command parse

Before treating `$ARGUMENTS` as a feature name, check for an explicit sub-command token.

**Sub-command set:** `prep`, `create`, `resume`, `execute`, `review`, `update`, `handoff`, `status`, `list`, `idea`.

**Matching rule** (case-insensitive, whitespace-tokenized):

1. Split `$ARGUMENTS` on whitespace.
2. If the **first** token is in the sub-command set: `sub_command = first`, `feature = remaining tokens joined by space`.
3. Else if the **last** token is in the sub-command set: `sub_command = last`, `feature = all-but-last tokens joined`.
4. Else: no sub-command — fall through to `## Routing` below.

If `feature` is empty after extraction, infer it from conversation context (same rule as the empty-args branch above). Confirm with the user only if ambiguous. **Exceptions:** for `list`, an empty `feature` means "no filter"; do not infer from context. For `idea`, everything after the token is the idea's text, not a feature name.

**Exception for `execute`:** `feature` is the **first** remaining token only; any tokens after it are a **chunk hint** passed through to execute mode (`/spec execute my-feature phase 3a` → feature `my-feature`, hint `phase 3a`). If the first remaining token is itself a chunk reference (`phase …`, a bare number, `next`), the whole remainder is the hint and `feature` is inferred from context.

**Dispatch:**

| Token | Action |
|-------|--------|
| `prep` | Read [prep.md](prep.md) and follow it. Pre-spec reconnaissance: align on the real change, scaffold the folder + `product-brief.md`, then fan out recon waves into `research/`. Hands off to `create`. |
| `create` | If `docs/specs/<feature>/` already exists **as a full spec** (has `progress.md`), refuse with: `Spec '<feature>' already exists at docs/specs/<feature>/. Use /spec <feature> to resume, or remove the folder first.` If it exists in **prep stage** (only `product-brief.md`/`research/`, no `progress.md`), proceed — read [create.md](create.md); it consumes the prep output. Otherwise (fresh) read [create.md](create.md) and follow it. |
| `resume` | Read [resume.md](resume.md) and follow it. |
| `execute` | Read [execute.md](execute.md) and follow it, starting at its *Entry* section (direct entry) — it runs *Preconditions*, picks the chunk (honouring any chunk hint), loads Stage B context itself, then runs the work loop (principles → recon → preflight → decompose → TDD). Skips Stage A's halt: typing `execute` **is** the confirmation. |
| `review` | Read [review.md](review.md) and follow it. |
| `update` | Read [update.md](update.md) and follow it. |
| `handoff` | Read [handoff.md](handoff.md) and follow it. |
| `status` | Read [status.md](status.md) and follow it. |
| `list` | Read [list.md](list.md) and follow it. The feature name is optional — when omitted, list open specs and the backlog; when present, treat it as a filter. |
| `idea` | Read [idea.md](idea.md) and follow it. Captures an idea into `docs/specs/_backlog/`, or closes or drops one. |

`resume`, `execute`, `review`, `update`, `handoff`, and `status` each start by running *Preconditions* (below). `prep`, `create`, `list`, and `idea` carry their own checks.

After dispatching, **stop**. Do not also evaluate the routing section below.

## Session lifecycle

One session works one spec, and usually one chunk:

1. A fresh session starts with `/spec resume <name>` or `/spec execute <name>`. That invocation is what ties the session to the spec. Nothing else guesses it: not the branch, not the worktree.
2. Work runs until the stopping rule in `execute.md` fires.
3. `/spec handoff` closes the session. The next chunk starts in a new session.

Compaction is not part of the flow. If the conversation does get compacted, treat it as a stop signal and hand off at the next clean boundary.

Worktrees change nothing here. One worktree per spec is common, several per spec is fine, and every path in this skill is relative to the session's working directory.

## Tools

`${CLAUDE_SKILL_DIR}/tools/` holds Bun scripts that the modes and hooks call. The user never runs them. They need Bun; when `bun` is missing, or in environments that don't run skill hooks, skip the tool step and do the same check by reading the files.

- **Spec-file check (hook).** Registered by this skill's frontmatter (hook commands address scripts through `$CLAUDE_PLUGIN_ROOT`; `${CLAUDE_SKILL_DIR}` is empty inside hooks), so it exists only in sessions where `/spec` was invoked. After every Write or Edit to a spec's `CLAUDE.md` or a ledger entry, it validates the frontmatter. If the check fails, the result comes back as blocking feedback: fix the file before continuing.
- **Context pack (at load).** For `resume`, `status`, `execute`, or a bare spec name, the skill runs `spec.ts context` as it loads. A `<spec-pack spec="…" mode="…">` block then appears near the top of this file, holding what that mode would otherwise read and filter by hand: the status table rendered to `status.md`'s rules, the next chunk, raw in-flight notes, and for execute the picked phase entry, the phase-scoped ledger rows, the code-map rows, `CLAUDE.md` and a doctor summary. When the block is present, use it and skip the reads it says it covers. When it is absent (no Bun, a cloud or Codex session, a prep or legacy spec), read the files as the mode describes. The same pack is available mid-session: `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts context execute <name> [phase]`.
- **Lesson recall (hook) and `lessons` commands.** See *Project ledger*. The hook adds matching codebase lessons before code edits. `lessons similar|seen|recall` back the project-ledger write path.
- **Playbook.** `docs/specs/_playbook/` holds project-wide reusable pieces. `gates.md` has one `## <name>` section of `- [ ]` checks per build target, and `pr-opening.md` references them as `gate: <name>` (expanded by `spec.ts gates <name>`). An optional `archetypes.md` extends the plugin's phase shapes ([archetypes.md](archetypes.md)).
- **Tag playbooks.** Any other `docs/specs/_playbook/<name>.md` whose frontmatter has `match:` is the project's rules for one kind of work, e.g. `match: { domain: [growth] }`. A spec gets it when every field in `match:` hits one of the values in its `CLAUDE.md` (any taxonomy field: `domain`, `area`, `scope`, tags); a phase can also name one with `playbook: <name>`. The resume and execute packs inject matching playbooks automatically; prep, create and review run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts playbooks <name>`. Treat a playbook as house rules for that spec, ranked above the plugin's defaults. Keep each under 60 lines and point to a skill for depth; the doctor checks `match:` values against `.claude/taxonomy.md`.
- **List.** `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts list [all] [filter] [--json]` prints open specs and backlog ideas by priority ([list.md](list.md)). `--json` is the same data for other agents and skills.
- **Doctor.** `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts doctor <name>` checks one spec for drift: frontmatter against the taxonomy, ledger entries against `ledger/INDEX.md`, phase boxes in `progress.md` against their phase entries, and stale `in-flight.md`. Handoff runs it before committing. Fix every `error` line; fix `warning` lines that this session caused.

## Routing

(Reached only when no sub-command token was matched above.)

Check if a spec folder exists at `docs/specs/$ARGUMENTS/`.

**Spec does not exist** → read [create.md](create.md) and follow its instructions

**Spec exists, still in prep** (no `progress.md` — only `product-brief.md`/`research/`) → read [prep.md](prep.md); it resumes reconnaissance from where it left off.

**Spec exists** (has `progress.md`) → determine intent from conversation context:
- User mentions "handoff", "hand off", "wrap up", "pass to next agent", or "closing session" → read [handoff.md](handoff.md)
- User mentions "review", "critique", "evaluate", "collegium", or asks for agents to review the spec → read [review.md](review.md)
- User just finished implementation, mentions updating/checking off items, or says "update" → read [update.md](update.md)
- Otherwise (session start, wants to work on it, mentions it by name) → read [resume.md](resume.md)

## Preconditions

Every mode that works on an existing spec (`resume`, `execute`, `review`, `update`, `handoff`, `status`) runs this check first — one definition, referenced by name from each mode file. Resolve `docs/specs/<name>/`, then:

1. **Missing folder** → print `Spec '<name>' not found at docs/specs/<name>/.` and stop. Never offer to create — that is `create`'s job.
2. **Prep stage** (folder exists, no `progress.md` — only `product-brief.md` / `research/`) → the spec body isn't written yet. Take the mode's prep-stage action from the table and stop.
3. **Legacy layout** (has `progress.md`, no `ledger/INDEX.md`) → read [legacy-layout.md](legacy-layout.md) and apply the section for this mode wherever the mode file targets files the spec doesn't have.
4. Otherwise → current layout; continue with the mode.

Check prep stage **before** legacy: a prep-stage folder also lacks `ledger/INDEX.md` and must not be misread as legacy.

| Mode | Prep-stage action |
|---|---|
| `resume`, `execute` | Read [prep.md](prep.md) instead — it resumes reconnaissance where it left off. |
| `status` | Print `Spec '<name>' is in prep — no phases yet. See product-brief.md. Run /spec prep <name> to continue recon, or /spec create <name> to write the spec.` |
| `update`, `handoff`, `review` | Print `Spec '<name>' is in prep — nothing to <update \| hand off \| review> yet. Run /spec prep <name> to continue recon, or /spec create <name> to write the spec.` |

## Next-chunk rule

Deterministic. Used by `resume` (to suggest) and `execute` (to pick when no chunk hint is given). The packs and `spec.ts ready <name>` compute it; without Bun, apply it by hand.

1. **Ready set** = every open phase whose edges are satisfied (*Phase edges* below): each `needs` phase is ticked, each `needs-deployed` phase is ticked and marked deployed, and no `same-files-as` sibling is in progress or ahead of it in `progress.md` order. A phase already in progress (some sub-items ticked) comes first. When no phase file declares edges, the ready set is just the first unchecked phase, as before.
2. **Active phase** = the first phase in the ready set. The rest of the set are phases that can run in parallel, for example in another worktree and session.
3. **Next chunk** = the first contiguous run of `- [ ]` lines under the same heading in that phase's entry, capped at 5 items. If the unchecked items span sub-headings or are split by checked items, take the first contiguous run.
4. **Nothing ready but phases still open** → the spec is blocked. Say what blocks it (the waiting reasons) and stop.
5. **No unchecked phase left** → there is no chunk; the next step is the PR gate in `pr-opening.md`.

# Spec layout reference (layout v1)

All sub-modes follow the rules below. This reference is embedded in SKILL.md (not injected via `!cat`) so it always loads with the skill.

## File tree

```
docs/specs/<name>/
├── CLAUDE.md                                   # metadata + routing
├── product-brief.md                            # stable reference — business intent (≤30 lines, no code); by prep
├── design.md                                   # stable reference — problem, UX, decisions
├── technical.md                                # stable reference — contracts, architecture
├── progress.md                                 # thin index: phase list + top-level checkboxes + pointers
├── pr-opening.md                               # PR-readiness gate: spec state + pre-PR checks (not a phase)
├── code-map.md                                 # load-bearing files inventory (scaffolded empty)
├── in-flight.md                                # ephemeral pending work (on-demand; created by handoff)
├── phases/                                     # parent folder for all per-phase content
│   ├── phase-1-<slug>.md                       #   flat file — default shape for small phases
│   ├── phase-2-<slug>.md
│   └── phase-N-<slug>/                         #   folder — complex phase with supplementary files
│       ├── plan.md                             #     main phase plan (mirrors the flat-file role)
│       └── <descriptive-name>.md               #     supplementary files added as needed
├── reviews/                                    # on-demand; dated YYYY-MM-DD-<slug>.md; immutable
├── research/                                   # on-demand; immutable
│   ├── YYYY-MM-DD-<slug>.md                    #   prep recon waves + deep research (root)
│   └── phase-<N>/                              #   per-chunk execute notes for phase N
│       ├── YYYY-MM-DD-<chunk>-recon.md
│       └── YYYY-MM-DD-<chunk>-preflight.md
└── ledger/                                     # forward-propagating learnings
    ├── INDEX.md                                # warm cache: one row per entry with [applies-to] tag
    └── <kind>-<slug>.md                        # free-form kinds: gotcha, principle, domain, decision, workaround, …
```

## Artifact purposes

| Artifact | Kind | Purpose |
|---|---|---|
| `CLAUDE.md` | stable | Metadata frontmatter + file index + relationship to code |
| `product-brief.md` | stable | Business intent — who/what/why, the real change, out of scope. ≤30 lines, no code. Written by prep; the contract recon agents work against |
| `design.md` | stable | Problem, decisions table, UX flows, wireframes |
| `technical.md` | stable | API contracts, data models, architecture |
| `progress.md` | small | Thin index of phases; top-level checkboxes; pointers into `phases/` |
| `pr-opening.md` | small | PR-readiness gate — spec state (<20 lines) + pre-PR checks scoped to touched subprojects. Not a phase |
| `code-map.md` | small | Load-bearing files this spec depends on or introduces |
| `in-flight.md` | ephemeral | Mid-session pending state; overwritten each handoff |
| `phases/phase-*.md` (flat) | small-to-medium | Per-phase plan + sub-checkboxes + guidance |
| `phases/phase-*/plan.md` (folder) | small-to-medium | Same as flat, for phases with supplementary files |
| `phases/phase-*/<supplementary>.md` | on-demand | Tier sub-plans, wireframes, fixture notes, scratch |
| `reviews/*.md` | on-demand, immutable | Collegium review snapshots; never edited |
| `research/*.md` | on-demand, immutable | Deep-research and prep recon-wave snapshots; never edited |
| `research/phase-<N>/*.md` | on-demand, immutable | Per-chunk execute recon + preflight notes for phase N; never edited |
| `ledger/INDEX.md` | warm cache | One row per ledger entry with `[applies-to]` tag + one-line summary |
| `ledger/<kind>-*.md` | forward-propagating | Durable learnings tagged by phase scope |

## progress.md rules

- **Thin index only.** Phase list, top-level checkbox per phase, short pointer to each phase entry inside `phases/`.
- **Pointer format reflects phase shape:**
  - Flat-file phase: `phases/phase-1-canonical-schema.md`
  - Folder-shape phase: `phases/phase-8-csv-import/plan.md` (always points at `plan.md` inside the folder)
- **Sample shape:**
  ```
  ## Phases
  - [ ] Phase 1 — Canonical schema → `phases/phase-1-canonical-schema.md`
  - [x] Phase 2 — Migration runner → `phases/phase-2-migration-runner.md`
  - [ ] Phase 8 — CSV import → `phases/phase-8-csv-import/plan.md`
  ```
- **Forbidden content in progress.md:**
  - Session logs
  - Handoff brain-dump blocks
  - Gotchas / dead ends / open questions
  - Decision tables
  - Detailed sub-checkboxes
  - Implementation guidance prose
- If any of the above would otherwise be written here, redirect:
  - Durable learnings (cross-phase) → `ledger/<kind>-<slug>.md`
  - Phase-local guidance + sub-checkboxes → the phase entry inside `phases/`
  - Ephemeral mid-session state → `in-flight.md`
- A phase top-level box flips to `[x]` only when all sub-checkboxes in its phase entry are checked.

## Per-phase entry rules

- **Every phase has its own entry from birth.** Scaffolded at create time, one per planned phase, inside `phases/`.
- **Default shape: flat file** — `phases/phase-<N>-<slug>.md`. Holds phase goal, dependencies, files to touch, implementation guidance, sub-checkboxes, and any phase-local notes that don't forward-propagate.
- **Folder shape** — `phases/phase-<N>-<slug>/` with `plan.md` inside — for phases that need supplementary files (tier breakdowns, sub-plans, ASCII diagrams, fixture notes). Can be chosen at birth when complexity is known, or promoted from flat file later.
- **Promotion path (flat → folder):** when a flat phase file outgrows its scale, offer promotion. Move the flat file's content into `phases/phase-<N>-<slug>/plan.md` and delete the old flat file. Update the pointer in `progress.md`. User confirms before promotion.
- **No reverse demotion.** Folder-shape phases stay folders. A rare manual revert is possible but not automated.
- **Supplementary files inside a phase folder are NOT read by default.** Only `plan.md` is the entry point. If a supplementary file holds critical context, `plan.md` must explicitly link to it so resume picks it up.
- **Slugs must be unique across phases.** Agent proposes slugs and asks the user when two are similar.
- **Every phase ships something.** A **code phase** (the default) is a change set that leaves the tree functional + tested at its end; its sub-checkboxes are each sized to one TDD commit (red → change → green → commit). A **task phase** (`code: false` in its frontmatter) delivers something real outside the repo — a published page, a recorded video, sent emails, a signed agreement — and each sub-checkbox is ticked with its evidence (a link, date or file). One spec can mix both, joined by `needs` edges.
- **Never** a "Verification", "Manual QA", or "Open PR" phase, code or task — checking our own work is not a phase; it lives in `pr-opening.md`. The doctor warns about task phases named like one.
- **Record ordering edges** in the phase file's frontmatter (*Phase edges* below). Never hand-write "parallelizable with"; it is computed.

## Phase edges

Each phase file starts with frontmatter that holds only hard constraints:

```yaml
---
needs: [2, 3, competitions-content-publishing-safety#2]  # must be ticked first; local ids or spec#phase
needs-deployed: [2]         # must be ticked and deployed (blue/green, bake time), not just merged
same-files-as: [5]          # no logical dependency, but edits the same files: lands after 5, not alongside
pr: B                       # PR group; pr-opening.md's split comes from these (code phases only)
due: 2026-10-15             # optional; only for a real date
code: false                 # optional; marks a task phase (default: code)
playbook: growth            # optional; adds a project playbook to this phase's execute pack
---
```

- **Keep the kinds separate.** A logic dependency is `needs`. "Wait for the deploy" is `needs-deployed`. "Both touch `UserController.java`" is `same-files-as`, which is not a dependency. Soft preferences ("nicer if 5 lands first") stay as prose in the body.
- **Write `needs: []` for a phase with no dependencies.** A phase without frontmatter, in a spec where other phases declare edges, is treated as needing every earlier phase.
- **Deployed** is a marker on the ticked phase line in `progress.md`: ``- [x] Phase 2 — Aggregate → `phases/…` · deployed 2026-09-20``. `update` adds it once the user confirms the deploy.
- **Parallelism is computed.** `spec.ts ready <name>` prints the ready set, the waiting phases with reasons, and the PR groups.
- **Checks.** The doctor and the spec-file check flag references that don't resolve and `needs` cycles.

## Ledger entry format

Every ledger entry lives at `ledger/<kind>-<slug>.md` with required frontmatter:

```markdown
---
kind: gotcha | principle | domain | decision | workaround | <free>
applies-to: [general] | [phase 5+] | [phase 6, 7] | [general, load-bearing]
created: <spec-bump.sh --now>
superseded-by: <filename>   # optional — marks this entry as deprecated
---

# <Title>

<body — short, usually 5-30 lines>
```

### `applies-to` grammar

The bracketed value is a comma-separated list of free-form scope tokens. Resume uses it to filter the INDEX and decide which entries apply to the current phase.

- `[general]` — applies to all phases.
- `[phase N]` — exactly one phase.
- `[phase N, M, P]` — enumeration of specific phases.
- `[phase N+]` — phase N and all later phases (forward-open).
- `load-bearing` — composable modifier. When present, the entry is always surfaced regardless of phase filter. Example: `[general, load-bearing]`, `[phase 5+, load-bearing]`.

Pick the **narrowest correct scope** at write time. Use `[general]` only when the learning truly applies to every phase. Use `load-bearing` sparingly — it's for mission-critical knowledge that an agent must see regardless of which phase they're working on.

### INDEX row format

`ledger/INDEX.md` is the warm cache. One row per entry, grouped by kind via section headings:

```markdown
# Ledger Index (layout v1)

## Gotchas
- `gotcha-money-parsing.md` — [general] — parseFloat drops centavos; use strict regex

## Principles
- `principle-no-schema-without-fixtures.md` — [general] — observe real source data before writing transforms

## Domain
- `domain-invoice-line-mapping.md` — [phase 6, 7] — Momence line_item → ticket_type vs class_pass

## Decisions
- `decision-csv-pivot.md` — [phase 8+] — API path abandoned; CSV authoritative

## Workarounds
- `workaround-momence-rate-limit.md` — [phase 6, 7] — sleep 1s between pages until v2 API lands
```

Keep each one-line summary under 80 characters.

### Write discipline

- **Update in place when a near-duplicate exists.** Before creating a new entry, scan INDEX for overlapping scope + kind and edit the existing entry if one fits.
- **Lessons about the codebase go to the project ledger.** Before writing a `[general]` entry, decide whether it is about this feature or about the code any spec might touch: a tool, a framework trap, a CI or deploy behaviour, a test helper. The second kind follows *Project ledger → Write path* instead.
- **Timestamp** `created:` with `spec-bump.sh --now` — never by hand.
- **Never delete entries.** Stale entries get a `superseded-by:` field pointing to the replacement; resume's filter excludes superseded ones.
- **Append to INDEX whenever a new ledger file is created.** Keep the row format consistent.

## Priority, due dates and owners

A spec's `CLAUDE.md` may carry `priority: p1 | p2 | p3` and `due: YYYY-MM-DD`; a phase file may carry `due:`. All optional, and only set when someone actually decided them. The list view sorts by them, the status table shows an open phase's due day, and the doctor warns when a date has passed on unfinished work. There is no owner field by default: add `owner:` only when a spec, phase or idea must be done by one named person.

## Backlog

`docs/specs/_backlog/<slug>.md` holds ideas that don't deserve a spec yet: `title`, optional `tags`, `priority`, `due`, and under 120 words of body. [idea.md](idea.md) captures, closes and drops them; `prep` promotes one into a spec. Ended ideas move to `_backlog/_closed/` with a `resolution:` line. The spec-file check validates both folders.

## Relations between specs

Specs form a graph. The spec that depends on, belongs to, or replaces another one declares the link in its `CLAUDE.md` frontmatter. The other side never writes it: needed-by, children and superseded-by are computed.

```yaml
part-of: directory-accounts                          # parent or umbrella spec (at most one)
needs: [competitions-content-publishing-safety#1-2]  # must land first; whole spec or phases
supersedes: [directory-front-doors#4-5]              # this spec replaces that work
related:                                             # anything else, with a one-line why
  - organizer-profile-redesign: owns the brand page visuals
```

- **References** are `<spec>` or `<spec>#<phase>`. `<phase>` is an exact phase id (`2b-pre`) or a numeric range (`4-5`, which includes `4a`).
- **Four types only.** Prose may still explain a relation, but the frontmatter entry is what counts.
- **An umbrella** is a spec whose children declare `part-of` it. Nesting needs nothing more.
- **When the other side's work moves** (a phase dissolved, split or renamed), update the declaring spec's reference. The doctor flags references that no longer resolve.

Claude reads the graph through `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts graph …`. The user never calls it.

- `graph <name>`: links in both directions, which `needs` are still open ("Blocked by"), and undeclared overlaps (open specs whose `code-map.md` lists the same files).
- `graph files <path…>`: which specs' code-maps list these files. Prep uses it to find neighbors.
- `graph suggest <name>`: specs this spec mentions in prose without declaring a relation.

The graph appears in the resume and execute packs. Review uses it to load neighbors, and the doctor and spec-file check validate it.

## Project ledger

`docs/specs/_ledger/` holds lessons about the codebase that any spec can hit. It is shared by every spec in the repo, including `*/docs/specs/` roots. Names starting with `_` are never specs.

```markdown
---
kind: gotcha | principle | decision | workaround | <free>
paths: [backend/**/db/migration/**]        # globs, relative to the repo root; what the lesson is about
seen-in: [ach-direct-debit, lead-follow-up] # specs that hit it
created: <spec-bump.sh --now>
enforced-by: <path to a check>             # optional; once set, recall stops showing it
---

# <Title: the rule, stated plainly>

<first paragraph: the rule and the fix in 1–3 sentences; recall shows this paragraph>
<then why it bites, with evidence>
```

`INDEX.md` holds one row per entry: ``- `gotcha-<slug>.md` — `<paths>` — <summary under 80 chars>``.

### Write path

1. Run `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts lessons similar <slug or title words>`.
2. **A listed lesson says the same thing** → `bun ${CLAUDE_SKILL_DIR}/tools/spec.ts lessons seen <entry.md> <spec-name>` records this spec. Edit the lesson's body only if you learned something it lacks.
3. **Nothing matches** → write the lesson to `docs/specs/_ledger/` with `seen-in: [<spec-name>]` and the narrowest `paths` you can defend, then add its INDEX row.
4. Either way, the spec's own `ledger/INDEX.md` gets a pointer row using the path from the repo root: ``- `docs/specs/_ledger/<entry>.md` — [general] — <summary>``. Don't copy the lesson into the spec ledger.

Without Bun, do steps 1–2 by reading `docs/specs/_ledger/INDEX.md`.

### Graduation

A lesson that recurs belongs in code, not prose. Once a project lesson's `seen-in` reaches 3 specs and it has no `enforced-by`, it becomes a graduation candidate (`spec.ts lessons candidates [<spec> | <file…>]`). Create offers a guardrail phase for candidates the new spec touches, and review raises them as a fork. When the guard lands, set `enforced-by:` to its path. The doctor checks that path exists, and recall stops showing the lesson, so the ledger shrinks as the codebase learns.

### Recall

Lessons reach a session in three ways. None of them needs anyone to ask.

- **Before an edit (hook).** Registered by this skill's frontmatter. When Claude is about to Write or Edit a file outside `docs/specs/`, the hook matches the path against every lesson's `paths` and adds up to 3 matching lessons as context. Each lesson is shown once per session. The hook is silent when nothing matches and never blocks an edit.
- **Execute pack.** Lists the lessons that match the files the picked phase names.
- **Prep and review.** Recon agents and the prior-art reviewer get `docs/specs/_ledger/INDEX.md`.

## in-flight.md semantics

- **Ephemeral pending state only.** Half-wired code, open session questions, "pick up from here" notes, environment state.
- **Overwritten on each handoff.** Not appended to.
- **Cleared to empty-with-header at clean boundaries.** Clean boundary = all current-phase sub-checkboxes done AND no staged-but-uncommitted spec changes AND no open questions flagged this session.
- **Git is the archive.** Past in-flight contents are recoverable from `git log -p in-flight.md`.

## pr-opening.md semantics

- **The PR-readiness gate — not a phase.** Verification, QA, and PR-opening never appear as phases (see Per-phase entry rules); their content lives here.
- **Two sections only:**
  - **Spec state** (< 20 lines) — running summary: phases done / left, branch + PR link once they exist, the suggested PR split (from the phases' `pr:` fields, listed by `spec.ts ready <name>`). Kept current by execute/handoff as phases land — not a re-list of the phase index.
  - **Pre-PR checks** — checkboxes scoped to the subprojects the spec touches (derive from `code-map.md`). Ticked before the **draft** PR opens. Never straight to `main`.
- **Project-scoped checks.** The concrete checks depend on which build targets the spec touches. If the project defines canonical checks (a `.claude/` convention, a CI manifest), use those; otherwise default, per touched module, to: tests pass · lint + typecheck/compile · any feature-specific e2e.
- **Scaffolded by create, kept current by execute/handoff.** Not immutable — it's a live gate, edited in place. A spec whose phases are all task phases opens no PR and has no `pr-opening.md`.

## reviews/ and research/ semantics

- **On-demand folders.** Created on first review/research write. Not scaffolded at spec birth.
- **Grouped by phase.** Execute-mode notes live in `research/phase-<N>/` — `YYYY-MM-DD-<chunk>-recon.md` and `YYYY-MM-DD-<chunk>-preflight.md`, where `<chunk>` is the chunk's first sub-item id or a short slug. The folder is the index: no INDEX file to keep in sync. Prep and deep-research snapshots stay at the `research/` root. Specs with older flat execute notes keep them where they are — new writes only.
- **Filenames:** `YYYY-MM-DD-<slug>.md`. Slug derived from the dominant theme (e.g., `phase-5-readiness`, `integration-boundaries`). Review slugs are always auto-derived (fallback: `phase-<N>-collegium`); research slugs may be confirmed with the user if ambiguous.
- **Fixed research names**, so every spec's research reads the same:

  | What | Where and name |
  |---|---|
  | Prep implementation wave | `research/YYYY-MM-DD-wave-<N>-<slug>.md` |
  | Prep craft wave (naming, fixtures, extraction) | `research/YYYY-MM-DD-craft-<slug>.md` |
  | Addendum to an earlier wave | `research/YYYY-MM-DD-wave-<N><letter>-<slug>.md` (e.g. `wave-5b`) |
  | Execute recon for a chunk | `research/phase-<N>/YYYY-MM-DD-<chunk>-recon.md` |
  | Execute preflight for a chunk | `research/phase-<N>/YYYY-MM-DD-<chunk>-preflight.md` |

  Prep's overlap check is a `## Neighbors` section inside the wave snapshot, not a file of its own.
- **Written once, immutable, never deleted.** The file is the source of record. Do not edit after writing.
- **Extraction step:** after writing a review/research file, distilled actionable findings are copied into the ledger as separate entries; the report itself stays untouched. Review extraction is autonomous — findings are applied to the spec + ledger and committed without prompts (see review.md); research extraction may be offered interactively.

## Handoff brain-dump redirection

Handoff reflection is preserved but redirected. Reflection content goes to:

- **Ledger entries** for anything durable:
  - Business decisions / pivots → `ledger/decision-<slug>.md`
  - Hard-won gotchas → `ledger/gotcha-<slug>.md`
  - Standing rules that emerged → `ledger/principle-<slug>.md`
  - Newly understood domain facts → `ledger/domain-<slug>.md`
- **`in-flight.md`** for ephemeral state only: half-built code, "pick up from here" instructions, open session questions.

Handoff **must not**:
- Append anything to `progress.md` (no handoff blocks, no session logs)
- Forward-cite ledger entries for phase N+1 (that's resume's job at pickup time)
- Read or prepare the next phase's context

## On-demand creation rules

| Artifact | Scaffolded at spec birth? |
|---|---|
| `CLAUDE.md` | yes |
| `design.md` | yes |
| `technical.md` | yes |
| `progress.md` | yes |
| `pr-opening.md` | yes — by `create` (scaffolded with the pre-PR checks) |
| `code-map.md` | yes (empty table with header) |
| `phases/` | yes |
| `phases/phase-<N>-<slug>.md` or `phases/phase-<N>-<slug>/plan.md` | yes — one per planned phase |
| `ledger/` | yes |
| `ledger/INDEX.md` | yes (header only) |
| `product-brief.md` | no — created by `prep` before the spec body exists |
| `in-flight.md` | no — created by handoff when pending state exists |
| `reviews/` | no — created on first review write |
| `research/` | no — created on first research/recon write (deep research, `prep` waves, or `execute` phase recon) |
| `research/phase-<N>/` | no — created by the first `execute` recon or preflight note for phase N |
| Phase folder supplementary files | no — added during execution when needed |
| Individual `ledger/*.md` entries | no — created during update/handoff when a learning emerges |

## When the folder doesn't match this layout

If `docs/specs/<name>/ledger/INDEX.md` is absent, the spec predates this layout. Do not improvise — read [legacy-layout.md](legacy-layout.md) for the detection rule, the no-migration policy, and the per-mode fallbacks. Nothing in that file applies to specs that have a ledger.

## Shared conventions

- **Lifecycle:** `prep` (folder + brief + recon) → `draft` (spec written) → `active` (implementing) → `done`/`good-enough`. Prep is optional but recommended for non-trivial specs; `create` can run cold.
- **Stage vs. status:** the stage is read from the files (no `progress.md` = prep; no ticked box yet = draft). The `status:` field only ever holds a value the project allows. When a project taxonomy (`.claude/taxonomy.md`) lists `status` values, use only those: write the stage name when it is listed, otherwise `active` until the spec is `done` or `good-enough`.
- **Timestamps:** never write by hand. `bash ${CLAUDE_SKILL_DIR}/scripts/spec-bump.sh <spec-name>` bumps `updated:` in the spec's `CLAUDE.md`; `bash ${CLAUDE_SKILL_DIR}/scripts/spec-bump.sh --now` prints the canonical timestamp for any other field (ledger `created:`, stub frontmatter).
- **Taxonomy values:** use the controlled vocabulary injected at the top of this file.
- **Spec location:** `docs/specs/<name>/`
- **Style:** direct, opinionated, no filler. Use "we" for decisions, "they" for users.
