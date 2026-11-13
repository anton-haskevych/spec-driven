# Phase 10 — The page: council and the agreed design (2026-11-13)

The design gate. Supersedes the edit list and the model sketch in `2026-11-13-page-preflight.md` (findings 1–2 and
amendment 2 there assumed five edits). The approved mock is `2026-11-13-page-design-mock.html` beside this note
(also https://claude.ai/artifact/Wur75ZLY2g3HQX5wZ37qok, version 4).

## What Anton said

- "No-one in CRM Dance is using manual development, no one is going to add or update those cards manually. So this
  whole thing needs to work perfectly for agentic development and agentic interaction. Human board is just a fast
  visual way for us to understand what is going on. It needs to be adhd-friendly and visual."
- "We can use bun for rendering the stuff like server pages or whatever html. I just thought it would be fast and
  resources efficient local tool … and allows to have both frontend and backend in one place."
- Picks: "Page design approved. Layout: Triage + sessions. On the page I can: answer a waiting question only.
  Extras: page --json, server-built HTML, links that keep working, count in the tab title, jump to a session's tab
  (backlog card)."
- "take inspiration from the board of the skill that was already built once … academy-ballroom-board … I like one
  of the views that allows to see planned tasks and sort by priority and groups by the project."
- On iteration 2: "this looks too tight now and too monotone."
- On iteration 3 (the saved mock): "I love the font the views the styles, everything is perfect."

## The council (five voices, one brief)

Linus Torvalds, a mission-control display engineer, the founder with ADHD, an information designer, an
agent-experience engineer. Where they agreed, adopted:

| Point | Adopted as |
|---|---|
| A frozen page must look dead | The server sends a tick every cycle; the page greys the board and shows a banner after 15 s without one |
| One number first | The *needs you* count, per person, on the Now screen and in the tab title; zero must be true |
| Words behind a click | Quotes, ids, phase names and PR detail live on the opened card |
| Cut the hand edits | Only answering a waiting question stays (4 of 5; one voice also wanted priority: not taken) |
| The page renders the CLI's model | `spec.ts page --json` prints the model the page shows; HTML is built on the server so `bun test` and `curl` can check it |
| Stable hooks and links | `data-id`, `data-kind`, `data-stage` on rows; `/#c<id>` opens a card; a stable port so a link survives a restart |
| "Last write" is not liveness | This machine's sessions are checked by process (the board already does); another machine's show their last write as "quiet", never "dead" |

Overruled by Anton: "colour only for things that need action" (information designer, mission control) made the
page monotone. The agreed code is one meaning per colour, below.

## The agreed design

**Two screens and a card.**

- **Now**: a yellow *N need you* tile (the other person's count beside it) with up to three rows (a question with
  its answer buttons, the recommended one marked; a PR to open; an overdue ask), a strip of live sessions (person,
  spec and phase, time since last write; a silent one with unpushed work is red), then moving cards with their
  phase squares, filterable by project chip, then *Finished today* folded.
- **Plan** (from the Academy board's *By scope*): one row per project, where a project is a tag; P0 first, with
  the reason for the priority (the tag's `summary`), a done / moving / to-do bar with counts, who is on it and
  the nearest deadline. Rows start folded and open by themselves when something in them is overdue or waits on
  the viewer. Inside: one panel per covering spec with its live session and each card's phase squares, a dashed
  *Open* panel for cards nothing covers or nobody holds, *Done* as a count. Sort by priority or by deadline; show
  everyone, mine, or nobody's. A card with two tags is in both rows.
- **An opened card** (`/#c<id>`): title, priority, project, commitment, deadline; the origin quote with person,
  app and date and a count of other sources; the waiting question with its answer buttons; the covering spec's
  phases with names and stages; sessions on it or the last one; *Copy for Claude*.

**Colour, one meaning each.** Orange, blue, green: to do, moving, done (bars, count dots, phase squares: hollow
orange, half blue, full blue for built, green tick for live). Red: trouble only (overdue solid, due today or
tomorrow outlined, a silent session, the dead feed). Yellow: waits on you. Violet disc Anton, pink disc Taras
(solid: a session is writing now; tinted: holds it; dashed: nobody); people beyond two take further hues from a
fixed list. Priority is weight: P0 a solid ink badge, P1 an outline, P2 faint.

**Type.** Bricolage Grotesque for names and numbers, Atkinson Hyperlegible Next for text, Atkinson Hyperlegible
Mono for spec slugs, loaded from Google Fonts with a system fallback stack so the page still reads offline.

**One edit.** Answering a waiting question, through `answerPlan` with the version the page showed
(`questions/plans.ts:42`), sent with `sendRecordIntent` so a conflict comes back with the current document and
re-renders. Accepted only from the page's own origin (`Host` and `Origin` checks, JSON body). Priority, due date,
tags and assignee are not editable: a session sets them.

**Left out, logged in `docs/specs/_backlog/`:** jumping from a row to the session's terminal tab; a client
export like the Academy board's.

## Taken from the Academy board (`ops/src/academy-board/page/board.html` in the CRM repo), and left

Taken: the row per scope sorted P0 first then order (`scopeRows`, `:393-405`); panels per sub-project and per
claimer, then *Open*, then *Done* (`scopeCardList`, `:407-430`); the count line and bar (`countsLine`,
`:436-445`); the priority reason column; the deadline words (overdue, today or tomorrow, a date, no deadline
yet); the status colours.

Left: every form and button that writes (edit group, tags, claimed by, assignee, move, delete, add a card); the
hand-written *Status* paragraph per scope (phase squares are computed instead); all rows open at once (its scope
view is about 9,800 px tall with 26 scopes and 99 cards); rules computed in page script (`db-shim.js`).

## Choices made (said to Anton, not objected to)

- P0 is the heaviest badge, not red, so red only means trouble.
- Today and tomorrow are a red outline, not orange, because orange means to do.
- Inside a project: moving first, then by date. Done cards are a count until clicked.
- The Academy board keeps running until phase 11 moves its cards over.
