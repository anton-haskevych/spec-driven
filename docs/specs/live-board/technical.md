# Live Board — Technical

Ground truth for every claim here is in `research/` (wave 1, wave 2, craft) and in
`reviews/2026-11-11-write-contract-and-switch-day.md`. Paths are relative to `skills/spec/tools/` unless they
start with `skills/` or `docs/`.

## The record

One ref in the project's own remote: `refs/spec-board/record`. It is not under `refs/heads/`, so it is not a
branch: it appears in no PR, no default clone and no build (claim refs under `refs/spec-claims/*` already behave
this way). Its tree holds one JSON file per document.

```
meta.json                                 { "layout": 1 }
specs/<spec>/spec.json
specs/<spec>/phases/<id>.json
specs/<spec>/prs/<group>.json             phase 6
specs/<spec>/questions/<id>.json          phase 7
cards/<n div 100>/c<n>.json              phase 8 (c1234 → cards/12/c1234.json)
sources/<card-id>/<letter>.json           phase 8
tags/<slug>.json                          phase 8
sessions/<session-slug>.json              phase 9
```

`RECORD_LAYOUT` lives in `record/layout.ts` and in `meta.json`. It starts at 1 and goes up by one with every
release that moves data onto the record (PR C, D, E: *Releases*). A tool that reads a higher layout than its own
reads nothing from the record and refuses every write with
`record: this plugin is older than the board's layout; update it`, so an older install can never write to a
home the newer one has stopped reading. Phase 1 measured growth (about 0.7 KiB per write once packed) and set
the shard rule for `cards/`: folders of 100 by card number, so a card write pushes a 3.5 KB folder, not the
whole card list (`research/phase-1/2026-11-11-growth-measurement.md`).

## Documents

Shapes are TypeScript types with hand-written readers that collect `problems: string[]`
(exemplar: `playbook/settings.ts:64-95`). No schema library. A reader lives with its domain (`plan/docs/`,
`questions/`, `cards/`, `sessions/`), never in `record/`. Readers call the field readers the plugin already
has on the parsed object: `readSpecMeta`, `readFocusFields`, `readShipField`, `readLifecycleFields`
(`core/spec-meta.ts:52-120`) and `readSchedule` (`core/schedule.ts:16`), so `focus: "Must"` reads the same from
a file and from the record. `oneOf`, `stringArray` and `count` move from `playbook/settings.ts:138-177` to a
shared `core/read-fields.ts`.

```ts
type SpecDoc = {
  name: string;
  planVersion: number;            // +1 on every change to the phase list, edges or PR groups, or a task
                                  // added, removed, moved or reworded. A tick never raises it.
  phases: string[];               // phase ids in order
  joinedAt: string; joinedFrom: string;          // ISO time, base commit
  layout: number;                 // the record layout this spec's documents were last upgraded to
  // phase 6
  status?: "prep" | "draft" | "active" | "paused" | "good-enough" | "done" | "abandoned";
  owner?: string; ship?: "auto" | "hold-for-review"; focus?: "must" | "should" | "could";
  stale?: string; dropped?: string;
  partOf?: string; needs?: string[]; supersedes?: string[]; related?: { spec: string; why: string }[];
};

type PhaseDoc = {
  id: string; title: string; outcome: string;    // outcome: one plain sentence, shown on every row
  file: string;                                  // the prose file, e.g. phases/phase-2-join.md
  needs: string[]; needsDeployed?: string[]; sameFilesAs?: string[];   // always explicit: see Joining
  pr?: string; due?: string; code: boolean; playbook?: string; gate?: "design" | "outward"; shape?: string;
  deployed?: string;                             // date
  tasks: Task[];
  parks?: { parkedAt: string; question: string; recommend?: string; answer?: { at: string; text: string } }[];
                                                 // 3a; phase 7 moves them to question documents
  handoff?: { at: string; by: string; note: string };   // phase 7
};
type Task = { id: string; text: string; done: boolean; evidence?: string; gate?: boolean;
  unpushed?: boolean };                          // true while a tick made offline waits for its push

type PrDoc = { group: string; branch: string; number?: number;
  state: "not-opened" | "draft" | "open" | "green" | "merged";
  mergedAt?: string; mergedSha?: string; method?: string };

type QuestionDoc = { id: string; about: string;            // "<spec>#<phase>", "<spec>#<phase>:<task>" or "card:<id>"
  kind: "question" | "gate"; askedAt: string; askedBy: string; question: string; recommend?: string;
  answer?: { text: string; by: string; at: string } };

type CardDoc = { id: string; title: string; status: "open" | "doing" | "done" | "dropped";
  commitment: "promised" | "asked" | "idea"; priority?: "p0" | "p1" | "p2" | "p3"; due?: string;
  assignee?: string; tags: string[]; tasks?: Task[]; coveredBy: string[];   // "<spec>" or "<spec>#<id|N-M>"
  note?: string; createdAt: string };

type SourceDoc = { card: string; role: "origin" | "mention" | "evidence"; app: string; person?: string;
  occurredAt: string; quote: string; ref: string; refUrl?: string };

type TagDoc = { name: string; kind: "customer" | "area" | "other"; priority?: "p0" | "p1" | "p2" | "p3";
  summary?: string };

type SessionDoc = { ref: SessionRef; who: string; host: string; tree: string; branch?: string; title?: string;
  mode: "prep" | "create" | "review" | "execute" | "babysit" | "overseer";
  spec?: string;                                 // the spec it works on: set by `session register`, else the one spec its writes touch
  planVersion?: number; lastWriteAt: string; ahead?: number; edited?: number };
                                                 // path: sessions/<base64url of sessionKey(ref)>.json; every Claude session
                                                 // shares one SourceRef (CLAUDE_CODE_SOURCE), the id makes the file unique
```

Rules carried from the Academy board's schema and skill (`research/…wave-1…` → *The Academy board as built*): a
quote is verbatim and never edited (add a new source instead); a card has exactly one `origin`, written in the
same batch that creates the card; `due` is a real date or absent; a card ref and a covering ref must resolve.
`p0` is added to `PRIORITIES` in `core/schedule.ts:3`, not declared as a second scale.

A phase's stage (`todo | doing | built | merged | deployed`, `design.md` → *Phase state*) is computed by
`phaseStage` from its tasks, its PR document and `deployed`; it is not stored. What a session holds is not
stored either: it is its claim (`refs/spec-claims/*`), joined to the session document by session id.

## Writing

```ts
type RecordOp =
  | { op: "create"; path: string; doc: unknown }                                   // conflict if the path exists
  | { op: "update"; path: string; patch: Record<string, unknown>; ifVersion?: string }
  | { op: "replace"; path: string; doc: unknown; ifVersion?: string }
  | { op: "delete"; path: string; ifVersion?: string };

type RecordPlan = (view: RecordView) => { ops: RecordOp[] } | { refused: string } | { unchanged: true };

type RecordWrite =
  | { kind: "landed"; tip: string; versions: Record<string, string> }
  | { kind: "unchanged" }
  | { kind: "refused"; reason: string }          // the plan said no against the current record
  | { kind: "conflict"; path: string; current: unknown; currentVersion: string }
  | { kind: "invalid"; problems: string[] }
  | { kind: "queued"; pending: number }          // remote unreachable; the intent is in the outbox
  | { kind: "failed"; reason: string };
```

**A write is a plan function, not a list of operations.** `writeRecord(port, plan)` runs
`plan(view)` against each freshly fetched tip, the way `landOnMain` runs its plan
(`core/land-on-main.ts:23-38`). So a tick reads the phase document *at that tip*, sets one task done and
returns the op; a plan change computes `planVersion + 1`, the next task id or the next card number from that
tip and re-checks edges and cycles there. Two sessions ticking different tasks of one phase, or adding and
splitting different phases of one spec, both land: the second simply plans again. A plan *refuses* when its
intent no longer holds (`2.3 was closed 4 min ago by …`).

`ifVersion` is optional and used only where a value someone looked at is being changed: `card update`,
`tag set`, answering a question (from the tools or from the page, which has no other edit). A stale `ifVersion` returns `conflict` with the current
document.

- A document's version is its git blob id at the tip.
- `planWrites(view, ops, validate)` is pure: it checks `ifVersion`s, applies patches, validates each resulting
  document with the `validate(path, doc) → problems` it is given, and returns the new files, the first
  `conflict` or every `invalid` problem. At most 50 ops (a caller may raise it for a write that must land whole: `card load`, 2000), no path twice. The store never imports a reader.
- The loop is `core/land-on-ref.ts`: fetch the tip → run the plan → commit onto the tip with a scratch index
  (`publish/commit-onto.ts`, which gains an optional base so the first commit has no parent) → push with
  `--force-with-lease=<ref>:<tip>` → on a rejected lease start again, up to 5 times, then `failed`. Built in
  phase 1; `writeRecord` is its first caller and `landOnMain` its second, from phase 6.
- Lease push, the 10 s timeout, `GIT_TERMINAL_PROMPT=0` and `--no-verify` come from `claims/remote.ts:15-19,
  56-59`, moved to `core/remote-push.ts` and imported by both. No behaviour of claims changes.
- The port tells three failures apart, as `branchOnOrigin` does with `ls-remote --exit-code`
  (`claims/remote.ts:46-50`): the ref is **absent** (first write: lease on empty), origin is **unreachable**
  (queue), a ref lock is **busy** (short pause, try again). Only unreachable queues.
- One command is one `writeRecord` call, so a split or a join is all or nothing.

**Local copy.** The record is fetched into the tracking ref `refs/spec-board-remote/record` (the claims
pattern, `claims/remote.ts:16,39`). Its tree is extracted to `<git-common-dir>/spec-board/record/<tip>.<layout>/`
and moved into place by rename, exactly as `mainline/base-cache.ts:14-32,71-79` does for the base; the last two
are kept. A reader opens one folder and never sees a mix of two tips, and a copy never goes backwards. Versions
come from `git ls-tree -r -z <tip>`; the files are what agents search. When the fetch fails, reads use the
tracking ref as it is and report its age.

**A `RecordView` is one tip, read once per command.** Fetch points are named: a pack load, `board`, `ready`,
`list`, every write, `record sync`, and the before-edit hook at most every 120 s. Hooks other than that one,
and the doctor, read the local copy only. A command resolves the view once and passes it down; nothing fetches
per spec.

**Outbox.** `<git-common-dir>/spec-board/outbox/<n>.json` holds **intents** a command could not send:
`{ session, command: "tick", args: { spec, task, sha, branch } }`, never pinned ops. Entries are created with
`createExclusive` and removed with `removeIfUnchanged` (`claims/atomic-file.ts:8-36`), and flushed under the
claims store's local lock, oldest first, by any later write and by `record sync`. Flushing runs each intent's
plan against the fresh tip, so queued ticks of one phase never conflict with each other. Reads lay this
session's queued intents over the view, so a queued tick shows as done here. One that is refused stays, is
reported only to the session that made it, and leaves with `record drop <n>`. The command layer registers one
runner per intent kind; the store stores and replays opaque entries.

## Reading a joined spec

A spec is joined when `specs/<name>/spec.json` exists in the record. **Joined decides how a spec is read, in
every tree; the setting only decides whether specs may join.** A worktree cut before the switch reads a joined
spec from the record like any other.

- `core/spec-state.ts` keeps `specStateFrom(spec, read)` for files and its loader becomes
  `loadSpecStateFromFiles`. The file planners in `phases/*.ts` and `phases/validate.ts` keep using it: they
  are file planners.
- `plan/state-source.ts` exports `stateSourceFor(projectDir, view)`, resolved once per command, which returns
  `(spec) => SpecState`: joined → built from `SpecDoc` + `PhaseDoc`s; otherwise `loadSpecStateFromFiles`.
  `core/` never imports `record/` or `plan/`.
- For a joined spec: `hasProgress` is true; each phase's `summary` (done counts, next run, wip) is built from
  its task documents by the one count rule, not parsed from text; `entry` is the prose file with its
  Deliverables section removed and the live tasks rendered in its place with their ids; edges are always
  declared.
- `graph/nodes.ts` `loadNodes` takes a joined spec's phase done and deployed marks from the same view, so
  `isFinished`, cross-spec `needs`, the list's progress column and overlap all follow the record from phase 2a.
  From phase 6 it takes spec fields and PR numbers there too.
- `PhaseActivity` (`board/activity.ts`) for a joined spec comes from task evidence: a task done
  `on origin/<branch>` counts as work in the worktree on that branch. Claim take's "in progress in another
  tree" refusal (`claims/rules.ts:55`), `trees place` (`trees/find.ts:98-103`) and the in-flight lane keep
  working, and nothing under `claims/` changes.
- The worktree overlay (`workspaces/views.ts`) is skipped for joined specs: there is one copy. The doctor skips
  its frozen-file checks (`progressIssues`) for them.
- Callers that move to the source: `commands/context.ts:78`, `commands/ready.ts:11`, `mainline/load.ts:70`,
  `workspaces/views.ts:15`, `doctor/run.ts:34`, `trees/place-system.ts:72`, `pr/actions/open.ts:35`,
  `pr/resolve.ts:46`, `commands/phase.ts:149`, `phases/review-refs.ts:37`, `hooks/spec-file-check.ts:65`,
  `runtime/codex/entry.ts:94`, `context/packs.ts:74`. `claims/rules.ts` is not a caller: it receives states.

**Without Bun, in a cloud session, or by hand:** `git fetch origin refs/spec-board/record` then
`git show FETCH_HEAD:specs/<spec>/phases/<id>.json`. `SKILL.md` documents this as the manual read path, and a
joined spec's `progress.md` is a one-line stub that says so.

## Joining

`spec.ts join <spec>`:

1. Refuses unless `board.record` is `on` at the default branch and the project runs `docs: main`
   (`join: the board needs docs: main in this version`); refuses offline (a join is never queued); says
   `already on the board` when joined, and on that path lands the banner if it is missing.
2. Reads the spec at `origin/<default>` and in every worktree of this clone (the board's existing inputs).
3. `planJoin` (pure) builds the documents. Task ids are `<phase>.<n>` in the base copy's order. Tasks are
   matched across copies **by their text, never by position**; a task done in any copy is done, with its ` — `
   evidence or that tree's head commit; a task that matches nothing, or matches twice, is listed as a
   disagreement and left open. A phase that exists in one tree only, with its prose file not on the default
   branch, is listed and not added. Edges are written out: a spec with no edge frontmatter gets each phase
   needing the one before it, and in a spec that declares some, an undeclared phase gets every earlier phase,
   which is what the ready set computes today (`ready/ready-set.ts:33-41`).
4. Writes one batch, with `spec.json` as a `create` (two machines joining at once: one wins, the other says
   `already on the board`), then lands a banner at the top of `progress.md` on the default branch:
   `> On the board since <date>. This list is frozen; the board is the source.`
5. `join <spec> --from-tree` adds what this tree has and the record lacks: ticks made on a branch before the
   join, typically on the other machine. Every pack for a joined spec checks its own tree's boxes against the
   record and says `Tree is ahead of the board: 3 ticks. Run join <spec> --from-tree.`
6. `join <spec> --tidy` (run by handoff) replaces `progress.md` with a stub (the banner and the manual read
   line) and removes the task checkboxes and edge frontmatter from the phase files. It runs only when neither a
   worktree of this clone nor a remote branch of the spec (`feat/<spec>*`) differs from the default branch in
   those files. It never deletes `progress.md`: the file is how routing, cloud sessions and people tell a spec
   from a prep folder.

`spec.ts record export <spec>` writes `progress.md`, the checkboxes and the edge frontmatter back into the
current tree from the record, and with `--unjoin` then removes the spec's documents. That is the way back for
one spec, and for all of them if the board is turned off.

A spec created after the switch gets the stub `progress.md` from birth:
`spec.ts plan apply <spec> --file <draft.json>` writes its documents in one batch, and its phase files carry
goal, guidance and notes only.

## Knowing the plan changed

- A file per session in `tmpdir()` (as `hooks/lesson-recall.ts:38-45` keeps its memory) remembers the plan
  version the session last saw per spec, and when a fetch was last tried.
- Every write result and every pack compares it with the record and prints one line naming the changes
  (phases added, split, moved between PRs; tasks moved), then updates the memory.
- A second PreToolUse command beside `hooks/lesson-recall.ts` fetches the record at most once every 120 s,
  counted from the last **attempt**, with a 3 s limit on the fetch; after a failed fetch it waits 10 minutes.
  When the version moved it returns that line as `additionalContext`, once per version. It never blocks and
  fails open (`|| true`, as `skills/spec/SKILL.md:6-18`).

## Saving code with every task

For a code phase on a joined spec, `phase tick` pushes the branch, then records the pushed commit (full sha;
shown as `<sha7> on origin/<branch>`) as the task's evidence.

- The push is `pushBranch` (`publish/push.ts:18-38`), which gains network options and a typed result:
  `pushed | offline | rejected | refused`. The tick passes the 10 s timeout, no credential prompt and
  `--no-verify`: a save must not run a project's pre-push suite on every task or wait on a prompt
  (`design.md` → *Key decisions*). `spec.ts push` at handoff is unchanged.
- `rejected` or `refused` refuses the tick. Only `offline` queues it, with the local commit and
  `unpushed: true`; the flush pushes exactly that commit to the branch and refuses if the branch no longer
  contains it.
- Edited code files that are not in the commit are named in the result line
  (`… · 2 edited files are not in this commit`); the tick still lands.
- Taking a claim pushes the branch so it exists on the remote from the start.

## Commands

All are tool commands Claude runs; none is a `/spec` sub-command. Each prints one result line last. **Commands
that change a plan work on both homes**: the tool picks the record or the files, so a mode file says
"run `phase tick`" once.

| Command | Does | Phase |
|---|---|---|
| `record status \| sync \| drop <n>` | Tip, age of the local copy, pending intents; flush or drop the outbox | 1 |
| `join <spec> [--from-tree \| --tidy]` | Puts a spec on the record; adds a tree's earlier ticks; later removes the frozen lines | 2, 3, 4 |
| `phase tick <spec> <phase> <task-id>` | Push, then mark done with the pushed commit | 3 |
| `phase add \| split \| deployed \| park \| unpark` | As today; the record for a joined spec | 3a |
| `phase add … --task "<text>"` | A new phase's deliverables; on the record, tasks `<phase>.<n>` | 3a |
| `phase move <spec> <task-id…> --to <phase> [--from <phase>]` | Moves tasks; ids stay. In files, `--from` is required and items are selected as tick does | 3a |
| `phase set <spec> <phase> [--needs …] [--pr …] [--gate …] [--title …] [--outcome …]` | Edits a phase's plan fields, in the record or the phase file's frontmatter | 3a |
| `plan apply <spec> --file <draft.json>` | Writes a new spec's plan in one batch (board on only) | 4 |
| `record export <spec> [--unjoin]` | Writes the lists back into files; the way back | 4 |
| `spec-status <spec> <value>` | Sets the spec's `status`, in the record or `CLAUDE.md` | 6 |
| `owner`, `focus`, `ship`, `pr open`, `pr merge` | As today; write the record for a joined spec, no commit on main | 6 |
| `question ask \| answer \| list` | One list of decisions waiting on a person | 7 |
| `card add \| update \| source \| cover \| close \| drop \| list \| tag` | Cards, their quotes, what covers them, tags | 8 |
| `card load --file <docs.json> [--move-taken]` | A prepared board onto the record under its own numbers | 10a |
| `page` | Starts the local page and opens it | 10 |

Result wording is in `design.md` → *What Claude sees*. Under Codex local-pilot the new commands are refused
like every shared write (`runtime/workflow-capabilities.ts:18-35`), and `phase tick | park | unpark`, which
the pilot may run today (`:12,34`), refuse on a joined spec:
`phase tick: <spec> is on the board; a Codex pilot can't write it yet`. The pilot reads a joined spec from the
record (`ledger/decision-codex-reads-the-board-refuses-writes.md`).

## Settings

`docs/specs/_playbook/settings.md`, read by `playbook/settings.ts`:

```yaml
board:
  record: on                 # default off; needs docs: main
  people: [Anton, Taras]     # display names a card can be assigned to; phase 8
```

For the board, the setting is read from the default branch (the base cache), not from the checkout, so every
tree agrees. `describeSettings` prints `Board: record on · people Anton, Taras`. An assignee is matched to the
list with `samePerson` (`core/people.ts:17`), so `taras` resolves to `Taras`. The doctor warns when `record` is
on and the installed plugin can't read the record's layout, and when `record` is on without `docs: main`.

## File tree

```
skills/spec/tools/
├── core/
│   ├── land-on-ref.ts         the one fetch → plan → commit → lease-push → retry loop          (phase 1)
│   ├── remote-push.ts         lease push + network options, moved from claims/remote.ts        (phase 1)
│   └── read-fields.ts         oneOf, stringArray, count: shared by settings and readers        (phase 2)
├── record/                    the store: no spec knowledge, imports no reader
│   ├── layout.ts              RECORD_REF, RECORD_LAYOUT
│   ├── ref.ts                 RecordPort + gitRecordPort(git): fetch (absent | offline | busy), lease push
│   ├── view.ts                RecordView: documents at one tip, blob ids as versions, read on demand
│   ├── plan-writes.ts         pure: ops + view + validate → files | conflict | invalid
│   ├── write.ts               writeRecord(port, plan): land-on-ref + planWrites + queue when offline
│   ├── mirror.ts              the local copy: one folder per tip
│   └── outbox.ts              queued intents: exclusive create, locked flush
├── plan/                      a spec's plan and progress on the record
│   ├── docs/                  spec-doc.ts, phase-doc.ts, pr-doc.ts: types + readers
│   ├── kinds.ts               path → reader registry handed to the store; intent runners
│   ├── join.ts                planJoin, from-tree, tidy
│   ├── export.ts              record → progress.md, checkboxes, frontmatter
│   ├── state-source.ts        stateSourceFor: record or files → SpecState
│   ├── phase-writer.ts        PhaseWriter port: fileWriter | recordWriter, chosen once
│   ├── ops/                   tick.ts, add.ts, split.ts, move.ts, set.ts, park.ts, deployed.ts: pure record plans
│   ├── phase-stage.ts         todo | doing | built | merged | deployed            (phase 6)
│   ├── plan-version.ts        per-session memory, change summary
│   └── apply.ts               a new spec's plan from a draft
├── questions/                 question-doc, ask, answer, list                     (phase 7)
├── cards/                     card-doc, source-doc, tag-doc, cover, close; takes over backlog/  (phase 8)
├── sessions/session-doc.ts    type + reader, the stamp op                         (phase 9)
├── context/board-lines.ts     every pack line that comes from the record          (phase 2a)
├── board/record-rows.ts       attention rows that come from the record            (phase 6)
├── page/                      model.ts (pure), render.ts + styles.ts (server-built HTML), refresh.ts,
│                              answer.ts (the one write), server.ts, process.ts    (phase 10)
├── hooks/plan-changed.ts      the before-edit check                               (phase 3b)
└── commands/                  record.ts, join.ts, plan.ts, spec-status.ts, question.ts, page.ts,
                               phase.ts + phase/<action>.ts, card.ts + card/<action>.ts
```

Files stay under 250 lines and functions under 50 (`structural-principles`). `commands/phase.ts` (171 lines,
six actions today) becomes a dispatcher over `commands/phase/`, as `commands/crew.ts` is over `commands/crew/`.
Function names follow the existing prefixes: `plan*` pure, `write*` to the record, `land*` to a ref, `read*`
with problems.

## Existing code this touches

- **Read seam:** the callers under *Reading a joined spec*; `graph/nodes.ts:30-72`; `board/activity.ts`;
  `core/phase-entry.ts:18-31`; `doctor/run.ts:67-81`.
- **Write seam:** `commands/phase.ts:47-146` goes through the `PhaseWriter` port; `phases/{tick,add,split,park,
  deployed}.ts` stay as the file writer's planners; `core/land-spec-field.ts`, `focus/land.ts`,
  `phases/deployed-land.ts`, `pr/actions/merge.ts:68-89` stop landing on main for joined specs.
- **Task identity:** `phases/locate.ts:19-61`, `core/checkbox.ts`, `core/gate.ts`, `phases/move-items.ts`, and
  the three count rules (`core/phase-entry.ts:21-23`, `phases/tick.ts:41`, `doctor/phases.ts:19`) folded into
  one that takes tasks.
- **Publish:** `publish/push.ts` gains network options and a typed result; `publish/publish.ts` keeps
  publishing prose; a joined spec has no state lines left for it to conflict on.
- **Mode files:** the hand-edit instructions listed in wave 2 (*The write seam*) in `create.md`, `review.md`,
  `update.md`, `execute.md`, `idea.md`, `prep.md`, `list.md`, `status.md`, plus `skills/spec/SKILL.md`
  (routing and *Preconditions*: a spec is past prep when it has `progress.md`, which a joined spec always has).
- **Shared with `codex-runtime-support`** (active; its phases 2b, 3b and 4 edit these too): `commands/context.ts`,
  `commands/claim.ts`, `board/load.ts`, `board/attribution.ts`, `trees/place-system.ts`, the two hooks,
  `crew/run-state.ts`, `commands/crew/tick.ts`, `runtime/codex/entry.ts`. Whichever lands second merges main
  first; neither waits.
- **Left alone:** how claims are stored and identified, `claims/store.ts`'s local lock, the phase-id
  derivation, the craft snapshot's *Don't extract* list. No phase waits on another spec.

## Tests

- Pure planners (`planWrites`, `planJoin`, the `plan/ops/*` plans, `phaseStage`, readers) carry the logic and
  are tested in memory.
- `tests/fake-record.ts`: an in-memory `RecordPort` with lease rules and `offline`, `absent` and `busy`
  switches, modelled on `fakeOrigin()` in `tests/claims-remote-take.test.ts:13`.
- `tests/record-factories.ts`: `specDoc`, `phaseDoc`, `task`, `prDoc`, `questionDoc`, `cardDoc`, `sourceDoc`.
- Real-git suites titled `"… (real git)"` use `repoWithOrigin` and `.clone(name)` as a second machine, always
  with `isolatedRunner` (`gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner`).
- Races: a wrapping `racing: Runner` for "the ref moved between fetch and push"
  (`tests/land-on-main.test.ts:51`) and a `Bun.spawn` racer in `tests/fixtures/record-writer.ts`.
- Golden: one linear spec and one partly-edged spec give the same ready set before and after join.
- The 245 tests that pin file behaviour stay as the suite for specs not on the record.
- Commands are tested by calling the command function with injected deps and asserting the whole output line.

## Releases

Each PR group is one minor version (`scripts/version.py`, a ROADMAP row). PR A changes nothing a session can
see. PR B ships with `board.record` off; phase 5 turns it on in CRM after both people have updated and
restarted their sessions.

PR C, D and E each move data that joined specs already have in files (spec fields and PR numbers; parked
questions and hand-off notes; priority and due date). Each raises `RECORD_LAYOUT`, so a session still on the
previous release refuses to write and says to update (from 2.54 on: 2.53.0 reads a newer record as no record
and writes the files, `ledger/gotcha-2-53-writes-files-on-a-newer-record.md`). A spec whose `SpecDoc.layout` is behind is upgraded by
the next command that touches it, in one batch (`plan/kinds.ts` holds one upgrade step per layout); until then
its readers fall back to the file home for the fields that step moves.
