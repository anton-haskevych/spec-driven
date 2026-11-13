# Phase 10 — The page: preflight (2026-11-13)

Inputs: phase entry, `2026-11-13-page-recon.md`, `principles.md`. Paths under `skills/spec/tools/`. Grounded by reading
`plan/record-send.ts`, `trees/prune-background.ts`, `board/card-rows.ts`, `board/load.ts`, `commands/board.ts`,
`commands/card/send.ts`, `cards/{plans,tags,intents,list}.ts`, `questions/{plans,list}.ts`, `plan/read-plans.ts`.

## Findings that change the plan

1. **The phase says "writes go through `writeRecord` with the shown version", but the commands can't do that.** Every command
   path turns a conflict into a string and drops `current` (`commands/card/send.ts:38-44`, `plan/record-send.ts:64-67`).
   The server calls `sendRecordIntent` (`plan/record-send.ts:55`) with the existing intents (`CARD_COMMAND` +
   `cardIntentPlan`, `cards/intents.ts:17`; `answerPlan`, `questions/plans.ts:42`), which returns the structured
   `RecordWrite`. That keeps the stamp, the validation and the offline queue, and gives the page `conflict` with the
   current document. No new write path.
2. **A tag edit has no version check.** `tagCardPlan` builds its op with no `ifVersion` (`cards/tags.ts:48`) and
   `readCardIntent` drops one from a `tag` intent (`cards/intents.ts:39-43`). Add optional `ifVersion` to `TagCardIntent`,
   put it on the op, carry it through `refListIntentOf`. Priority, due date and assignee already take it
   (`cards/plans.ts:103`); an answer takes it (`questions/plans.ts:94`).
3. **The board model has no cards, tags, versions or question ids.** `Board` (`board/model.ts:218-243`) carries card rows
   as `{card, title, covers}` only, question rows with no id. Don't grow `Board` (243 of 250 lines). A pure
   `page/model.ts` returns `PageModel = { board, cards, tags, questions, people, tip }`: `board` is `buildBoard`'s
   output untouched, `cards` is `cardRows(view, {all})` (`cards/list.ts:15`) plus the document version
   (`view.version(cardDocPath(id))`), covering phases with their stage, and who is on them; `questions` is
   `questionRows` (`questions/list.ts:16`, already versioned). Export `coveredPhasesOf` (`board/card-rows.ts:16`,
   private today) and `attentionCells` (`board/render.ts:97`, private) rather than copy them: the strip's wording and
   the stage rules stay in one place. Who is on a phase comes from `board.lanes.inFlight` holders, not a new rule.
4. **A 5 s refresh cannot call `loadBoard`.** It fetches the base branch, runs `gh pr list`, scans worktrees and may
   write PR documents (`board/load.ts:62-106,132-137`). The tick is `fetchRecordTip` (one round trip,
   `record/ref.ts:40-56`); the model is rebuilt only when the tip moved, or 60 s passed, or right after a page edit.
5. **The server's own working directory can vanish.** Started from a worktree, it breaks the day that tree is pruned
   (git runs in `projectDir`). Serve from the main checkout (the parent of the git common dir, `core/git.ts:63-73`).
   The server also outlives plugin updates: its state file records the plugin version, and `page` replaces a server
   whose version differs.
6. **Localhost edits are open to any web page the user visits** (a form POST or a DNS-rebinding page can reach
   127.0.0.1). Edits are accepted only with `Host` equal to the server's own `127.0.0.1:<port>` / `localhost:<port>`,
   `Origin` equal to it when present, and `Content-Type: application/json`. Not in the phase text; it belongs in
   the gate's "allowed edits" answer.
7. **`isAlive` and the pid-file read are private to `prune-background.ts:46-61`.** The page is the second use
   (named in this chunk): move `readText`, `isAlive` and the pid file read/write to `core/pid-file.ts` with its own
   test; prune imports them.

## Clean Code / Architecture / SOLID / DDD, against the unit

| Rule | Verdict | Consequence |
|---|---|---|
| Functions small, one thing | Bites | `server.ts` splits: `page/server.ts` (routes), `page/model.ts` (pure), `page/refresh.ts` (tick policy), `page/edits.ts` (request → intent → `RecordWrite` → response), `page/process.ts` (start/reuse/stop), `commands/page.ts` (args, line). Each under 250 lines |
| Pure functions | Bites | `buildPageModel(inputs, view, now)` and the refresh policy `shouldRebuild({tipMoved, ageMs, edited})` are pure; the loop takes `readTip`, `buildModel`, `now` as deps so SSE is testable with fakes |
| Dependency Rule | Bites | `page/` imports `board/`, `cards/`, `questions/`, `record/`, `plan/`; none of those import `page/`. `core/pid-file.ts` imports nothing above it |
| Humble Object | Bites | `page.html` holds only rendering and fetch calls; every rule lives in the model |
| SRP by actor | Bites | the process manager (an operator) and the model projection (a board reader) change for different reasons: separate files |
| OCP | Inert | two views, no variant expected |
| DIP | Bites | `Spawner` (`trees/prune-background.ts:5`) is the port for the detached start; add an `openBrowser(url)` port so tests don't open Chrome |
| DDD language | Bites | "card", "tag", "question", "needs you": the page uses the board's words, no new ones (`design.md` → *One word*) |
| Pass D aggregates | Inert | no new documents; the page writes existing ones through their plans |

## Guard blindness

- `tests/commands-table.test.ts:28-33` fails when a mode file names `spec.ts page` without a `COMMANDS` entry: it can
  see the `list.md` offer, so the command is added in the same commit as the doc.
- `tests/workflow-capabilities.test.ts:10-15` lists refused names for the Codex pilot; `page` must be added so the
  refusal is pinned, not just the default branch at `runtime/workflow-capabilities.ts:36`.
- No guard covers `page.html`; it is checked in a browser (below).

## Seam and testability (deltas to recon)

- Line counts: `board/render.ts` 158, `board/card-rows.ts` 25, `cards/tags.ts` 80: room. `spec.ts` 108: one entry.
- `Bun.serve` over TCP is not tested anywhere: tests bind port 0 and use `fetch`; SSE is read with a reader and
  closed. Set `idleTimeout: 0` and send a comment line every 15 s.
- `page.html` can't be unit-tested: render check with the chrome-devtools MCP (our own localhost) at phone width and
  at 125% zoom, screenshots into `docs/specs/live-board/research/phase-10/`.
- Fixtures: `tests/fake-record.ts` + `tests/record-factories.ts` cover cards, tags, questions, sources, sessions.

## Amendments

1. Add `core/pid-file.ts` (+ test); `prune-background.ts` imports it.
2. `cards/tags.ts` + `cards/intents.ts`: optional `ifVersion` on the tag intent (+ tests).
3. Export `coveredPhasesOf` and `attentionCells`; add `page/model.ts` (pure, tested with fake records).
4. `page/refresh.ts`, `page/edits.ts`, `page/server.ts`, `page/process.ts`, `commands/page.ts` as above; `page/page.html`.
5. State file `running.json` `{pid, port, version}` in `stateDir(git, "page")`; `page` reuses a live server of the same
   version, replaces an older one, prints `page: http://127.0.0.1:<port>` last.
6. Add `page` to `COMMANDS`, the Codex refusal test, `SKILL.md` *Tools*, `list.md` (offered, on the user's word), ROADMAP
   row 2.58.0 and version bump.

## Defaults applied

- Tick: record tip every 5 s; model rebuilt on a moved tip, after 60 s, or right after an edit.
- One server per clone, on a free port, served from the main checkout; exits after 2 h with no page open (it is a
  user tool, started on the user's word, never by a crew worker).
- Page edits run as the person who started the server (`answererOf`); an edit made offline is queued like any other
  and the page says `kept on this machine`.
- Edits are accepted only from the page's own origin (finding 6).
- Closed cards (done, dropped) are shown under a collapsed *Closed* group per tag and aren't editable
  (`cards/plans.ts:108-112`).

## Forks for you

The gate itself (the design, below): two views, what a card shows, exactly which edits. Recommendation in the
gate question; nothing else forks.
