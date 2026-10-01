---
needs: [2]
same-files-as: [3]
pr: B
---

# Phase 4 — Lessons add

**Goal:** After the agent writes a project lesson at its final path, `spec.ts lessons add <entry.md> <spec>` does all the bookkeeping — timestamp, `seen-in`, project INDEX row, spec pointer row — and the plugin has one INDEX row parser for every row kind.

**Outcome:** Recording a codebase lesson goes from four hand steps (and hand-typed timestamps) to one Write plus one command; likely duplicates are shown before the rows land. Low risk.

**Files to touch:**
- `skills/spec/tools/core/ledger-index.ts` (new — rows keyed on the leading backticked path, `/` allowed, typed tail; `insertRow(text, section, row)`; formatters for spec, project and pointer rows)
- `skills/spec/tools/core/frontmatter-patch.ts` (new — `setFrontmatterLine` extracted from `lessons/seen-in.ts:5-20`)
- `skills/spec/tools/lessons/add.ts` (new), `lessons/seen-in.ts` (becomes a caller)
- `skills/spec/tools/commands/lessons.ts` (`case "add"`, usage)
- `skills/spec/tools/context/ledger-scope.ts` (row parse from the shared module; `[tags]` parse stays local)
- `skills/spec/SKILL.md` (*Project ledger → Write path*, :366-375)

## Implementation guidance

**Shared parser.** Today's `ledger-scope.ts:14` `ROW` requires a `[tags]` column, so it can't read project rows (`` `x.md` — `paths` — summary ``) or pointer rows (`` `docs/specs/_ledger/x.md` — [general] — … ``). `core/ledger-index.ts` parses what all three share — `{section, file, line}` — and leaves tags to `ledger-scope.ts`. It is the one parser phase 5's doctor checks reuse. Handle a project INDEX with no `##` sections (append) and free-form kinds (new section `## <Kind>s` when none matches). Keep `doctor/ledger.ts:5`'s file-only regex until phase 5 moves it onto this module.

**`lessons add <entry.md> <spec>`.** The agent writes the entry with the Write tool at `docs/specs/_ledger/<kind>-<slug>.md` — the spec-file hook validates it there, same as today. The command then: prints `lessons similar` close matches as a warning (the score divides shared stems by the *smaller* set, `similar.ts:28-31`, so it informs and never refuses); sets `created:` when missing and `seen-in: [<spec>]` via `setFrontmatterLine`; appends the project INDEX row and the spec pointer row via `insertRow`. One `EditPlan`, validated with `checkProjectLesson` + `checkLedgerIndex` before applying. Mode prose: run `lessons similar` first, prefer `lessons seen` when one says the same thing.

## Deliverables

- [x] `core/ledger-index.ts` parse + `insertRow` + formatters for all three row kinds; round-trip tests; `ledger-scope.ts` migrated
- [ ] `setFrontmatterLine` extracted; `addSeenIn` tests still green
- [ ] `lessons add` bookkeeping on an existing entry: `created`, `seen-in`, project row, pointer row; one plan
- [ ] `lessons add` prints close `similar` matches without refusing
- [ ] SKILL.md write path rewritten (write the entry → `lessons add`; no-Bun fallback kept)
