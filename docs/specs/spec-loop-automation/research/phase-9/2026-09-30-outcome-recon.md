# Phase 9 recon — plain-words outcome (whole phase, one chunk)

Single inline pass; the seam is four small spots. Paths relative to `skills/spec/`.

## Seam

- `tools/core/phase-entry.ts:11,18-31` — `GOAL` regex over `outlineMarkdown` paragraphs (bold already stripped; stops at the next `Label:`); `summarizePhaseEntry` returns `{goal, work, deliverables, nextRun}`. Add `outcome` the same way.
- `tools/context/status-table.ts:37` — Delivers cell = `goal ?? name`, truncated to 80. The only renderer of the table (pack + `status`).
- `status.md:27,53-71` — the hand-render rules; header is fixed ("do not add columns", `:66`).
- `create.md:294` — flat phase template `**Goal:**` line; `tools/phases/template.ts:42` already writes `**Outcome:**` (phase 3).
- `execute.md:132` — §10 PR gate; no PR-body guidance today.

## Reuse

- Same label-regex pattern as `GOAL`; `truncate` from `context/text.ts`; `SENTENCE_END` already in `phase-entry.ts`.
- No new column: status.md forbids it. The Outcome replaces the Goal in **Delivers** when present — the Goal is engineering wording, the Outcome is what the column's name promises.

## Testing-issue estimate

- Pure functions only; tests extend `tests/context.test.ts` (`summarizePhaseEntry`) and the status-table tests. No fixtures missing, no file near 250 lines (`phase-entry.ts` 56, `status-table.ts` 55).
- `context.test.ts:57` asserts the whole summary object with `toEqual` → gains `outcome: undefined`; adjust, don't loosen.
