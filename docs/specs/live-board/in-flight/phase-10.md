# In-flight state

**Session ended:** 2026-11-13
**Active phase:** 10 — The page

## Where things stand

- The design gate is passed and ticked. No code is written yet: every other deliverable is open.
- The agreed design is on disk: `research/phase-10/2026-11-13-page-council-and-design.md` (what each screen shows
  and why) and `research/phase-10/2026-11-13-page-design-mock.html` (the look Anton approved as is; its `<style>`
  block is the token set and components, its three mock screens are the markup to produce). The same mock is at
  https://claude.ai/artifact/Wur75ZLY2g3HQX5wZ37qok (version 4).
- Recon and Bun research are done: `2026-11-13-page-recon.md`, `2026-11-13-bun-built-ins.md`. Don't redo them; a
  short preflight on the new deliverables is enough.
- `2026-11-13-page-preflight.md` was written before the gate: its findings 3–7 and the split of `page/` into
  files still hold; its findings 1–2 and amendment 2 (five edits, a version on tag edits) are void.

## Implicit context

- This repo has the board off (`join: … The board is off here`), so there is no record to show here. The page
  must render an honest empty state when there is no record, and its real data only exists in CRM once phase 5
  turns the board on. Build and check against fake records (`tests/fake-record.ts`, `tests/record-factories.ts`);
  for the browser check, start the server from a test helper with a model built from those factories. Anton did
  not pick a user-facing fixture flag, so don't add one to `spec.ts page`.
- The mock loads its fonts from Google Fonts with a system fallback stack. The real page does the same (a local
  page offline falls back to system fonts). Anton has not been asked about vendoring the fonts; list it under
  *Say if wrong*.
- Person colours: violet is the first of `board.people`, pink the second; pick further hues from a fixed list.
- The Academy board in the CRM repo runs on port 4777 (`pnpm board`); it is the reference for the Plan view and
  it holds customer names. This repo is public: never save a screenshot or data from it here. Screenshots of our
  own page with factory data go in `research/phase-10/`.
- Check the page at phone width and at 125% zoom with the chrome-devtools MCP (headless, our own localhost).
- PR G takes version 2.58.0 (one minor per PR group; 2.57.0 is current).

## Pick up from here

- Read the council-and-design note and the mock, then build in this order, one green commit each:
  `core/pid-file.ts` (moved out of `trees/prune-background.ts`, with its test) → `page/model.ts` → `page/render.ts`
  + `page/styles.ts` → `page/refresh.ts` → `page/answer.ts` → `page/server.ts` → `page/process.ts` +
  `commands/page.ts` + the `spec.ts` entry and the Codex refusal test → `list.md`, `SKILL.md`, ROADMAP, version.
- Record real RAM and CPU of the running server for the report (the idle Bun probe measured about 13 MB, 0% CPU).
