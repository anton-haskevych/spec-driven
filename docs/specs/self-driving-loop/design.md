# Self-Driving Loop — Design

## Problem

Builds on `product-brief.md`. In 70 CRM sessions (2026-10-07 → 10-10) Anton pasted a
"1. <spec> <phase> …" row back with "go" ~35 times; asked "what's the impact? / what happens
after I merge? / what does that mean?" ~25 times; answered "yes" to ~12 questions that had an
obvious answer; and sessions hand-merged shared spec files in ~12 sessions (`updated:` in
`CLAUDE.md` ≈9, `in-flight.md` ≈4, `pr-opening.md` ≈2). Tools said "spec not found" from a
spec folder (8 sessions) and the start-up context overflowed to a file in 27
(`research/2026-10-10-wave-1-loop-mechanics.md`, `wave-2-gaps.md`).

Anton, 2026-10-10: "prioritize immediate value rather than perfection and gold plating. We
could always do incremental improvements later." So the first release is the cheap part —
mostly mode-file prose — that removes those counts.

## Key decisions

| Decision | What we chose | Rejected alternative | Why |
|---|---|---|---|
| How a reply picks rows | Prose rule: a bare number, or several ("1 3"), means those rows of the *Next sessions* block this session just printed; launch each | A saved row list per session plus a `launch pick` parser (wave 2 §4) | The rows sit in the conversation the model just wrote; the paste-back was a missing rule, not a memory failure. A store is cheap to add later if a wrong row ever launches |
| Launched session asking "go" | Launched rows are always `execute <spec> <phase>` (already skips Stage A); preflight's "Decisions for you" are applied with the recommended option and listed, and only a real fork stops | Changing `resume` Stage A | `resume` is the user's manual "talk first" entry and stays; launched `execute` sessions already start work (digests 01–03, 07…) |
| Two numbered lists in one message | One numbered list per message. When pr-babysit's PR question is asked, it is the only list; *Next sessions* rows follow after the answer | Letters for one list | Anton, 2026-10-10 ("Sure"). Keeps "1" unambiguous |
| Report shape | One SKILL.md *Reports* rule every mode report follows: open with **Impact** (measured where there is a number), **On merge** (what merging does), **Left** (what remains); gloss internal labels on first use | Rewriting each mode's template | Templates carry different facts (handoff vs update vs review); a shared header rule is one home and can't drift. Mirrors the pr-babysit final report (`On merge: main deploys …`) |
| Questions with obvious answers | SKILL.md *Say if wrong* rule: apply the good default, list it under `Say if wrong:`; ask only real forks (listed). Mode files' good-default asks point at it | Keep per-mode asks | Review mode already works this way (`resolved by me`, review.md:214); Anton's standing rule. The list of real forks stays explicit |
| `updated:` collisions | Sessions stop bumping `updated:`; only create, review and a status change bump it | Derive it from one cached `git log` pass (0.81 s for CRM's 317 specs, wave 2 §3) | It is only a 5th tie-break in the board and a list column; nothing gates on it. Dropping the per-session bump removes the #1 hand-merge with zero code. Derivation stays the later upgrade |
| `in-flight.md` collisions | One `## Phase <id>` section per phase; handoff rewrites only its own phase's section and leaves the others | One file per phase (`in-flight/phase-<id>.md`) | Sections need no reader changes (packs, doctor, graph read one file); CRM already writes phase sections in 4 specs. Edits in different sections don't conflict. Files per phase are the later upgrade if sections still collide |
| `pr-opening.md` collisions | Sessions stop refreshing the "phases done / left" prose in Spec state; status and the board show it. pr-babysit's tool-written PR and merge lines stay | Tool-rendered Spec state | pr-babysit already writes PR records there (its phases 4–5); only the hand prose collided and drifted (4 copies) |
| Spec ledger INDEX and code-map | Unchanged | Derive INDEX from entries | 0 conflicts in 70 sessions; union merge works locally |
| Subfolder "spec not found" | `spec.ts` and `spec-bump.sh` walk up from the working folder to the nearest folder that holds `docs/specs/` | Use the git toplevel | The project dir may legitimately be a subproject (`core/spec-folders.ts:50`, `mainline/load.ts:52`) |
| Pack overflow | Cap the project-lessons block (17.7K of a 47K pack, uncapped) with the same budget-and-note pattern the ledger block uses | Shrink every block | Lessons are the one uncapped big block; one cap brings the median pack under the ~30K tool-output limit |
| Stale plugin version | Not in this release | Warning line or forwarding launcher | 66 stale calls in 14 sessions, all long sessions spanning a release; every session starts on the newest version (wave 2 §2) |

## The rules as the user sees them

### Picking the next session

```
Next sessions:
1. fast-parallel-backend-tests 11 — Classes leave the lock in batches · tree …-pr-c2
2. local-test-cost 10 — Cache the Gradle build · new tree
Needs you: PR #907 checks red
Reply with row numbers to launch.
```

`1` → `Launched: iTerm tab 6 (⌘6) — fast-parallel-backend-tests 11`. `1 2` → both, one launch
each, rows sharing a tree launch once. `go` / `yes` → row 1. A pasted row still works. Tab 6
prints its chunk and starts recon; no "Start?".

When the PR is ready, the PR question (pr-babysit) is the message's only numbered list:

```
PR B is ready: phases 11–13 (fast-parallel-backend-tests), 14 commits, pre-PR checks green.
  1. Babysit it …
  2. Draft …
  3. Merge now …
```

After the answer, *Next sessions* prints as above.

### Reports

Every end-of-chunk, handoff, update, review, and status report opens with:

```
Impact: test runs behave the same as this morning — nothing you'd notice yet.
On merge: nothing changes for anyone; it unlocks phase 12, the speed-up itself.
Left: phases 12–14, then PR E (the last of five PRs for faster backend tests).
```

Then the mode's own block. Rules: a number when there is one (`14 min → 5 min`); "nothing
you'd notice yet" when that's the truth; every internal label glossed the first time it
appears in a report (`PR C2 (the second of three PRs for the lock work)`); no file names
in Impact.

### Defaults vs forks

```
Applied 4 review findings. Opened draft PR #912.
Say if wrong: draft, not ready (project setting) · merge method from the last 3 PRs (merge commit).
```

Real forks still ask: the prep brief stop, review's user-level forks, claim take-over,
merging a PR, deploy confirmation, create's phasing gate, task-phase items only a person can
do, pr-babysit's PR question, and a preflight decision with no recommended option.

## Edge cases

- **"1" with no block printed this session** → treat it as row 1 of the board's ready lane, say so, launch.
- **A row's tree is busy** → launch refuses (`treeBusy`); report it as is; the other rows still launch.
- **Old single-block `in-flight.md`** → handoff converts it: the existing text goes under the phase it names, or `## Phase <unknown>` if none, then writes its own section.
- **A phase section in in-flight.md for a ticked phase** → handoff of that phase empties its section to the clean-boundary marker.
- **Working folder outside any `docs/specs/` tree** → the walk stops at the git toplevel (or `/`) and behaves as today.

## Later (deferred on purpose)

One-step `spec.ts sync` (merge main, resolve spec-doc conflicts by rule, list code conflicts,
after-merge gate; never pushes); board behind-main count; one-step `start` / `close`;
git-derived `updated`; per-phase in-flight files; saved row list; stale-version warning.
Research for each is in `research/` (wave 2, craft, wave 2b).
