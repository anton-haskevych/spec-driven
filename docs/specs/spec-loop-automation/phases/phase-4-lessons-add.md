---
needs: [2]
same-files-as: [3]
pr: B
---

# Phase 4 — Lessons add

**Goal:** `spec.ts lessons add` writes a project lesson, its project INDEX row and the spec's pointer row in one step, refusing when `lessons similar` finds a strong match.

**Outcome:** Recording a codebase lesson goes from four hand steps (and hand-typed timestamps) to one; duplicates are caught before they're written. Low risk.

**Files to touch:**
- `skills/spec/tools/core/ledger-index.ts` (new — parser from `context/ledger-scope.ts:14-32` + formatters for spec, project and pointer rows)
- `skills/spec/tools/core/frontmatter-patch.ts` (new — `setFrontmatterLine` extracted from `lessons/seen-in.ts:5-20`)
- `skills/spec/tools/lessons/add.ts` (new), `lessons/seen-in.ts` (becomes a caller)
- `skills/spec/tools/commands/lessons.ts` (`case "add"`, `USAGE`)
- `skills/spec/tools/context/ledger-scope.ts` (uses the shared parser)
- `skills/spec/SKILL.md` (*Project ledger → Write path*, :366-375)

## Implementation guidance

`lessons add <spec> --kind <k> --paths <globs> --title "<t>" --body-file <f>`: run the `similar` scorer first; above the strong-match threshold, return `invalid` naming the match and suggesting `lessons seen`. Otherwise write `docs/specs/_ledger/<kind>-<slug>.md` (slug from title) with `created: isoTimestamp()`, `seen-in: [<spec>]`, then append the project INDEX row and the spec INDEX pointer row (`- \`docs/specs/_ledger/<file>\` — [general] — <summary>`) under the right section via the shared formatter.

`ledger-index.ts` gives the project `_ledger/INDEX.md` its first parser — phase 5's doctor row checks reuse it. Keep `doctor/ledger.ts:5`'s file-only regex separate (it skips pointer rows on purpose).

Body comes from a file so the agent writes prose with the Write tool (hook-validated) and the command does only bookkeeping.

## Deliverables

- [ ] `core/ledger-index.ts` parse + format, round-trip tests; `ledger-scope.ts` migrated
- [ ] `setFrontmatterLine` extracted; `addSeenIn` tests still green
- [ ] `lessons add` refuses on strong `similar` match
- [ ] `lessons add` writes entry + project row + pointer row; round-trip
- [ ] SKILL.md write path rewritten around `lessons add` (no-Bun fallback kept)
