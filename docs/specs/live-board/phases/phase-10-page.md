---
needs: [6, 8]
same-files-as: [9]
pr: G
gate: design
---

# Phase 10 — The page

**Goal:** a read-mostly page that Claude starts and opens, showing the board by status and by tag and updating
within seconds, on which a person can answer a question and make small edits.

**Outcome:** one place to look at everything, including one customer's work alone under its tag. For looking,
not for doing the work · medium · low risk: it reads the local copy and writes through the same version check.

**Files to touch:**
- `skills/spec/tools/page/server.ts`, `page/page.html` (new), `commands/page.ts` (new), `spec.ts`
- `skills/spec/list.md`, `SKILL.md`

## Implementation guidance

The plugin has no server, HTML or port today (wave 2 → *What the plugin can ship*), so this phase sets the
precedent; keep it small. `Bun.serve` is built in, which keeps the zero-dependency rule. The page is one HTML
file with inline CSS and script.

The Academy board's page in the CRM repo (`ops/src/academy-board/server.ts`, `page/board.html`,
`page/db-shim.js`) is the working exemplar for the loop: poll for a new tip every 5 s, push a snapshot to open
pages over server-sent events. Here the server refreshes the local copy (`record/mirror.ts`) and serves the
**computed board model**: `buildBoard` → `Board`, the versioned model `board --json` already prints
(`board/model.ts`), extended with cards and tags, plus the record version of each editable field. The page
only renders. The Academy page computes in the browser (`db-shim.js`) because it had no server-side model;
copying that would put a second copy of `phaseStage` and the *Needs you* rules in page script, and the page
and the CLI board would disagree. Do not copy its unpinned writes either: every edit from the page goes
through `writeRecord` with `ifVersion` set to the version the page last showed, and a conflict re-renders with
the current document.

The server is started detached with a pid file, as `trees/prune-background.ts:8-35` does, binds 127.0.0.1 only,
and a second `spec.ts page` reuses the running one and just opens the browser. It is offered by the list mode;
the user never types a command.

Agree the design before building: `design.md` → *The page* is the starting sketch. The gate covers the two
views, what a card shows (covering phases, who is on them, origin quote), and exactly which edits are allowed.

## Deliverables

- [ ] Gate: the page's design (two views, card contents, allowed edits) agreed with Anton
- [ ] `page/server.ts`: serves the page and the `Board` model (with cards, tags and field versions) built from the local copy, refreshes every 5 s, pushes changes over server-sent events; 127.0.0.1 only; no board rule is computed in page script
- [ ] `page.html`: by status and by tag, a *Needs you* strip, cards with covering phases, sessions and origin quote; light and dark
- [ ] Edits from the page (priority, due date, tags, who has it, answering a question) go through `writeRecord` with the shown version; a conflict re-renders
- [ ] `spec.ts page`: starts the server detached with a pid file, reuses a running one, opens the browser; `list.md` offers it
- [ ] `SKILL.md` updated; ROADMAP row and version bump for PR G

## Phase-local notes

- Check the rendered page at phone width and at 125% zoom (Anton's Chrome runs at 125%); keep the screenshots
  in this spec's folder, not in `/tmp`.
