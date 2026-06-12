# Review Mode

Launch a collegium review panel to evaluate the spec from five independent lenses, synthesize findings into a unified verdict, write the full synthesis to `reviews/`, apply the findings to the spec and ledger, and record everything as a single review commit.

**This sub-command is fully autonomous.** No AskUserQuestion, no "which findings should I address?", no slug confirmation, no "shall I apply this?". The user triggered the review; the deliverable is a finished commit plus a report. The only findings that wait for human judgment are contradictions and fundamental-rethink verdicts — and those are *recorded* (as open decision ledger entries) and flagged in the final report, never asked about mid-flow.

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

## 4. Write the review to `reviews/`

Persist the full synthesis as an immutable review file **before applying anything** — if application is interrupted, the review file preserves every finding.

### Create the folder if missing

```bash
mkdir -p docs/specs/<spec-name>/reviews
```

### Derive a slug

Derive the slug from the dominant theme of this review — never ask the user. Examples:

- `phase-5-readiness` — a pre-phase review
- `integration-boundaries` — a focused architecture review
- `concurrency-audit` — a specific concern-driven review
- `post-pivot` — a review after a major approach change

If no theme dominates, fall back to `phase-<N>-collegium` for the active phase.

### Write the file

Create `docs/specs/<spec-name>/reviews/YYYY-MM-DD-<slug>.md` with the full synthesizer output. Include frontmatter:

```markdown
---
date: <YYYY-MM-DD>
spec-phase-at-review: <phase number and name at review time>
agents: [principal-engineer, integration-architect, adversarial-tester, code-quality-reviewer, prior-art-reviewer]
slug: <slug>
---

# Review — <slug>

*Source of record — do not edit. Actionable findings are applied to the spec and ledger by the review run itself.*

## Summary

<synthesizer's summary>

## Findings

<full list of synthesizer findings, deduplicated, classified by signal,
with severity + recommendation per finding>
```

**Never edit this file after writing.** If a later review contradicts it, the new review lives in its own dated file; both stay on disk.

## 5. Apply the findings — autonomously

No questions, no confirmations, no per-finding prompts. Accept the panel's suggestions and record them. Process every synthesized finding by its shape:

### Spec corrections → edit the spec files directly

Concrete changes to `design.md`, `technical.md`, a phase entry, or `code-map.md`: apply them. Wrong endpoint shapes, missing files in a phase's touch list, incorrect claims about existing code, decisions-table rows the review invalidated, deliverables that changed — edit the file.

Respect supersession annotations: when a substitution finding replaces or deletes a component, apply the substitution and skip the mitigation findings marked `superseded-if-accepted` for that component (they stay preserved in the review file).

### Ledger-shaped findings → create/update ledger entries

Promote the actionable cross-phase findings (typically 3–7; skip purely informational ones):

- Decisions the team should lock in ("we're decoupling X from Y") → `decision` kind
- Traps future agents will hit without warning ("Z silently drops data at >10k records") → `gotcha` kind
- Standing rules that emerged ("all new handlers must use the audit port") → `principle` kind
- Domain facts that weren't previously documented ("the `user_id` on invoices actually refers to the studio, not the customer") → `domain` kind

Follow the write discipline in SKILL.md: required frontmatter (kind, applies-to with the narrowest correct scope, created timestamp via the script), update a near-duplicate in place instead of creating a sibling, and append a row to `ledger/INDEX.md` for every new entry.

### Contradictions → record as open decisions, do not resolve

When personas disagree about the same design decision, do NOT pick a side and do NOT stop to ask. Create `ledger/decision-<slug>.md` summarizing both positions with `**Status: open — needs a human call.**` as the first body line, add its INDEX row, and leave the spec's current shape untouched on that point. The final report flags it.

### Fundamental-rethink verdicts → record, don't rewrite

If the synthesis concludes the *approach itself* is wrong (not a correctable detail), do not rewrite the spec wholesale on the panel's authority. Create an open `decision-*` ledger entry capturing the panel's position and the recommended direction, apply only the findings that stand regardless of the rethink, and flag it as the headline of the final report.

### Bump the timestamp

After all edits: `bash ${CLAUDE_SKILL_DIR}/scripts/spec-bump.sh <spec-name>`.

## 6. Commit

One commit containing everything the review produced — review file, ledger entries, INDEX rows, spec edits:

```bash
git add docs/specs/<spec-name>/
git status  # verify ONLY the spec folder is staged
git commit -m "[review] <spec-name>: <slug> — <N> findings (<X> spec edits, <Y> ledger entries)"
```

Never sweep unrelated working-tree changes into the review commit — stage only the spec folder. Commit; do not push unless the project's conventions say otherwise.

## 7. Report and stop

Print a compact summary — this replaces every interactive step:

```
Review: reviews/YYYY-MM-DD-<slug>.md (immutable)
Committed: <hash> — [review] <spec-name>: <slug> — …
Findings: <N> total — <X> applied to spec, <Y> ledgered, <Z> review-file only
Needs your judgment: <open contradictions / rethink decisions with their ledger slugs, or "none">
```

Follow with 2–5 bullet highlights of the most consequential changes applied. Then stop — do not ask whether to address findings, do not propose next steps beyond the summary.
