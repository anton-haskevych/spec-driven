# Review Mode

Launch a collegium review panel to evaluate the spec from five independent lenses, synthesize findings into a unified verdict, write the full synthesis to `reviews/`, and interactively extract actionable findings into ledger entries.

See `SKILL.md` for layout rules and the extraction-step discipline.

## 0. Existence check

If `docs/specs/<name>/` does not exist, print `Spec '<name>' not found at docs/specs/<name>/.` and stop. Do not run any of the sections below.

## 1. Identify the spec

Determine which spec to review from conversation context. If ambiguous, ask the user to confirm. Read in parallel:

- `design.md` — problem, decisions, UX flows
- `technical.md` — API contracts, data models, architecture
- `progress.md` — phase index, what's done vs. planned
- `ledger/INDEX.md` (if it exists) — existing learnings already captured
- `code-map.md` (if it exists) — load-bearing files this spec touches
- The current phase entry (follow the pointer in `progress.md` to the first unchecked phase — either `phases/phase-<N>-<slug>.md` or `phases/phase-<N>-<slug>/plan.md`)

Note the spec path — you'll pass it to each reviewer along with the list of files they should read.

## 2. Launch 5 review agents in parallel

Send a **single message with 5 Agent tool calls** — all must launch simultaneously, not sequentially. Each agent gets the spec path and reads the files itself.

The read set for each agent now includes the ledger and the active phase entry so they have full context, not just design/technical/progress.

### Agent 1: principal-engineer

```
Review the spec at [spec-path]. Read:
- design.md — problem, decisions, UX
- technical.md — contracts, architecture
- progress.md — phase index
- The current phase entry (follow the pointer in progress.md to the first unchecked phase)
- ledger/INDEX.md if it exists; open any ledger entries relevant to the active phase
- code-map.md if it exists

Your central question: "Is this the fundamentally right solution?"

Evaluate: dependency inversion, swappability, layer boundaries, single responsibility,
open/closed principle, reversibility, YAGNI. Use Read/Grep/Glob to verify claims
against the actual codebase.

Produce structured PersonaOutput with findings (title, description, recommendation, severity)
and an overallAssessment.
```

### Agent 2: integration-architect

```
Review the spec at [spec-path]. Read:
- design.md, technical.md, progress.md
- The current phase entry
- ledger/INDEX.md and relevant ledger entries
- code-map.md

Your central question: "How does this fit with everything else?"

Read the project's CLAUDE.md files for architecture context. Trace data flows.
Check blast radius — Grep for all callers of methods the spec modifies.
Verify integration accuracy — do the endpoints, handlers, and tables referenced
in the spec actually exist?

Produce structured PersonaOutput with findings and an overallAssessment.
```

### Agent 3: adversarial-tester

```
Review the spec at [spec-path]. Read:
- design.md, technical.md, progress.md
- The current phase entry
- ledger/INDEX.md and relevant ledger entries (especially gotchas and workarounds)
- code-map.md

Your central question: "What will break?"

Enumerate entity lifecycle states from the codebase. For every query the spec proposes,
ask: does it filter by lifecycle state? Check for null guards, concurrency issues,
untested assumptions, incomplete error handling, and test gaps.

Produce structured PersonaOutput with findings and an overallAssessment.
```

### Agent 4: code-quality-reviewer

```
Review the spec at [spec-path] and the existing code it proposes to modify.
Read:
- technical.md — proposed changes
- The current phase entry — implementation guidance
- code-map.md — load-bearing files already tracked
- ledger/INDEX.md — existing principles/decisions
- The actual files listed in the spec

Your central question: "How does this affect code quality?"

Evaluate: will the proposed changes improve or degrade cohesion, understandability,
editability, testability? Are new files/modules properly sized? Does the proposed
structure follow existing patterns?

Produce structured PersonaOutput with findings and an overallAssessment.
```

### Agent 5: prior-art-reviewer

```
Review the spec at [spec-path]. Read:
- design.md, technical.md, progress.md
- The current phase entry
- ledger/INDEX.md and relevant ledger entries
- code-map.md

Your central question: "Does this system already know how to do this?"

Inventory every mechanism-level choice in the spec (data access, scheduling,
notification, metrics, serialization, retry, caching, config, class placement) —
including choices inherited from code the spec extends or extracts. For each,
Grep/Glob broadly for how the codebase solves that concern elsewhere; find 2-3
exemplars. Construct the simplest version that reuses those mechanisms and diff
the spec against it. "Extraction" / "behavior-preserving" framing is provenance,
not justification — inherited choices must re-justify themselves. Flag mechanism
choices with no rejected alternative recorded in the decisions table or ledger.

Produce structured PersonaOutput with findings (each citing prior-art file:line)
and an overallAssessment.
```

## 3. Collect and synthesize

Once all 5 agents return, launch the **review-synthesizer** agent:

```
Synthesize the following 5 review outputs into a unified verdict.

[Include the full output from each of the 5 agents]

Deduplicate findings, classify signal (consensus / unique-insight / contradiction),
assign enforcement mechanisms, and produce a SynthesisOutput with findings[] and summary.
```

## 4. Present the synthesis

Display the synthesizer's output to the user. Then:

- If there are **critical findings**: highlight them and ask which ones to address before implementation
- If there are **prior-art substitutions** (the spec hand-builds what an existing mechanism provides): present the substitution and its exemplar before any mitigation-level findings on the same component — fixing a component that shouldn't exist is wasted work
- If there are **contradictions**: present both sides and ask the user to resolve
- If the spec is **clean**: say so and suggest moving to implementation

## 5. Write the review to `reviews/`

Persist the full synthesis as an immutable review file. This is the source of record.

### Create the folder if missing

```bash
mkdir -p docs/specs/<spec-name>/reviews
```

### Choose a slug

Derive the slug from the dominant theme of this review. Examples:

- `phase-5-readiness` — a pre-phase review
- `integration-boundaries` — a focused architecture review
- `concurrency-audit` — a specific concern-driven review
- `post-pivot` — a review after a major approach change

If the theme isn't obvious, ask the user in one line with 2–3 proposals:

> "Pick a slug for this review: `integration-boundaries`, `phase-5-readiness`, or propose your own."

### Write the file

Create `docs/specs/<spec-name>/reviews/YYYY-MM-DD-<slug>.md` with the full synthesizer output (not just what was shown to the user in section 4). Include frontmatter:

```markdown
---
date: <YYYY-MM-DD>
spec-phase-at-review: <phase number and name at review time>
agents: [principal-engineer, integration-architect, adversarial-tester, code-quality-reviewer, prior-art-reviewer]
slug: <slug>
---

# Review — <slug>

*Source of record — do not edit. Extract actionable findings into ledger entries via the extraction step.*

## Summary

<synthesizer's summary>

## Findings

<full list of synthesizer findings, deduplicated, classified by signal,
with severity + recommendation per finding>
```

**Never edit this file after writing.** If a later review contradicts it, the new review lives in its own dated file; both stay on disk.

## 6. Extraction step

After the review file is written, interactively promote actionable findings into ledger entries. This is the glue between reviews (immutable snapshots) and the ledger (runtime knowledge surface).

### Surface top findings

Pick 3–7 of the most actionable findings from the synthesis. Skip purely informational ones. Prefer findings that are:

- Decisions the team should lock in ("we're decoupling X from Y") → `decision` kind
- Traps future agents will hit without warning ("Z silently drops data at >10k records") → `gotcha` kind
- Standing rules that emerged ("all new handlers must use the audit port") → `principle` kind
- Domain facts that weren't previously documented ("the `user_id` on invoices actually refers to the studio, not the customer") → `domain` kind

### Prompt the user per finding

For each surfaced finding, ask:

> "Promote this to a ledger entry? [y/N/skip-all]
> Finding: <title>
> Proposed: kind=<kind>, applies-to=<scope>"

On `y`:

- Create `ledger/<kind>-<slug>.md` with required frontmatter (kind, applies-to, created timestamp) and the finding's body as the content.
- Append a row to `ledger/INDEX.md` in the right section.

On `N`: skip this finding only.

On `skip-all`: abort the extraction step. The review file is already written and remains the source of record; extraction can be resumed later by re-reading the review and running this step again.

### Interruption-safe

If the user bails mid-extraction, some findings will be stranded in the review file but not yet in the ledger. That's fine — the review file is the source of record. Print a one-line note:

> "Extraction paused. <N> findings still in `reviews/YYYY-MM-DD-<slug>.md` — re-run `/spec <name> review` to re-extract, or extract manually later."

## 7. Offer spec updates

If the review surfaced concrete changes to `design.md`, `technical.md`, or a phase entry (not cross-phase learnings — those are ledger-shaped), offer to apply them inline. Examples:

- "Fix the endpoint shape in technical.md based on finding #2"
- "Update phase 5's file-touch list in phases/phase-5-<slug>.md based on finding #4"
- "Rewrite the decisions table in design.md based on finding #1"

Only touch the stable reference files when the change is concrete and the user confirms.
