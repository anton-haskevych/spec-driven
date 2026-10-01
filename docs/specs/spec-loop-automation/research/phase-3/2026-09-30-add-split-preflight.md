# Phase 3 preflight — add and split (chunk 1)

## Findings that change the plan

1. **`--items b:1,2 c:3` can't be parsed as written.** `node:util` `parseArgs` takes one value per flag occurrence, so `c:3` lands in positionals and reads as a third title (`technical.md` → *Commands*, `phase split`). Fix: `--items` is `multiple: true`, and each value is split on whitespace, so both `--items b:1,2 --items c:3` and `--items "b:1,2 c:3"` work. Labels `b`, `c`, … name the new titles in argument order (the original is implicitly `a`). Numbers are `#N` open-item positions in the original entry, the same counting `locateOpenItem` uses (`phases/locate.ts:20`).
2. **Validation is blind to edges.** `issuesIntroducedBy` (`phases/validate.ts:15-18`) runs `checkPhases` + `taskPhaseIssues` only, so `add --needs 99` or a cycle would land. Add `phaseEdgeIssues(state, nodes)` (`doctor/phase-edges.ts:7`), with nodes injected by the command (`loadNodes`). It's still diff-based, so pre-existing edge errors don't block.
3. **The plan doesn't say what edges split's new parts get.** We decide: each part copies the original's frontmatter edges (`needs`, `needs-deployed`, `same-files-as`, `pr`, `code`). A part's dependencies are a subset of the whole's, so copying is safe, and the user narrows them after. The parts never `need` the original: they came out of it.
4. **Split can complete the original.** If every remaining item of the original is ticked after the move, `checkPhases` would flag "every sub-item ticked; tick the phase" (`doctor/phases.ts:21-22`). Split flips the original's progress box in the same plan, as tick does. An original with no items left at all is valid (0/0 raises no warning).

## Clean Code / SOLID

| Rule | Verdict | Consequence |
|---|---|---|
| Small functions | Bites | `split.ts` divides into: parse items spec → move items → build part files → insert progress lines → review refs. `review-refs.ts` gets its own file (it reads every spec) |
| SRP | Bites | `phases/template.ts` (file text + progress line) is shared by add and split. Id allocation (`nextLetterId`, `nextIntegerId`) lives in `phases/ids.ts` |
| OCP | Bites | `ACTIONS` rows; no dispatch edits |
| Errors as values | Bites | Every refusal is `invalid` with a reason; review notes are plain output lines, not errors |
| DIP | Bites | nodes are passed into validate, so it doesn't load them |
| DDD | Skipped | Tooling |

## Guard blindness

The round-trip `loadSpecState` sees the new phase line only if it's top-level. The test asserts the new id shows up in `state.phases`, which would fail on an indented insert.

## Amendments

1. `--items`: `multiple: true`, whitespace-split, `b|c|…:N,M`.
2. `issuesIntroducedBy(spec, edits, nodes)` adds `phaseEdgeIssues`.
3. Split parts copy the original's edges. Split flips the original when the move completes it.
4. New modules: `phases/ids.ts`, `phases/template.ts`, `phases/add.ts`, `phases/split.ts`, `phases/review-refs.ts`.

## Decisions for you

None. Edge copying is the conservative default and the review output names the parts so they can be narrowed.
