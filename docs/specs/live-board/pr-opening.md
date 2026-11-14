# PR Opening — Live Board

## Spec state

Spec written 2026-11-11 from prep (wave 1, wave 2, craft) and re-planned by the review of the same day
(`reviews/2026-11-11-write-contract-and-switch-day.md`). 12 code phases and 2 task phases. PR split:
**A:** phase 1 · **B:** phases 2, 2a, 3, 3a, 3b, 4 · **C:** phase 6 · **D:** phase 7 · **E:** phase 8 · **F:** phase 9 ·
**G:** phase 10. Phases 5 and 11 are tasks in the CRM repo and open no plugin PR.
One minor version per PR, picked at merge (main's minor + 1). PR B ships with `board.record` off. PRs C, D
and E each raise the record's layout number and carry the upgrade step for specs that joined earlier.
PR #37 merged 2026-11-11 as 9392c3f (squash).
PR #38 merged 2026-11-12 as 0aaa216 (squash).
PR #39 merged 2026-11-13 as e21190b (squash).
PR #40 merged 2026-11-13 as 75b669a (squash).
PR #41 merged 2026-11-13 as cfde02a (squash).
PR #42 merged 2026-11-13 as ea15598 (squash).
PR #43 merged 2026-11-13 as 2f1f7bf (squash).
PR #44 merged 2026-11-13 as 136d697 (squash).
PR #46 merged 2026-11-13 as bdc8085 (squash).
PR #47 merged 2026-11-13 as e01914d (squash).

## Pre-PR checks

Scoped to the plugin repo (`skills/spec/`). Plugin PRs open ready, not draft — never straight to `main`.

- [x] `bun test` passes (incl. `skill-wiring.test.ts`, `commands-table.test.ts`, `board-no-focus-golden.test.ts`)
  PR A, 2026-11-11 (load average 289): `1561 pass · 1 fail` — `codex-packaged-entry.test.ts` "source fixture
  completes … fresh-process pickup" timed out at 5906 ms against the 5 s default; alone with `--timeout 30000`:
  `4 pass · 0 fail`, as at the branch base (`docs/specs/_ledger/gotcha-codex-packaged-entry-test-runs-near-its-timeout.md`).
  PR B, 2026-11-12: `1805 pass · 0 fail`; typecheck clean; `bun install --frozen-lockfile` no changes.
  PR C, 2026-11-13: `1901 pass · 0 fail` across 269 files (272 s) before the newer-layout fix; then the
  write-command suites (`410 pass · 0 fail`) and the new `record-newer-layout.test.ts`; typecheck clean;
  `bun install --frozen-lockfile` no changes.
  PR D, 2026-11-13: `1938 pass · 2 fail` across 276 files (300 s); `spec-field-commands.test.ts` expected
  layout 2 (fixed: `4 pass`), `land-on-main.test.ts` "tries five times" is load timing (`11 pass · 0 fail`
  alone); typecheck clean; `bun install --frozen-lockfile` no changes.
  PR E, 2026-11-13: `2006 pass · 0 fail` across 287 files after the layout-4 commit; after the docs and
  version commit the doc and version suites (`353 pass · 0 fail`, 45 files); typecheck clean;
  `bun install --frozen-lockfile` no changes.
  PR F, 2026-11-13: `2080 pass · 1 fail` across 295 files (337 s): the same `codex-packaged-entry` "source fixture
  completes …" timing failure (5446 ms against 5 s); alone with `--timeout 60000`: `1 pass · 0 fail`; typecheck
  clean; `bun install --frozen-lockfile` no changes.
  PR G, 2026-11-13: `2125 pass · 1 fail` across 302 files (385 s): the same `codex-packaged-entry` "source fixture
  completes …" timing failure (5385 ms against 5 s); alone with `--timeout 30000`: `4 pass · 0 fail`; typecheck clean;
  `bun install --frozen-lockfile` no changes.
  PR I, 2026-11-13: `2140 pass · 0 fail` across 304 files (341 s, load average 12); typecheck clean;
  `bun install --frozen-lockfile` no changes.
  PR J, 2026-11-13: `2151 pass · 0 fail` across 304 files (357 s); typecheck clean; `bun install
  --frozen-lockfile` no changes.
  PR H, 2026-11-13: `2155 pass · 1 fail` across 305 files (500 s, load average 63): `join-command.test.ts` "a second
  run says already on the board" timed out at 6603 ms against 5 s (join code unchanged from main); alone with
  `--timeout 30000`: `9 pass · 0 fail`; typecheck clean; `bun install --frozen-lockfile` no changes.
- [x] `bun run typecheck` clean (PR A, 2026-11-11)
- [x] `bun install --frozen-lockfile` clean (no new runtime dependencies) (PR A, 2026-11-11)
- [x] `python3 scripts/version.py --set <main's minor + 1>` at merge; all declarations match; ROADMAP row added (PR B: 2.53.0, `All version declarations match: 2.53.0`, row under *Live board (2.53)*; PR C: 2.54.0, `All version declarations match: 2.54.0`; PR D: 2.55.0, `All version declarations match: 2.55.0`; PR E: 2.56.0, `All version declarations match: 2.56.0`; PR F: 2.57.0, `All version declarations match: 2.57.0`, row under *Live board (2.53–2.57)*; PR G: 2.58.0, `All version declarations match: 2.58.0`, row under *Live board (2.53–2.58)*; PR I: 2.59.0, `All version declarations match: 2.59.0`, row under *Live board (2.53–2.59)*)
- [x] New and touched tool files under 250 lines, functions under 50 (PR A: largest `record/outbox.ts`, 143; PR C: largest `board/model.ts`, 227; PR D: largest touched `commands/crew/tick.ts`, 162; PR E: largest touched `board/model.ts`, 230; PR F: largest touched `board/model.ts`, 243; PR G: largest new `page/styles.ts`, 225, `page/model.ts`, 196; `startPageServer` 45 lines; PR I: largest new `cards/load.ts`, 104; PR J: largest touched `page/styles.ts`, 234; PR H: `plan/export.ts`, 104, new `plan/frozen-progress.ts`, 16)
- [x] `bun skills/spec/tools/spec.ts doctor live-board` has no errors (PR A: `doctor: clean`; PR C, D, E, F, G and I: `doctor: clean (1 spec)`; PR J and H: `0 errors`, the two older warnings on phases 5 and 10a)
- [x] With the board off, a file-based spec behaves as before: the pre-existing suites pass unchanged
  PR A: nothing reads the record yet; the same one timing failure as `bun test` above.
  PR B, 2026-11-12: full suite green; the only edited expectation is the frozen-plan hook naming `phase task`.
- [x] From a scratch repo with two clones (two "machines"), with this branch's tools: the PR's own scenario
  runs end to end and its output is pasted here (PR A: three writers race; PR B: a spec joins, two trees tick
  tasks of the same phase and of different phases, each sees the other's on its next command, and
  `record export` gives the lists back; PR C, D, E: a spec joined on the previous release is upgraded on its
  next touch and the previous release refuses to write)
  PR A, 2026-11-11, bare origin + three clones, `tests/fixtures/record-writer.ts` started at one instant:
  ```
  $ laptop: record sync (before any write)
  record: no record on origin yet · nothing queued
  $ three machines add an entry to one list at the same moment
  desktop: landed
  laptop: landed
  third: landed
  $ desktop: record sync
  record: synced a17cec6 · local copy refreshed · nothing queued
  $ desktop: record status
  record: tip a17cec6 · local copy from <1m ago · nothing queued
  $ desktop: the list in the local copy
  {"items":["desktop","laptop","third"]}
  $ origin: refs
  refs/heads/main
  refs/spec-board/record
  ```
  PR B, 2026-11-12, bare origin + clones `laptop` and `desktop`, `board.record: on`, `docs: main`, this
  branch's `spec.ts` (script: the session scratchpad's `pr-b-scenario.sh`; the context pack trimmed to its table):
  ```
  $ laptop: spec.ts join demo
  join: demo is on the board (2 phases, 3 tasks, 0 worktrees read) · banner landed on main (fae4224)
  $ laptop: spec.ts phase tick demo 1 1.1
  tick: phase 1 · 1.1 done (b86f6e7 on origin/feat/demo-pr-a)
  $ desktop: spec.ts phase tick demo 1 1.2
  tick: phase 1 · 1.2 done (424853e on origin/feat/demo-pr-b)
  Phase 1 complete — run update.md → Close the phase
  $ desktop: spec.ts phase tick demo 2 2.1
  tick: phase 2 · 2.1 done (424853e on origin/feat/demo-pr-b)
  Phase 2 complete — run update.md → Close the phase
  --- laptop's next command sees desktop's ticks
  $ laptop: spec.ts ready demo
  Ready now: none

  PR A: phases 1 ✓
  PR B: phases 2 ✓
  $ laptop: spec.ts phase task demo 2 --add write log
  task: phase 2 · added 2.2 (plan v2)
  --- desktop sees the task laptop added
  $ desktop: spec.ts context status demo
  Board: live · plan v2
  | Phase | Status | Delivers | Work |
  | 1 — Read | ✅ done | reads work | 1.1 parse input — b86f6e73772974f1dd678fe42be38cf847220512 on origin/feat/demo-pr-a; 1.2 read cache… |
  | 2 — Write | 🟡 WIP (1/2) | writes work | 2.1 write file — 424853edbd301a0aa7309c38de02c76d3afcf8cb on origin/feat/demo-pr-b; 2.2 write log |
  --- the way back
  $ laptop: spec.ts record export demo --unjoin
  export: demo written to files (2 phases, 4 tasks); off the board. Commit and publish these files: every tree reads them from now on
  $ laptop: progress.md and phase 1 after export
  # Demo — Progress

  ## Phases

  - [x] Phase 1 — Read → `phases/phase-1-read.md`
  - [ ] Phase 2 — Write → `phases/phase-2-write.md`
  ---
  needs: []
  pr: A
  ---
  # Phase 1 — Read

  **Outcome:** reads work.

  ## Deliverables

  - [x] parse input — b86f6e73772974f1dd678fe42be38cf847220512 on origin/feat/demo-pr-a
  - [x] read cache — 424853edbd301a0aa7309c38de02c76d3afcf8cb on origin/feat/demo-pr-b
  $ laptop: spec.ts ready demo
  Ready now: 2 Write (in progress)

  PR A: phases 1 ✓
  PR B: phases 2
  ```
  PR C, 2026-11-13, bare origin + clones `laptop` (released 2.53.0) and `desktop` (this branch), script
  `pr-c-scenario.sh` in the session scratchpad. The upgrade works; **2.53.0 does not refuse**: it reads the
  layout-2 record as no record and writes its files (`ledger/gotcha-2-53-writes-files-on-a-newer-record.md`).
  Fixed forward (2.54 refuses a newer layout, `tests/record-newer-layout.test.ts`); for 2.53 → 2.54 every
  install must update before the first 2.54 write in CRM.
  ```
  $ laptop: spec.ts (2.53.0) join demo
  join: demo is on the board (2 phases, 2 tasks, 0 worktrees read) · banner landed on main (e95b144)
  --- record after the 2.53.0 join
  meta.json: { "layout": 1 }
  $ desktop: spec.ts (this branch) phase set demo 2 --title Writes
  set: phase 2 · title "Writes" (plan v2)
  --- record after this branch's first write
  meta.json: { "layout": 2 }
  spec.json: {…,"layout":2,"status":"active","owner":"Taras","ship":"auto"}
  prs/A.json: {"group":"A","branch":"feat/demo-pr-a","state":"merged","number":5,"mergedAt":"2026-11-10","mergedSha":"abc1234","method":"squash"}
  prs/B.json: {"group":"B","branch":"feat/demo-pr-b","state":"not-opened"}
  record: set demo (plan v2)
  record: upgrade demo to layout 2
  record: join demo
  $ laptop: spec.ts (2.53.0) phase set demo 2 --title Again
  set: phase 2 · title "Again"            ← a file write: 2.53.0 should have refused
  $ desktop: spec.ts (this branch) owner demo Anton
  owner: demo is Anton (351768e)          ← on the record; main still has 2 commits
  ```
  PR D, 2026-11-13, bare origin + clones `laptop` (2.54.0 from origin/main) and `desktop` (this branch),
  script `pr-d-scenario.sh` in the session scratchpad. A spec joined and parked on 2.54 is upgraded to layout 3
  by the next write: phase 1's in-flight note becomes its hand-off note, the park on the record becomes q1 (a
  gate question, since phase 2's next task is its `Gate:`), the answer is the gate tick's evidence, and 2.54
  then refuses to write.
  ```
  $ laptop: spec.ts (2.54) join demo
  join: demo is on the board (2 phases, 3 tasks, 0 worktrees read) · banner landed on main (cfe44e5)
  $ laptop: spec.ts (2.54) phase park demo 2 "Is the design agreed?" --recommend yes
  parked Phase 2 on the board: "Is the design agreed?" · recommend: yes
  --- record on 2.54: meta {"layout":2}
  $ desktop: spec.ts phase set demo 1 --title Reads
  set: phase 1 · title "Reads" (plan v2)
  --- record after this branch's first write
  meta.json: {"layout":3}
  phases/1.json handoff: {'at': '2026-11-13T01:13:18-08:00', 'by': 'unknown', 'note': '# In-flight — phase 1\n\nPick up at the parser.\n'}
  phases/2.json parks: None
  record: set demo (plan v2)
  record: upgrade demo to layout 3
  record: park demo 2
  record: join demo
  $ desktop: spec.ts question list
  q1 · demo · phase 2 · task 2.1 (approval) — "Is the design agreed?" · recommend: yes · asked 2026-11-13T01:13:17-08:00 by unknown
  question: 1 open across 1 spec
  $ desktop: spec.ts question answer demo q1 "agreed, go"
  question: q1 answered on phase 2: "agreed, go" (Anton)
  $ desktop: spec.ts phase tick demo 2 2.1
  tick: phase 2 · 2.1 done ("agreed, go" — Anton, 2026-11-13T01:13:19-08:00)
  $ desktop: spec.ts context execute demo 1   (In-flight block)
  #### in-flight/phase-1.md
  # In-flight — phase 1
  $ laptop: spec.ts (2.54) phase set demo 2 --title Again
  phase set: record: this plugin is older than the board's layout; update it
  ```
  PR E, 2026-11-13, bare origin + clones `laptop` (released 2.55.0) and `desktop` (this branch), script
  `pr-e-scenario.sh` in the session scratchpad. A spec joined on 2.55 reads its `CLAUDE.md` priority until the
  next write upgrades it to layout 4, which makes its card with that priority and due date; from then on the
  card sets them; an idea is a card in the list; 2.55 then refuses to write.
  ```
  $ laptop: spec.ts (2.55) join demo
  join: demo is on the board (2 phases, 2 tasks, 0 worktrees read) · banner landed on main (a3b0169)
  --- record on 2.55: meta { "layout": 3}
  $ desktop: spec.ts list table demo  (before the upgrade: CLAUDE.md priority)
  | demo | active | p1 | 2026-12-01 | tools | demo | 2026-11-01 | 0/2 |
  $ desktop: spec.ts phase set demo 2 --title Writes
  set: phase 2 · title "Writes" (plan v2)
  --- record after this branch's first write
  meta.json: { "layout": 4}
  cards/0/c1.json: { "id": "c1", "title": "Demo Spec", "status": "open", "commitment": "asked", "priority": "p1", "due": "2026-12-01", "tags": [], "coveredBy": [ "demo" ], "createdAt": "2026-11-13T03:03:25-08:00"}
  sources/c1/a.json: { "card": "c1", "role": "origin", "app": "spec", "occurredAt": "2026-11-01T09:00:00-08:00", "quote": "Demo Spec", "ref": "spec:demo"}
  record: set demo (plan v2)
  record: upgrade demo to layout 4
  record: join demo
  $ desktop: spec.ts card update c1 --priority p0
  card: c1 updated (priority p0)
  $ desktop: spec.ts list table demo  (priority from the card)
  | demo | active | p0 | 2026-12-01 | tools | demo | 2026-11-01 | 0/2 |
  $ desktop: spec.ts card add "Export to CSV" --quote "can we get this as a spreadsheet" --app claude-code --commitment idea --priority p2
  card: c2 added (idea · p2)
  $ desktop: spec.ts list table   (Backlog section)
  | c2 | p2 | — | — | Export to CSV |
  $ laptop: spec.ts (2.55) phase set demo 2 --title Again
  phase set: record: this plugin is older than the board's layout; update it
  ```
  PR F, 2026-11-13, bare origin + clones `laptop` and `desktop` (one machine, so no "other host" here; the
  cross-machine join is covered by `board-session-docs.test.ts`), this branch's `spec.ts`, and the previous
  release (origin/main, 2.56.0) for the compatibility step; script `pr-f-scenario.sh` in the session
  scratchpad. No layout change: 2.56.0 keeps writing with sessions on the record.
  ```
  $ laptop: spec.ts join demo
  join: demo is on the board (2 phases, 2 tasks, 0 worktrees read) · banner landed on main (d08ee2f)
  $ laptop: a review session registers
  session: review demo registered (rev in laptop)
  $ desktop: an execute session ticks 1.1, with an uncommitted file in its tree
  tick: phase 1 · 1.1 done (b9d13fb on origin/feat/demo-pr-b) · 1 edited file is not in this commit
  $ desktop: the execute pack lists the review
  Board: live · plan v1
  Session: review by Anton on Antons-Laptop.local (tree laptop), last wrote <1m ago — a review can change this spec's plan
  $ laptop: the review session sees the execute session
  Board: live · plan v1
  Session: execute by Anton on Antons-Laptop.local (tree desktop), last wrote <1m ago
  --- the documents on the record (host and time left out)
  {'ref': {'source': {'runtime': 'claude', 'key': 'claude-code'}, 'id': 'exe'}, 'who': 'Anton', 'tree': 'desktop', 'mode': 'execute', 'spec': 'demo', 'branch': 'feat/demo-pr-b', 'planVersion': 1, 'ahead': 0, 'edited': 1}
  {'ref': {'source': {'runtime': 'claude', 'key': 'claude-code'}, 'id': 'rev'}, 'who': 'Anton', 'tree': 'laptop', 'mode': 'review', 'spec': 'demo', 'branch': 'feat/demo-pr-a', 'title': 'review demo', 'planVersion': 1, 'ahead': 0, 'edited': 0}
  $ desktop: the previous release (origin/main) still writes after sessions exist
  set: phase 2 · title "Writes" (plan v2)
  $ laptop: the review ends at handoff
  session: rev ended; its document is removed
  documents left: 1
  ```
  PR G, 2026-11-13: no record here (this repo has the board off), so the page ran two ways. The real server from
  this branch on this repo (`page --serve`): an honest empty page, `running.json` written and removed on SIGTERM,
  about 54 MB resident and 0.0% CPU idle. The page on factory data over an in-memory record
  (`tests/page-preview.ts`), driven in headless Chrome: answering "No reset" landed on the record, the count went
  1 → 0 and the question left; screenshots at 1440 px, phone width and 125% dark, and a dead feed, in
  `research/phase-10/`.
  ```
  $ spec.ts page --serve --port 41950   (this repo, board off)
  page: serving http://127.0.0.1:41950
  $ curl /health
  {"ok":true,"pid":82131,"version":"2.57.0"}
  $ ps -o rss,%cpu -p 82131 (after 18 s)
  54224   0.0
  $ preview: click "No reset" on q12
  toast: question: q12 answered on phase 3: "No reset" (Anton) · title "Live board · crm" · count 0 · question rows 0
  ```
  PR J, 2026-11-13: this branch's page over CRM's real board with Academy's 99 cards
  (`tests/page-preview.ts 41990 --repo ~/IdeaProjects/crm`, read-only beside CRM's own server), headless Chrome
  at 1440×900 and 390×844; table and screenshots in `research/phase-10aa/2026-11-13-10aa-browser-check.md`.
  ```
  done-but-open rows on Now   22 → 0
  count vs rows               108 vs 3 + 126 more → 94 = 3 + 91 more; others fold apart (13)
  Taras chips                 "Taras Korpach 8" "taras 5" "Taras 8" → "Taras 13", inside the box
  whole-spec covers           30–49 squares a row → one bar (21/30); Plan panels: 33 bars, 9 squares
  c30 (done)                  no state, no note → "Done Nov 3 by academy-board import: …", note, no deadline
  Plan                        4 empty tags, 20-line summaries → none; tallest summary 3 lines
  390 px                      no element past the viewport
  ```
  PR H, 2026-11-13: this branch's `record export` on a scratch clone of CRM against its real record
  (`explicit-charge-handling`, 22 phases), once as checked out and once with `progress.md` cut to the tidied stub:
  ```
  $ record export explicit-charge-handling   (untidied)
  export: explicit-charge-handling written to files (22 phases, 83 tasks); still on the board
  progress.md diff: phases 4, 5, 6 ticked; v1: / v2: and Success metrics unmoved
  $ record export explicit-charge-handling   (tidied stub in the tree)
  export: explicit-charge-handling written to files (22 phases, 83 tasks); still on the board
  progress.md: same as before the tidy, boxes aside
  ```
- [x] The claims suites pass unchanged after `core/remote-push.ts` is lifted out (PR A: no diff in `tests/claims-*.ts`, 93 pass)
