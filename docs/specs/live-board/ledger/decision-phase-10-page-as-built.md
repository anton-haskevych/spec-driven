---
kind: decision
applies-to: [phase 11]
created: 2026-11-13T14:19:53-08:00
---

# The page as phase 10 built it

What phase 11 (Academy's board moves over) builds on. Paths under `skills/spec/tools/`:

- **Model** (`page/model.ts`, `PAGE_VERSION = 1`): `buildPageModel(inputs, board, { people, now })`, pure, from
  `loadBoardInputs` + `buildBoard` (`page/load.ts`). Cards carry squares per covering phase (`page/phases.ts`:
  merged, deployed, done = live; in flight = doing), stage todo/moving/done (`page/cards.ts`: all phases shipped
  but card open stays moving until a session closes it), origin quote, the open question about the card or a
  covering phase, sessions on a covering spec, and a *Copy for Claude* line. Plan rows: one per tag, a card in
  each of its tags; a card sits in its first covering spec's panel; *Open* is cards with no cover (not "nobody
  holds it"); untagged cards are a last `No tag` row. Needs-you rows reuse `attentionCells`; the record's
  questions replace their park rows and carry id and version. "Mine": a row's owner is the spec owner (cards:
  assignee; unsaved work: its person); no owner or no git name counts for the viewer.
- **Sessions on the page:** documents from the last day; this host's only when its process is live. Writing =
  wrote < 5 min ago; silent = unpushed work and quiet ≥ 30 min (red).
- **Render:** `page/render*.ts`, `marks.ts`, `styles.ts` (mock components) + `tokens.ts` (colours). Every screen is in
  one document; `script.ts` routes by hash, swaps pushed renders (held while an answer is being typed), folds,
  sorts, filters, posts the answer and shows a toast. A question row links to its card.
- **Server** (`page/server.ts`): routes `/`, `/model.json`, `/health`, `/events` (SSE, a tick or a render every
  5 s cycle), `POST /answer` (Host/Origin/JSON checked). `page/refresh.ts` rebuilds on a moved tip, 60 s, or an
  answer. `page/serve.ts` is the detached child: tip fetch only when `board.record` is on (4 s limit), answers
  sent with no `CLAUDE_CODE_SESSION_ID` so they stamp no session document.
- **Process** (`page/process.ts`): `<common>/spec-board/page/running.json` {pid, port, version}, port
  41700 + hash(common dir) % 200 (+ up to 9 if taken), cwd the main checkout, reuse / replace by version,
  idle exit 2 h. `commands/page.ts` refuses when `CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF=1` (crew `--bg` sessions).
- **Not built:** the Academy client export and the jump to a session's terminal tab (backlog); vendoring the fonts.
- **Preview:** `bun skills/spec/tools/tests/page-preview.ts [port]` serves factory data on an in-memory record.
