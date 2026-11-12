---
kind: decision
applies-to: [phase 2a+]
created: 2026-11-11T23:47:13-08:00
---

# Readers take a snapshot from git objects, and fetch only while the board is on

Phase 2a, where it differs from `technical.md` → *Local copy*:

- **`readRecord(port, { fetch, now })`** (`record/read.ts`) is the one read per command. It builds the view with
  `readRecordSnapshot` (`record/view.ts`): `ls-tree` plus one `cat-file --batch`, every document up front. Two
  spawns however many specs a board reads, and synchronous, so the hook, the doctor and `ready` stay sync. The
  folder copy (`record/mirror.ts`) stays for agents searching files and `record sync`; no reader opens it.
- **`fetch` is the caller's `settings.board.record`.** With the switch off a reader never touches the network:
  it reads the tracking ref if an earlier fetch left one (a spec joined while the switch was on), else nothing.
  A fetch per pack and board with the switch off would have broken "nothing changes until phase 5".
- **Age** of a local read is the mtime of `<common-dir>/spec-board/record-fetched`, touched on every
  successful fetch.
- **A newer `meta.json` layout** reads as `{ kind: "newer" }`: callers read files and say to update.
- **Count rule:** `countTasks` / `allTasksDone` / `entryTaskCount` (`core/phase-entry.ts`). Complete = at least
  one task and all done. A joined phase is also done when `deployed` is set; a zero-task phase otherwise stays open.
- **Board inputs carry the command's `PlanSource`** (`plans`) and `joinedActivity`, computed once in
  `loadBoardInputs`; `phaseActivity(states, workspaces, joined)` merges it. A joined phase counts as in progress
  only while the record has it open, and only from evidence `… on origin/<branch>`: join's bare sha names no tree.
- **`resolvePr` takes a `SpecSource`**; its callers pass `specStatesAt`, which opens the record only when a spec
  name is resolved, so `pr status <number>` and babysit's polling never read or fetch it.
- **The tree-ahead pack line names no command yet.** Phase 3 builds `join --from-tree`; append
  `Run join <spec> --from-tree.` to `treeAheadLine` (`context/board-lines.ts`) when it lands.
