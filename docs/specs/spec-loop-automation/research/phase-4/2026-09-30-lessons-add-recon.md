# Phase 4 recon — lessons add (whole phase, one chunk)

Single inline wave: the phase entry named every file, so the seam was read directly.

## Seam

- `context/ledger-scope.ts:14-32` — `ROW` needs a `[tags]` column right after the file; `ROW_START` counts the rest as `unparsed`. Only caller: `context/packs.ts:82` (`ledgerBlock`). Pointer rows (`` `docs/specs/_ledger/x.md` — [general] — … ``) already match because `[^`]+` allows `/`.
- `doctor/ledger.ts:5` — `INDEX_ROW_FILE` excludes `/`, so spec pointer rows are ignored by `checkLedgerIndex`; it stays until phase 5 (per phase entry).
- `lessons/seen-in.ts:5-20` — `SEEN_IN_BLOCK` regex replaces `seen-in:` plus indented `- x` continuation lines, else inserts before the closing fence. The regex is not limited to the frontmatter: a body line starting `seen-in:` would be rewritten. Extraction fixes that by patching only the header.
- `commands/lessons.ts:44-55` — `seen` resolves `<entry>` under `PROJECT_LEDGER_DIR`, appends `.md` when missing; `add` mirrors it.
- `commands/phase.ts:129-135` — `resolveSpec` is private; `lessons add` is its second caller → move to `core/spec-folders.ts` with a test.
- `core/schedule.ts:48` `isoTimestamp(date)` — mirrors `spec-bump.sh --now`; use it for `created:` (inject `now`).
- `core/apply-edits.ts` — `EditPlan`, `applyEdits`; `phases/validate.ts` is the before/after diff pattern to mirror for `checkProjectLesson` + `checkLedgerIndex`.
- `lessons/similar.ts` — the entry is already on disk, so it scores itself 1.0; exclude it by name.

## Row formats in the wild

- Spec INDEX: `## <Kind>s` sections (`Domain` is singular); rows `` - `x.md` — [tags] — summary ``; a blank line may sit between heading and rows.
- Project INDEX (this repo, CRM): no `##` sections, a header + prose line, rows `` - `x.md` — `paths` — summary ``. CRM's paths column is either one backtick pair with `, ` inside or several backticked globs — the parser must treat the tail as free text.

## Testing-issue estimate

- No harness gaps: `tests/tree.ts` (`createTree().spec`) + `tree.write("docs/specs/_ledger/…")` cover both INDEX files; `lessons.test.ts` already has a project fixture.
- Size caps: all touched files are under 70 lines; `commands/lessons.ts` (65) gains `add` — fine.
- Purity: `planLessonAdd(projectDir, spec, entryName, {now, summary})` reads files, returns an `EditPlan`; command applies. Same split as `phases/*`.
- Summary text: rows need a ≤80-char summary; the lesson title is the natural default but can be longer → needs a `--summary` override.
