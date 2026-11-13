---
needs: [6, 8]
same-files-as: [9]
pr: G
gate: design
---

# Phase 10 — The page

**Goal:** a page for looking that Claude starts and opens: what needs a person and which sessions are alive
(Now), every project by priority (Plan), and one card in full. It updates within seconds, and the only thing a
person can do on it is answer a waiting question.

**Outcome:** one screen that says in two seconds what needs you, which sessions are alive and whether each
customer ask is moving, and a second that shows every project by priority. For looking, not for doing the
work · medium · low risk: it reads the record and its one write goes through the same version check.

**Files to touch:**
- `skills/spec/tools/page/` (new): `model.ts`, `render.ts`, `styles.ts`, `refresh.ts`, `answer.ts`, `server.ts`,
  `process.ts`; `commands/page.ts` (new), `spec.ts`, `core/pid-file.ts` (new, shared with `trees/prune-background.ts`)
- `board/card-rows.ts` and `board/render.ts` (export what the model reuses)
- `skills/spec/list.md`, `SKILL.md`

## Implementation guidance

**The design is agreed** (Anton, 2026-11-13): `research/phase-10/2026-11-13-page-council-and-design.md` says what
each screen shows and why; `research/phase-10/2026-11-13-page-design-mock.html` is the look to build (its
`<style>` block is the token set and the components; its three mock screens are the markup to produce). Read
both before writing any code. `design.md` → *The page* is the summary.

The plugin has no server, HTML or port today (wave 2 → *What the plugin can ship*), so this phase sets the
precedent; keep it small. `Bun.serve` is built in, which keeps the zero-dependency rule:
`research/phase-10/2026-11-13-bun-built-ins.md` lists what Bun 1.4.4 gives and its traps (`development` is on by
default; never import the `.html` file in `routes`; never `Bun.sleep` in the event stream).

**The server builds the HTML.** A pure `renderPage(model) → string` (template strings and `Bun.escapeHTML`), so
`bun test` and `curl` check the page and a session with no browser can verify it. Page script only swaps each
new render in, folds rows, sorts, filters and posts an answer. No board rule is computed in page script: the
Academy page does that (`db-shim.js`) and its page and CLI disagree.

**The model** is pure and built from what the board already loads (`recon` → *The seam*): `buildBoard`'s `Board`
untouched, plus cards with their origin quote, covering phases and stage (`coveredPhasesOf`,
`board/card-rows.ts:16`, exported), tags with priority and reason, question rows with id and version
(`questions/list.ts:16`), sessions. `board/model.ts` is at 243 of 250 lines: add nothing to it. Wording for
needs-you rows comes from `attentionCells` (`board/render.ts:97`, exported), not from new text.

**Refresh.** A full `loadBoard` fetches the base branch, runs `gh pr list` and scans worktrees: too heavy for
5 s. The tick fetches the record tip (`fetchRecordTip`, one round trip); the model is rebuilt when the tip
moved, after 60 s, or right after an answer. Every tick is sent to open pages even when nothing changed, so
the page can tell a dead feed from a quiet board.

**The one write.** `answerPlan` with `ifVersion` (`questions/plans.ts:42`) sent through `sendRecordIntent`
(`plan/record-send.ts:55`), which returns the structured result; the command paths turn a conflict into a
string and drop the current document. The POST is accepted only when `Host` is the server's own
`127.0.0.1:<port>` or `localhost:<port>`, `Origin` matches when present, and the body is JSON.

**The process.** Started detached with a state file (pid, port, plugin version) in `stateDir(git, "page")`, as
`trees/prune-background.ts:8-36` does; move its `isAlive` and pid read to `core/pid-file.ts` and share them.
One server per clone, served from the main checkout (a worktree can be pruned under it), on a port derived
from the clone path so a link survives a restart; it exits after 2 h with no page open. A second `spec.ts page`
reuses it, replaces one started by an older plugin version, and opens the browser. It is offered by the list
mode; the user never types a command, and a crew worker never starts it.

## Deliverables

- [x] Gate: the page design (Now and Plan screens, the opened card, one edit: answering a question) agreed with Anton — Anton, 2026-11-13: "Page design approved … answer a waiting question only", then on the redrawn mock "I love the font the views the styles, everything is perfect" (research/phase-10/2026-11-13-page-design-mock.html)
- [x] `page/server.ts`: 127.0.0.1 only; serves the page and the model; checks the record tip every 5 s, rebuilds the model on a moved tip, after 60 s or after an answer, and pushes each render over server-sent events with a tick every cycle; the page greys out with a banner after 15 s without a tick; the needs-you count in the tab title; `/#c<id>` opens a card
- [x] `page/render.ts` and `page/styles.ts`: the server builds the HTML for Now, Plan and an opened card from the model, as in the approved mock (`research/phase-10/2026-11-13-page-design-mock.html`); light and dark; `data-id`, `data-kind` and `data-stage` on rows; page script only swaps the render in, folds rows, sorts, filters and posts an answer
- [x] Answering a waiting question from the page goes through `answerPlan` with the shown version; a conflict re-renders with the current question; the request is accepted only from the origin the page was served from; no other edit exists
- [x] `spec.ts page [<card-id>] [--json]`: starts the server detached with a state file (pid, port, plugin version) on a port that stays the same per clone, reuses a running one, replaces one from an older version, opens the browser; `--json` prints the model the page shows; `list.md` offers it
- [ ] `SKILL.md` updated; ROADMAP row and version bump for PR G
- [x] `page/model.ts`: the pure page model built from the board inputs and the record view: needs-you rows with question ids and versions, live sessions, moving cards with phase squares, Plan rows per tag (priority, reason, counts, a panel per covering spec, Open, Done), and each card in full for the opened view

## Phase-local notes

- Check the rendered page at phone width and at 125% zoom (Anton's Chrome runs at 125%); keep the screenshots
  in this spec's folder, not in `/tmp`.
