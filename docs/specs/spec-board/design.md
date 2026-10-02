# Spec Board — Design

## Problem

Anton runs several specs in parallel sessions and worktrees. Today, keeping track of them is manual:
which phase is where, what can start, what waits on what, and which PR belongs to which spec all live in
his head or get rebuilt by hand in each chat (2026-10-01: four shell commands and a long table to answer
"what next and how do these relate"). The tools have three gaps
(`research/2026-10-01-wave-1-sources-and-layers.md`):

- **One checkout only.** Every view reads the folder it runs in. From a worktree branched days ago, it
  shows days-old progress and nothing that other worktrees ticked.
- **No cross-spec "what next".** `list` is a flat table (CRM: 30 open, 14 p1). The ready set exists
  only per spec.
- **No session, claim or PR picture.** Nothing says a phase is taken, which session is on it, or
  which PR and CI state go with it. Two sessions can pick the same phase.

## Decisions

| # | Decision | Chosen | Rejected alternative | Why |
|---|---|---|---|---|
| 1 | Where the board lives | `/spec list` with no filter shows the board. `/spec list <filter>` and `list table` print today's table unchanged. Lanes, JSON and agent use go through a tool command, `spec.ts board [<lane>] [--json] [--local]` | (a) A new `/spec board` sub-command. (b) Lane words as `list` filters plus a `board` key in `list --json` | (a) Agentic-only rule: no new user-facing command. (b) `list blocked` already filters by status, and idea/prep dedupe pass free words to `list`. `list --json` would also carry the backlog bodies, a fetch and gh calls into every agent call (review 2026-10-01, L2/L3) |
| 2 | Layers | Source adapters (IO) → `BoardInputs` (plain data) → `buildBoard` (pure) → `Board` (versioned, serializable) → views | Render straight from sources, as `list` does today | A later HTML view consumes `Board` (or `--json`) without rebuilding anything underneath. The logic sits in the pure middle and is tested without git |
| 3 | Folder shape | One domain folder per source: `mainline/`, `workspaces/`, `sessions/`, `claims/`. PRs extend `pr/`. `board/` holds the model, rules and views. All flat, no subfolders | (a) Everything in one `board/`. (b) `board/sources\|model\|views/` subfolders | Claims are also used by execute, handoff and the packs; workspaces by the board and later by inference. `principles.md` §10 groups by what changes together, and no folder in tools has subfolders |
| 4 | Truth for spec docs | Base = `git archive` of the read set at `origin/<default>`'s sha, extracted once per sha into `<git-common-dir>/spec-board/base/<sha>/` and read by the unchanged disk loaders. Overlay = each live worktree's spec docs on disk | (i) The cwd checkout (today). (ii) `ls-tree` + `cat-file --batch` blobs behind a virtual-path reader | (i) is the bug. (ii) Frame sizes are bytes while `Runner` returns decoded text. It also needs a parallel `…From` loader family, and its virtual `SpecFolder.dir` falls back to the cwd in any disk reader. The archive was approved in the plan session: 0.8 s cold, ~0 s warm, real files (review 2026-10-01, B1–B3) |
| 5 | Reading the base | The base cache is a real directory: `loadNodes`, `loadSpecState`, `loadBacklog` and `loadSettings` run on it unchanged | Additive `loadNodeFrom(spec, read)` readers | Nothing new to keep in sync; every `spec.dir` reader works, `pr-opening.md` included |
| 6 | Freshness | `pinDefault` (fetch + verify) on every board run, with a 10 s timeout. On failure, use the local ref and say so in the header. `--local` skips the fetch | `ls-remote` first and fetch only if stale; or never fetch | Local `origin/main` was already stale in the probe. A fetch with nothing to do costs about the same as `ls-remote` |
| 7 | Which worktrees are scanned | One `for-each-ref` (ahead-behind) + one `rev-list` for detached HEADs. Merged-and-clean worktrees are counted, not scanned, unless a claim or a live session points at them. No merge base → "unknown base". A git failure → "unreadable" | Scan all; per-worktree `merge-base` | CRM: 43 of 64 skipped, 21 scanned in parallel in ~0.6 s. A fresh worktree with only uncommitted docs has 0 ahead, so a claim or session must force the scan |
| 8 | Parallel git | New `AsyncRunner` beside the sync `Runner`, used only by the workspace scan, concurrency 8. `runAll` never rejects | Make `Runner` async | `Runner` is sync in 9 modules; only this scan needs parallelism |
| 9 | Session liveness | `~/.claude/sessions/<pid>.json` (sessionId, cwd, status, updatedAt, procStart). A session is live when its pid is alive and its `procStart` matches the process. An unreadable source → liveness `unknown` | Process cwd via `lsof`; transcript tails; heartbeats in claims | Session files name the session and its state directly. They are undocumented, so failure must make claims safer, not weaker. `procStart` defeats pid reuse after a crash |
| 10 | Phase claims | JSON per claim in `<git-common-dir>/spec-board/claims/`. Create with `wx` through temp + `link`. Take over a closed claim by renaming it to a unique stale name, then `wx`. Execute takes the claim, handoff releases it. The board only reads | Commit a claim file; branch-name mapping; time-based expiry; the board deleting dead claims | Visible to every worktree at once, never committed, survives `gc` and `worktree prune`. Each step is a single atomic filesystem op, so two takers never both win (review C1, C6) |
| 11 | Claim identity | `CLAUDE_CODE_SESSION_ID` from the Bash env; worktree from `git rev-parse --show-toplevel`, realpath-normalized | `${CLAUDE_SESSION_ID}` skill substitution | Substitution works only in SKILL.md, not in `execute.md`; the env var is in every Bash call |
| 12 | PRs | Two `gh pr list` calls: open PRs with `statusCheckRollup` (1.6 s), and all states without it (0.7 s). Joined by branch and by `pr-opening.md` links | One `--state all` with rollup (8.4 s); `pr-status` per PR | Speed and the 30-call budget. Merge conflicts stay `pr-status`'s job: `mergeable` is `UNKNOWN` in lists |
| 13 | CI state | `rollupToChecks` reproduces gh's state→bucket mapping and keeps only the latest run per check name, checked by a parity test against gh's own `bucket` output. Then `summarizeChecks` | A board-specific mapping | `pr-status` trusts gh's `bucket`; the board must agree with it on the same PR (review P1) |
| 14 | Ready ranking | Overdue → priority → due → unblocks most → updated → name. `compareSchedule` is shared with `list` | `orderSpecs` as is | `orderSpecs` keys are spec-level; "unblocks most" breaks ties between many p1s |
| 15 | Safe-to-run mark (★) | No `same-files-as` with an in-flight phase, and no shared code-map path with an in-flight spec. Paths used by more than `HUB_LIMIT` open specs are ignored; declared relations still count. Overlap is a warning, never a block | Block overlapping work | Overlap means merge risk, not a dependency. `HUB_LIMIT` keeps shared hubs from blocking every ★ |
| 16 | Wiring | Packs skip live-claimed phases. `claim take` is the first step of execute §1, and a refusal re-picks through `spec.ts context`. Handoff releases the claim and ends with the top 3 ready + needs you. Resume's existing overlap line marks claimed specs | A hook that claims on file edits; a new resume bullet | Claims mean "I picked this phase", which only execute knows. The overlap line already exists (`graph/render.ts`) |
| 17 | Ticks on a branch | Base-done alone drives `readySet` and `isFinished`. Workspace ticks and half-done phases are `PhaseActivity` (`tickedIn`, `wipIn`). A phase whose need is met only on a branch is ready **in that workspace**, never from main | "Done if done in any view" | Done-anywhere drops branch-ticked specs from the board and launches dependents on a main without their code (review O1) |
| 18 | Where launched sessions run | One tree per spec PR group (`feat/<spec>-<pr>`), found or created by `trees place` from fresh `origin/<default>`, set up by `gates.bootstrap`, one live session per tree. Launch is always `cd <tree>`. Revised 2026-10-01: see `decision-trees-placed-by-spec-driven.md` | (a) Every launch in the caller's checkout. (b) `claude -w <spec>-<phase>` through the WorktreeCreate hook | (a) Two parallel rows share one tree (review L1). (b) One tree per phase splits a PR; the hook is personal (Taras has none), branches from local HEAD and silently reuses a busy tree |
| 19 | Board text | Aligned columns printed inside a code fence, padded by `Bun.stringWidth` | Markdown tables per lane, like `renderPortfolio` | Four lanes with mixed columns read better as one dense screen. The fence stops chat markdown from collapsing spaces, and `stringWidth` measures ★ ✓ ✗ ◀ ⚠ |

## Layers

```
 sources (IO, injected)                    model (pure)                      views
 ─────────────────────                     ────────────                      ─────
 mainline   pinDefault + git archive     ─┐
            → base cache, disk loaders    │
 workspaces worktree list, ahead-behind,  │
            per-worktree spec-doc changes ├─► BoardInputs ─► buildBoard ─► Board (v1) ─┬─► renderBoard (terminal)
 sessions   ~/.claude/sessions/*.json     │   plain data     activity,      lanes,     ├─► spec.ts board --json
 claims     <git-common-dir>/spec-board/  │                  lanes, rank    rows,      └─► (later) HTML
 prs        gh pr list ×2                ─┘                                 header
```

`loadBoardInputs` composes the source adapters, one call per source. It is the only place that touches
git, gh or disk. Everything to the right of it is pure and tested with typed factories.

## The board

Example from CRM data (PR numbers and states invented to show each lane):

```
spec board · crm · origin/main e43d948 · fetched 13:40
4 in flight · 7 ready · 11 blocked · 3 need you

IN FLIGHT
  alert-noise-cleanup · 8 (PR D)     alert-noise-cleanup-pr-d ◀ here   busy 2m    —                executing
  alert-noise-cleanup · 4 (PR B)     alert-noise-cleanup-pr-b          idle 3h    #881 draft ✗ 2   fix CI
  double-charge-proof-checkout · 4   double-charge-proof-checkout      closed     #861 ✓           merge
  ci-optimization · 12               ci-optimization-phase-12          —          —                ticked on branch, not merged

READY   ★ = shares no files with anything in flight
  1 ★ user-facing-error-messages        /spec prep      p1  10-14  unblocked by alert-noise-cleanup#2
  2   alert-noise-cleanup · 5 (PR C)    /spec execute   p1  10-14  in alert-noise-cleanup-pr-b (needs 4, ticked there)
  3   explicit-charge-handling · 1      /spec execute   p1  10-14  shares files with alert-noise-cleanup
  4 ★ permission-aware-ui · 2           /spec execute   p1  10-14  unblocks 2
  +3 more → /spec list ready

BLOCKED
  alert-noise-cleanup · 7               needs phase 4 deployed
  recurring-series-lifecycle-clarity · 3   needs schedule-lifecycle-safety#2
  +9 more → /spec list blocked

NEEDS YOU
  #861 checks pass → merge              double-charge-proof-checkout
  #881 2 checks failing → fix           alert-noise-cleanup (PR B)
  claim by a closed session             double-charge-proof-checkout · 4 → resume or release
  ⚠ overdue: tickets-lifecycle-recovery (due 09-28)

43 worktrees merged · 4 unknown base · 2 paused · 27 backlog ideas → /spec list table
```

### Rows

- **In flight** row:
  - `<spec> · <phase> (PR <group>)`.
  - Workspace name: the basename of the worktree path, or `main checkout` for the main one.
  - Session: `busy|idle <ago>`, `closed`, `unknown`, or `—`.
  - PR cell: `#<n>[ draft] ✓|✗ <failing>|… <pending>`, `?` (linked but not listed), or `—`.
  - Next: `executing`, `fix CI`, `merge`, `ticked on branch, not merged`, or `uncommitted`.
- **Ready** row:
  - Rank.
  - ★ or blank. Never ★ when the row is ready only in a workspace.
  - `<spec> · <phase>`, or the spec alone when it has no phases.
  - Next command.
  - Priority.
  - Due: `MM-DD` or `⚠ overdue`.
  - Note: `unblocked by …`, `unblocks N`, `shares files with …`, `only on <branch>`, or
    `in <workspace> (needs N, ticked there)`.
- **Blocked** row: `<spec> · <phase>`, then the readySet reasons joined by `; `.
- **Needs you** row: what, then which spec, then the action.

Every row also carries its target workspace, if any. The terminal doesn't show it; `launch` uses it.

### Next step per stage

| Stage of the spec / phase | Next |
|---|---|
| Prep stub, no `product-brief.md` (or a `seed.md`) | `/spec prep <spec>` |
| Brief, no `progress.md` | `/spec create <spec>` |
| Open phase, ready | `/spec execute <spec> <phase>` |
| All phases ticked on base, no PR linked | open PR (`pr-opening.md`) |

### States and copy

| State | Output |
|---|---|
| Fetch failed | header `· offline, origin as of <sha> <date>` |
| Fetch blocked by a lock | header `· fetch skipped (busy), origin as of <sha> <date>` |
| `--local` | header `· local, origin as of <sha> <date>`; PR and session cells `—` |
| `gh` missing / unauthenticated | PR cells `?`, footer `PRs unavailable: <reason>` |
| Sessions unreadable | session cells `unknown`, footer `sessions unavailable: <reason>`; no claim is taken over |
| Called from a worktree | `◀ here` on its row; nothing else changes |
| No worktrees besides main | lanes as usual; footer omits the worktree counts |
| Empty lane | lane heading with `none` |
| Same phase ticked in two worktrees | in flight, note `ticked in 2 worktrees: a, b` |
| Spec only on a branch | ready / in flight with `only on <branch>` |
| Paused spec | not in any lane; counted in the footer |
| A worktree's git fails | counted as `unreadable` in the footer |
| Board can't be built (no origin, archive fails) | `list` prints today's table plus `board unavailable: <reason>`; `board --json` prints `{ "board": null, "error": … }` |
| Not a git repo, or no Bun | `list` prints today's table (`list.md` §2 fallback) |

## Flows

**Picking work.**
1. `/spec list` shows the board.
2. Anton says "Start 1 and 2".
3. Claude runs `spec.ts launch execute <spec> <phase>` per row, passing the row's workspace.
4. Each tab opens in that worktree, or in a new one through `claude -w`.
5. Each tab runs execute, and execute §1 takes the claim.

**Claim race.** Two sessions run `claim take` on the same phase. Exclusive create lets one win. The
other gets `claimed by <session name> in <worktree>`. With no phase named, it re-picks through
`spec.ts context` (the pack already skips claimed phases). With a phase named, it stops and shows the
holder.

**Between sessions.** Handoff releases the claim. While a phase is half done or ticked in worktree A, a
`claim take` from any other workspace refuses: `phase 4 is in progress in A`. A new session in A takes
the claim normally.

**Closing.** Handoff commits, runs `claim release`, then its final block shows the board's top 3 ready
and the needs-you rows.

**Abandoned session.** Its session file is gone, or its pid now belongs to a different process, and the
phase isn't done. The board shows it under needs you: `claim by a closed session`. Execute on that phase
takes the claim over and says so in one line. When liveness is `unknown`, nothing is taken over.

## Edge cases

- Shallow clone: branches with no merge base count as "unknown base" and are never diffed (`log` gives
  junk, `diff` fails).
- A worktree folder that's gone (`prunable`) is skipped. `claim take` and `claim release` clean up its
  claims; the board never deletes.
- Pointers outside `phases/` (`../ci-optimization/…`) resolve inside the base cache; anything escaping
  the spec root is ignored.
- The main checkout is a workspace too: its uncommitted spec docs overlay like any other.
- Subagents share the parent's session id, so a subagent never claims separately.
- Codex worktrees are listed and scanned as workspaces; their sessions show `—`. Without a session id,
  `claim take` still refuses a phase someone else holds.
- `docs: main` projects: after a handoff publishes, a worktree's spec-doc diff is empty. Workspace → spec
  comes from claims first, then from the doc diff.
- When base and a branch disagree on a spec's `status`, base wins. A workspace spec folder without
  `CLAUDE.md` (deleted or renamed) is skipped.
- When the same spec name exists in two spec roots, the footer flags it as a duplicate. Claims key by
  name.
