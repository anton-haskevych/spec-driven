# Phase 10 — The page: recon (2026-11-13)

Paths are under `skills/spec/tools/` unless they start with `skills/` or `docs/`. Two read-only explorers, one wave.

## The seam

**What the board model holds.** `Board` (`board/model.ts:218-243`, `BOARD_VERSION = 3`): lanes (focus, inFlight, ready,
blocked, needsYou), footer, `people` (only for `board --who`). It holds no cards, tags, sources, sessions, PR
documents or question ids. `needsYou` rows carry card rows as `{card, title, covers}` only (`cards/attention.ts:11-13`)
and `question` rows without id or version (`model.ts:112`).

**Where the rest is already loaded.** `loadBoardInputs` (`board/load.ts:62-106`) reads the record view
(`inputs.plans.record`), `prDocs`, `sessionDocs`, `claims`, `sessions`. `buildBoard` (`board/lanes.ts:42-74`) just
doesn't project them. Readers to reuse:
- cards: `readCards(view)` (`cards/read.ts:16`), `cardRows` (`cards/list.ts:15`, `card list --json`), `originOf` (`cards/read.ts:35`), `readTags` (`cards/tags.ts:28`), `groupByTag` (`cards/list.ts:35`)
- covering phases: `coveredPhasesOf` (`board/card-rows.ts:16-24`, private) and `coveredPhases` (`cards/attention.ts:28-33`, private); stage via `phaseStage`
- who is on a phase: `inputs.claims`, `FlightRow.holder/session` (`board/flight.ts:38`), `claimedPhase` / `otherMachineSessions` (`board/session-docs.ts:7-32`)
- questions: `questionRows(view, all)` (`questions/list.ts:7-23`) already has `spec` and `version`

**Versions.** A document's version is its blob id: `RecordView.version(path)` (`record/view.ts:7-12`). Only questions
expose it today; cards and tags need `view.version(cardDocPath(id))` / `tagDocPath(name)`.

**Writes.** `writeRecord` returns `{kind: "conflict", path, current, currentVersion}` (`record/plan-writes.ts:15,75`),
but every command path turns it into a string and drops `current` (`commands/card/send.ts:38-44`,
`plan/record-send.ts:64-67`). A server must call the plan through `sendRecordIntent` (`plan/record-send.ts:55`) to get the
structured `RecordWrite` back. Plans: `updateCardPlan` (`cards/plans.ts:65`, `ifVersion` optional, defaults to the version
read), `setTagPlan` (`cards/tags.ts:53`), `tagCardPlan` (`cards/tags.ts:38`, **no ifVersion**), `coverPlan`
(`cards/cover.ts:26`, no ifVersion), `answerPlan` (`questions/plans.ts:42`, ifVersion). Assignee is checked in the command
layer (`commands/card/edit.ts:52`, `resolveAssignee` at `cards/people.ts:4-10`), not in the plan.

**Refresh.** Reads through git cost two spawns without the network (`readLocalPlans`, `plan/read-plans.ts:97`).
`fetchRecordTip` (`record/ref.ts:40-56`) is one round trip, 10 s limit. A full `loadBoard` also fetches the base branch,
runs `gh pr list`, scans worktrees and can write PR documents (`board/load.ts:132-137`): too heavy for a 5 s tick.
`record/mirror.ts` is only called from `record sync` and no reader uses it.

## Where `page` plugs in

- Dispatch table `spec.ts:44-76` (`Command { usage, run }`); exemplar `commands/record.ts` (87 lines, deps interface + `systemRecordDeps`). Result is the last stdout line.
- Detached pattern `trees/prune-background.ts:8-36`: injectable `Spawner`, `detached: true`, `stdio` to a log, `child.unref()`, pid file `running.pid` in `stateDir(git, "prune")` (`core/git.ts:63-73`), liveness `process.kill(pid, 0)` (`:54-61`). The child re-enters `spec.ts` with a flag that makes it work in the foreground.
- No browser-open precedent in the repo (no `open` call).
- Codex pilot refuses unknown commands by default (`runtime/workflow-capabilities.ts:36`); `tests/workflow-capabilities.test.ts:10-15` lists the refused names.
- Docs: `SKILL.md` Tools bullets `:101-126` (598 lines); `list.md` offers actions as `"<label>": <command>, only on the user's word` (`:34-36`). `tests/commands-table.test.ts:28-33` fails when a mode file names `spec.ts <x>` that is not in `COMMANDS`.
- Release: ROADMAP *Live board* table `:162-168`; `python3 scripts/version.py --set <v>`; one minor per PR group, 2.57.0 now, so PR G is 2.58.0.

## Reuse

- Process pattern: `prune-background.ts` (spawner, pid file, liveness) — extract `isAlive` and the pid-file read/write rather than copy (second use, named here).
- Board model projection: add a `Board` section built from the same inputs, not a second computation.
- Record writes: `sendRecordIntent` + existing plans; `question list`'s `version`.
- Tests: `tests/fake-record.ts`, `tests/record-factories.ts` (`cardDoc`, `sourceDoc`, `tagDoc`, `questionDoc`, `sessionDoc`), the injected-spawner test in `tests/trees-prune.test.ts:159-197`.

## Testing-issue estimate

- `board/model.ts` is 243 lines (cap 250): the new card/tag/question projection must live in a new file (`page/model.ts` or `board/cards-view.ts`), with `Board` gaining one optional field at most.
- `board/lanes.ts` (204) and `commands/claim.ts` (217) are not touched.
- `SKILL.md` is 598 lines of prose: one bullet, no size concern.
- Server side effects: `Bun.serve` has been tested only over unix sockets; no test fetches localhost TCP. Tests bind port 0 and fetch it. Bun 1.4.4 streams `ReadableStream` bodies for SSE; the default `idleTimeout` (10 s) closes an idle stream, so set `idleTimeout: 0` for the page server or send a comment line every ~5 s.
- Non-pure tangles: the tick (fetch → read → model) must be one function taking a `readModel` dep so the SSE loop is testable with a fake; `page.html` can't be unit-tested, so it renders one JSON model and its logic stays under ~100 lines (checked in a browser, screenshots kept in the spec folder).
- Conflict result: the edit endpoint returns `current` + `currentVersion`; test it with `fakeRecord()` plus a second write in between.
- Open problem: tag edits (`tagCardPlan`) and covers have no `ifVersion`. "Edits from the page go through writeRecord with the shown version" needs a version on card tags: pass the card document's version as `ifVersion` on a tag edit (the tag list is part of the card doc).
