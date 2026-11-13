# Live Board — Design

## Purpose

Anton and Taras run many Claude sessions at once on the same specs, each in its own worktree. Each worktree
holds its own copy of a spec's phase list and checkboxes, and a change reaches the others only when a session
publishes to main. On 2026-11-11 three copies of one `progress.md` disagreed: a publish was refused because main
had changed the next line, so a new session offered a finished phase as ready and never heard of two phases a
review had added (`research/2026-11-11-wave-1-entities-and-usage.md` → *The incident*).

The plugin gets one shared record. Every session writes each change to it the moment it happens and reads it
before acting. The same record holds cards (asks, promises, bugs, ideas) with their quoted sources and tags, so
the business reason for a spec sits next to its progress. Spec prose stays in files.

## Who it is for

- **Claude sessions first.** They keep the record current, read it for context (the need, the problem, the
  exact quotes), and use it to stay out of each other's way. Anton, 2026-11-11: "This board actually has to be
  Claude Code first because we just use it for ourselves, just to take a look at it."
- **Anton and Taras** look at it, answer the questions waiting on them, and make small edits.

## Key decisions

| Decision | What we chose | Rejected alternative | Why |
|----------|---------------|----------------------|-----|
| Where the record lives | One git ref in the project's own repo, outside branches, holding small JSON files | A separate GitHub repo (the Academy board); commits on main | No new repo, setting or credential; read and write in about a second; triggers no builds (measured on claim refs); gives a local copy to search. A separate repo read cold in 6–12 s and has no local copy. Main already takes 60 docs-only commits a day, each a production deploy of the landing site. Anton, 2026-11-11 |
| Transport | Plain git: fetch the ref, commit with a scratch index, push with a lease. One loop (`core/land-on-ref.ts`), lifted from `landOnMain` in phase 1 and shared with it | GitHub's Git Data API through `gh api`; a new loop for the record, folded with `landOnMain` later | Reuses `commit-onto` and the claim lease code, needs no `gh` login, works for any git host. The API needs three calls per write and an error body that parses as valid JSON. A new loop would be the fourth copy of push-with-retry (review, 2026-11-11) |
| Shape of the record | One ref holding a tree of documents; a batch is one commit | One ref per document, as claims are stored | A batch must be all or nothing across documents, and about 3,000 refs would be listed on every fetch (CRM already has 2,327). Phase 1's growth run records the number |
| What a write is | A plan function run again against each freshly fetched record: a tick reads the phase as it is now and sets one task done | A fixed list of operations pinned to the versions the caller read (the Academy store's rule) | Pinned operations refuse two harmless changes to one phase, make every plan change on a spec collide on its version counter, and make a session's second offline tick conflict with its first. `landOnMain` already works this way. Review, 2026-11-11 |
| When a write is refused | Only when its intent no longer holds (the task is already closed by someone else, the edge would make a cycle), or when a value someone looked at changed under them (page edits, `card update`, answering a question) | Refuse on any change to the same document | Different tasks, different phases and different fields never conflict; the same task or the same edited field does |
| Home of plan and progress | The record only, for a spec that has joined | Keep the lines in files and sync both ways | Two copies that drift is the bug. Anton, 2026-11-11 |
| How a spec joins | The next session that works on it joins it; specs nobody touches stay on files. Tasks are matched across copies by their text | Bulk migration of 400 specs; a manual opt-in per spec; matching tasks by position | The brief rules out a bulk move; a manual step gets forgotten; a tree that inserted a task would get the wrong one marked done |
| What decides how a spec is read | Whether it has joined, in every tree. The setting only decides whether specs may join, and is read from the default branch | The setting in each checkout | A worktree cut before the switch would read the frozen list and offer a finished phase again |
| Which projects | Projects that keep spec docs on main (`docs: main`), which CRM does | Also `docs: branch` projects, joining from the branch | Join reads the spec and lands its banner on the default branch; a spec that lives only on a branch has neither. Later work if a `docs: branch` project wants the board |
| What join does to the files | Writes the record and adds one banner line to `progress.md`; removes the old lines later, once no worktree here and no remote branch of the spec differs in them. `progress.md` stays as a one-line stub for good | Delete `progress.md` and the checkboxes in the join commit, or at tidy | Every open worktree has ticked boxes on its branch; deleting on main would hand each of them a merge conflict. The file is also how routing, cloud sessions and people tell a spec from a prep folder (review, 2026-11-11) |
| The way back | `record export <spec>` writes the lists back into files; `--unjoin` takes the spec off the record | Turn the setting off | After a tidy the files hold no plan, so turning the setting off would leave a spec with no phases. ROADMAP: every flow keeps its manual read path |
| Two homes in the code | One `PhaseWriter` port with a file writer and a record writer, picked once per command; the commands work on both, so a mode file says "run the command" once | A joined-or-not branch in every command and in every mode file; one planner family over a document model with files as an adapter | A branch in prose is one no test catches. Rewriting the file planners would disturb specs this work leaves alone (245 tests pin them). Whether the file path gets an end date is looked at after phase 5's week |
| How Claude reaches it | Commands in `spec.ts` | An MCP server | Sub-agents and background workers often lack MCP tools; an MCP server loads in sessions that never run `/spec`; the plugin ships zero dependencies. Anton, 2026-11-11 |
| When a session learns the plan changed | At load, on every write, and from the existing before-edit hook at most once every two minutes | A background poller; on writes only | A poller is a long-running process the plugin doesn't have; writes alone leave a coding session blind for an hour |
| Saving code to GitHub | Marking a task done pushes the branch first and stores the pushed commit as evidence. That push has a 10 s limit, never waits on a credential prompt and skips pre-push hooks | The instruction to push after every commit (today); a commit hook; running the project's pre-push suite on every tick | The instruction is skipped: 3 of 63 CRM worktrees held unpushed commits and 4 had no remote branch when measured. Anton, 2026-11-11: "so nothing is lost". A save must not run a test suite per task or hang; claims already push this way, and CI checks the PR. CRM has no pre-push hook today |
| Offline | Keep the intent ("tick 2.4") in a local outbox, show it as done in this session's reads, and plan it again when the next command reaches the remote | Refuse the write; keep it local for good, as claims do; queue pinned operations; a local commit on a private ref | A refused tick at the end of a session recreates the stale picture; Anton's connection drops often. Pinned operations conflict with each other on replay. Joining, adding a card and nothing else refuse offline |
| Rollout | A project setting, off by default; CRM turns it on after both people have updated. Each later release that moves more data onto the record raises the record's layout number: an older install then refuses to write, and a spec is upgraded the next time it is touched | On as soon as the version is installed; later releases with no version gate | A session on an older version would misread a joined spec, and after PR C it would write an owner or a hand-off note to a file nobody reads any more |
| Task identity | Every deliverable gets an id (`3.2`) at join or when added; ids are never reused | Match by text or position, as today | A tick must still find its task after a split or a reword |
| Every spec has a card | Prep makes a card when none covers the spec; priority, due date and customer live on cards | Specs keep their own priority and due date beside cards | One top-level list and one place to set priority. Anton, 2026-11-11 |
| Who closes a card | Claude, with evidence; the board proposes it when every covering phase is merged | Close automatically on merge | Merged is not always live for the customer, and the customer may not have been told. Anton, 2026-11-11 |
| Card ↔ spec link | Stored once, on the card, as `spec` or `spec#phases`; the spec side is computed | Write it on both sides | Both sides are free text today and neither is checked |
| One word | "card" everywhere; `/spec idea` stays as the way to capture one | Keep "idea" and "backlog item" as separate things | Two names for one concept is a review finding in this repo |
| Priority | One scale, `p0`–`p3`, on cards and tags | Keep scope P0–P3, card "urgent" and spec p1–p3 | Four markings are in use today and disagree |
| Questions | One record with the question, a recommendation and the answer | Leave parked notes, crew questions and gate items as three shapes | "Two open questions exist only in this chat" (session S63); answers are lost and asked again |
| Sessions | A session document on the record, named by the whole session key of the `SessionRef` type already in the code; it says who, where and in which mode, and what a session holds stays its claim; claims stay as they are; no dependency on `codex-runtime-support` | Wait for `codex-runtime-support` 2b to rewire claims first; invent a new identity | The type exists today, so nothing has to land first. Anton, 2026-11-11: "Not waiting on codex-runitime support at all!!!" A new identity would be the third model |
| The page | A small local page a tool starts, on Bun's own server, showing the board model the tools already compute | A published Artifact; no page; computing the board in page script as the Academy page does | Must update within seconds and reach Taras; an Artifact can't be reached by another person's Claude and doesn't refresh. Two copies of the board's rules would disagree |
| What a person can do on the page | Answer a waiting question; nothing else | Editing priority, due date, tags and assignee there (the first design) | Nobody edits cards by hand; each edit is a write path, a version check and a form on a page whose job is display. An answer is the one click that unblocks a session. Anton, 2026-11-13 |
| Codex sessions | A Codex pilot reads a joined spec from the record and is refused when it tries to tick, park or unpark one | A phase here that lets Codex write the board; specs with a Codex session don't join | Shared writes break the pilot's isolation rule, which `codex-runtime-support` owns and can lift in its own phase. Anton, 2026-11-11: "Refuse for now" |
| Validation | Hand-written readers that collect problems, calling the field readers the plugin already has; each reader lives with its domain and is handed to the store | A schema library; readers inside the store | The plugin ships zero dependencies. A store that imports every document type is edited by every later phase |
| Build order | Phases on the record first, then PRs and fields, questions, cards, sessions, the page | Cards first | The clashes are the daily cost; Academy's cards keep working on their current board meanwhile |

## How it works

```
 session in tree A          session in tree B          review session
        │ tick 2.3                  │ tick 3.1                │ add 6a, 10
        ▼                           ▼                         ▼
   ┌──────────────────────── one write ─────────────────────────┐
   │ 1 fetch the record    2 plan the change against what is    │
   │ there now (refuse if it no longer makes sense)             │
   │ 3 build one commit    4 push only if nobody pushed in      │
   │ between (else from 1, ×5)    5 refresh the local copy      │
   └─────────────────────────────┬──────────────────────────────┘
                                 ▼
              record ref in the project's repo (not a branch)
                                 │
          ┌──────────────────────┼─────────────────────┐
          ▼                      ▼                     ▼
   packs at load         every later write      before-edit check
   (ready, left,         (planned on the        (at most every 2 min:
   who is on what)       newest record,         "plan changed")
                         "plan changed")
```

**A session's life with the board**

1. **Load.** The pack is built from the record. If the spec has not joined and the project has the board on,
   the session joins it first.
2. **Start a phase.** The claim is taken as today, and the branch is pushed so it exists on the remote.
3. **Finish a task.** `phase tick` pushes the branch, then marks the task done with the pushed commit. A tick
   is not a plan change.
4. **Change the plan.** `phase add`, `split`, `move` and `set` write the new plan in one commit and raise the
   spec's plan version, computed on the newest record.
5. **Need a person.** The session leaves a question with a recommendation and takes other ready work.
6. **Hand off.** The hand-off note is written to the phase's record. Prose files publish to main as today.

## Phase state

A phase's state is computed, never typed:

```
todo ──first task done or a session holds it──▶ doing ──every task done──▶ built
built ──its PR merged──▶ merged ──deploy confirmed──▶ deployed
```

- `doing` needs a session holding the phase or at least one task done with a pushed commit. One ticked box with
  no branch no longer counts (session S44).
- A task phase (`code: false`) goes from `doing` straight to `done` when every task has its evidence.
- `built` with no open PR is a row under *Needs you*.

## What Claude sees

Wording follows the plugin's existing lines: `<command>: <result>`, lower-case, and a refusal says what was not
written and what to do.

| Moment | Line |
|---|---|
| Join | `join: schedule-clarity-fixes is on the board (10 phases, 41 tasks, 3 worktrees read)` |
| Join found disagreement | `join: phase 2 is done in tree pr-a and open on main; recorded as done (0651e4e)` |
| Tick | `tick: phase 2 · 2.3 done (0651e4e on origin/feat/schedule-clarity-fixes-pr-a)` |
| Tick, plan moved | `Plan changed since this session loaded it (v7 → v9): phase 6a added · phase 10 added · phase 4 moved to PR E` |
| Tick, same task | `tick: refused, nothing written. 2.3 was closed 4 min ago by the session in tree pr-a (0651e4e).` |
| Tick, already done by this session | `tick: 2.3 is already done (0651e4e)` |
| Tick, push failed | `tick: refused, nothing written. Couldn't push feat/…-pr-a: <reason>. Push it, then tick again.` |
| Offline | `tick: kept on this machine (origin unreachable); 2 changes not shared yet` |
| Split | `split: phase 3 keeps 3.1–3.3; 3a added with 3.4 and 3.5 (plan v10)` |
| Tick, code not committed | `tick: phase 2 · 2.3 done (0651e4e on origin/…-pr-a) · 2 edited files are not in this commit` |
| Tree ahead of the board | `Tree is ahead of the board: 3 ticks. Run join schedule-clarity-fixes --from-tree.` |
| Older plugin | `record: this plugin is older than the board's layout; update it` |
| Codex pilot | `phase tick: schedule-clarity-fixes is on the board; a Codex pilot can't write it yet` |
| Back to files | `export: schedule-clarity-fixes written to files (10 phases, 41 tasks); off the board` |
| Pack, first line | `Board: live · plan v9 · read 3 s ago` or `Board: local copy from 14 min ago (origin unreachable)` |
| Pack, not joined, board off | nothing changes from today |
| Question | `question: q12 open on phase 5 — "reset the Teachers pick each morning?" · recommend: no reset` |
| Card | `card: c96 added (asked · p1 · tags: Academy Ballroom, Schedule)` |
| Card ready to close | `Card c87 can close: phases 1–2 merged (#1215). Say what the customer was told.` |
| Work not on the remote | `Tree pr-b holds 3 commits and 5 edited files that are not on origin (last activity 18:02).` |

## The page

For looking. Anton, 2026-11-13: "no one is going to add or update those cards manually … Human board is just a
fast visual way for us to understand what is going on. It needs to be adhd-friendly and visual." The agreed
design, with the five-voice council behind it and the approved mock, is in
`research/phase-10/2026-11-13-page-council-and-design.md` and `2026-11-13-page-design-mock.html` beside it.

```
 Live board · crm   [ Now 2 ] [ Plan ]   51 of 99 done                  ● live · 3 s ago
 ───────────────────────────────────────────────────────────────────────────────────────
 NOW    ┌ 2 ───────┐  Q   Reset the Teachers pick each morning?  [No reset] [Reset daily]  42m
        │ need you │  PR  Open PR A · schedule fixes · phases 1–2 built                    2h
        └ Taras 1 ─┘  !   Private lessons held until paid · overdue Nov 12 · nobody has it
        Sessions   (A) schedule fixes 2 · now   (A) import 2 · 47m · 3 commits not pushed   (T) …
        Moving     P0  Featured row keeps events visible   ■■▣□   (A)  now

 PLAN   P0 ─────────────────────────────────────────────────────────────────────────────
        P0  Pass sync        Students can't use passes they paid for   ▰▰▰▱▱▱▱  (T)  overdue Nov 12
              ├ mindbody-pass-fixes (T) 14m   Pass edits reach the studio  ■■▣□
              ├ Open · nobody has these       Private lessons held until paid · overdue Nov 12
              └ Done 2 ▸
        P0  Schedule fixes   1 waits on your answer                    ▰▰▰▰▰▱▱  (A)  today
```

- **Now** answers "what needs me and is anything stuck": the count of things waiting on the viewer, up to three
  rows, the live sessions, the cards that are moving.
- **Plan** answers "what is coming and in what order": one row per project (a tag), P0 first, with the reason
  for its priority, a done / moving / to-do bar, who is on it and the nearest deadline. A row folds open to one
  panel per covering spec, an *Open* panel for cards nobody holds, and *Done* as a count. It comes from the
  Academy board's *By scope* view.
- **An opened card** (`/#c<id>`) holds the words: the origin quote, phase names and stages, the waiting question.
- **One colour, one meaning:** orange, blue, green for to do, moving, done; red for trouble (overdue, a silent
  session, a dead feed); yellow for "waits on you"; a hue per person; priority by weight.
- **A dead feed looks dead:** the board greys out under a banner when no update has arrived for 15 s.

The only thing a person can do on the page is answer a waiting question, with the version the page showed.
Priority, due date, tags and who has it are set by telling a session. `spec.ts page --json` prints the model
the page shows, so a person and a session talk about the same board.

## Edge cases

- **Two sessions change the same document.** Both land when they change different things in it (two tasks of
  one phase, a hand-off note and a tick): the second is planned again on the first's result. The second is
  refused only when it wants the same task, or edits a field whose value changed since it was shown.
- **A session works from a stale tree.** For a joined spec the tools read the record, never the tree's old
  checkboxes, so the tree's copy can't mislead.
- **A task moves while a session is on it.** Ids stay with the task. The tick lands on the task in its new
  phase and says so.
- **A phase is split while another session holds it.** Allowed. The phase keeps its id, so the claim stays
  valid; the holder is told at its next write or within two minutes of its next edit. On the same machine the
  splitting session also messages it.
- **The remote can't be reached at load.** The pack uses the local copy and says how old it is.
- **Writes queued offline.** Each is planned again when sent, so several queued ticks of one phase all land.
  One that no longer makes sense (the task was closed by someone else meanwhile) is refused, shown only to the
  session that made it, and stays in the outbox until dropped. This session's own reads show its queued
  changes as done.
- **The record ref does not exist yet, or git is busy.** Neither is "offline": the first write creates the
  ref, and a busy ref lock is retried after a short pause. Only an unreachable origin queues.
- **A PR is opened or merged outside the tools.** Its document is corrected at the next `pr status` or board
  load.
- **Trees disagree at join.** Done anywhere counts as done, with that tree's commit as evidence; a phase that
  exists only in one tree, with its prose file not on main, is listed for the next review and not added. Trees
  on the other person's machine can't be read: their next pack says `Tree is ahead of the board` and
  `join --from-tree` adds those ticks.
- **Someone hand-edits a removed field.** The spec-file check runs after the edit: it reports a checkbox, edge
  frontmatter or `progress.md` edit in a joined spec's files as a blocking problem and names the command to use.
- **Two cards take the same number.** The number is chosen while planning on the newest record, so the second
  writer simply gets the next one.
- **A session on an older plugin version.** Before PR B it can't see the record: the switch stays off until
  both people have updated. After a later release raised the layout, it refuses to write and says to update.
- **The board is turned off again.** No more specs join. Joined specs stay on the record until
  `record export <spec> --unjoin` writes each back to files.
- **A spec that never joins.** It keeps working from files exactly as today.
- **Codex local-pilot.** It reads a joined spec from the record. Shared writes are refused there today
  (`capabilities.md`), so the new commands are too, and so are `phase tick`, `park` and `unpark` on a joined
  spec: a Codex pilot can't execute a joined spec until `codex-runtime-support` adds board writes. Nothing in
  this spec waits on that.
- **Cloud and no-Bun sessions.** A joined spec's `progress.md` is a stub that names the manual read:
  `git fetch origin refs/spec-board/record`, then `git show FETCH_HEAD:specs/<spec>/phases/<id>.json`.
