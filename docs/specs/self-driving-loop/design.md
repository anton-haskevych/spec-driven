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
| How a reply picks rows | Prose rule: a bare number, or several ("1 3"), answers the most recent numbered list this session printed. It launches only when that list is *Next sessions*; each row launches as `<row.next> <spec> [<phase>]` | A saved row list per session plus a `launch pick` parser (wave 2 §4); falling back to the board's top row when no block is in view | The rows sit in the conversation the model just wrote; the paste-back was a missing rule. The board fallback turned answers to the PR question, review forks or resume's "Start?" into launches (review 2026-10-10 #11) |
| Row titles | The board's ready rows carry `title` (`BOARD_VERSION` bump) | Documenting that there is no `title` | The template asks for a title; without the field sessions guessed (32 times) or read phase files per row |
| Review before execute | create ends with `<spec> review` at row 1; the board gives a spec with phases, no `reviews/` and nothing ticked `next: review`. Execute rows come first only when Anton says to skip the review | Leaving create's rows as execute rows | Anton, 2026-10-10: "The review is always the next step after the spec is created. Unless the human says 'Go ahead without the review' … the agent should just suggest to spawn the review in the next session." "I agree" had launched phase 1 unreviewed |
| Launched session asking "go" | Launched execute rows already skip Stage A. Preflight splits its *Decisions for you* into *Defaults applied* (execute applies them and lists them under `Say if wrong:`) and *Forks for you* (execute stops and asks) | Applying every preflight decision that has a recommendation; changing `resume` Stage A | Preflight's contract gives every decision a recommendation (phase-preflight/SKILL.md:137-140), so "apply the recommended one" would apply real forks unseen. `resume` stays the manual "talk first" entry |
| Two numbered lists in one message | pr-babysit owns the one-list rule (its design.md:47-48). We add only: *Next sessions* prints after the PR question is answered | Our own copy of the rule | One home; both specs edit the same handoff/execute lines |
| Report shape | One SKILL.md *Reports* rule for reports of work done (end-of-chunk, handoff once, standalone update, review): **Impact** = the first sentence of the Outcome line of the phases moved, plus a number when measured; **On merge**; **Left** (from the ready set and PR split) | Fresh impact prose per report; rewriting each mode's template | The Outcome line already is the reviewed plain-words impact (create.md:282, status Delivers column, PR body). Resume and status have no work to report; babysit's report keeps its own shape |
| Questions with obvious answers | SKILL.md *Say if wrong*: the criteria from review.md §3 (decide mechanism choices yourself and list them; ask only when the answer changes what the work is), with the forks list as examples. review.md and preflight point at it | A closed list of forks; keeping per-mode wording | A list goes stale at the first new question; review and preflight already state the criteria. Anton's standing rule |
| `updated:` collisions | Sessions stop bumping `updated:`; only a status change or a review/prep rewrite bumps it | Derive it from one cached `git log` pass (0.81 s for CRM's 317 specs, wave 2 §3) | Removes the #1 hand-merge with zero code. Cost: `list table` sorts unprioritized specs by it (3rd key, top 30), so an executing spec ranks by its last review or status change. Derivation stays the later upgrade |
| `in-flight.md` collisions | One file per phase, `in-flight/phase-<id>.md` (a PR-gate session writes `in-flight/pr-<group>.md`); handoff writes only its own and deletes it at a clean boundary; the execute pack reads only the picked phase's file; a legacy `in-flight.md` is still read | `## Phase <id>` sections in one file | Sections conflict whenever two sessions add one (verified with a git merge, review 2026-10-10 #2); new files never conflict, and the 2,000-char clip stops dropping the picked phase's notes |
| `pr-opening.md` collisions | Sessions stop refreshing the "phases done / left" prose in Spec state; status and the board show it. The one-time `PR #<n> · <branch>` line at PR open stays | Tool-rendered Spec state; dropping the PR line too | That line is the only open-PR link `pr-status`, the board's FOCUS `merging` state and pr-babysit's fallback read; pr-babysit writes nothing at open. One line per PR doesn't collide |
| Spec ledger INDEX and code-map | Unchanged | Derive INDEX from entries | 0 conflicts in 70 sessions; union merge works locally |
| Subfolder "spec not found" | `spec.ts`, both hooks and `spec-bump.sh` resolve the project dir as the outermost folder holding `docs/specs/`, at or below the git toplevel | Nearest folder holding `docs/specs`; git toplevel; `locateSpecFile` | Nearest re-roots CRM `landing/…` to `landing/` and silently loses the root `_playbook` settings and lessons; the outermost listing already covers `*/docs/specs`. Toplevel alone breaks a repo whose specs sit in a subproject. `locateSpecFile` covers only cwds inside a spec folder |
| Pack overflow | Project lessons render as one-line pointers inside a 3K budget with a hidden-rows note; playbooks clipped at 3K; a heavy fixture pack must stay under 30K | A 6K lessons cap alone; shrink every block | 46.9K − 17.7K + 6K ≈ 35K, still over the limit. The edit hook already shows a lesson's full paragraph before the edit |
| Release version | Picked at merge: main's minor + 1 | Fixed numbers per spec | Specs ship in any order; pr-babysit hardcodes 2.42.0 while this spec's PRs likely land first |
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
prints its chunk and starts recon; no "Start?". A number answers whatever numbered list came
last: after the PR question, "1" means babysit, not a launch.

Right after create:

```
Next sessions:
1. self-driving-loop review — five-reviewer panel before any phase starts · current checkout
2. local-test-cost 10 — Cache the Gradle build · new tree
```

When the PR is ready, the PR question (pr-babysit) is the message's only numbered list:

```
PR B is ready: phases 11–13 (fast-parallel-backend-tests), 14 commits, pre-PR checks green.
  1. Babysit it …
  2. Draft …
  3. Merge now …
```

After the answer, *Next sessions* prints as above (the one-list rule is pr-babysit's).

### Reports

Every report of work done (end-of-chunk, handoff, a standalone update, review) opens with:

```
Impact: test runs behave the same as this morning — nothing you'd notice yet.
On merge: nothing changes for anyone; it unlocks phase 12, the speed-up itself.
Left: phases 12–14, then PR E (the last of five PRs for faster backend tests).
```

Then the mode's own block. Rules: Impact starts from the Outcome line of the phases this
session moved, plus a number when there is one (`14 min → 5 min`); "nothing you'd notice
yet" when that's the truth; every internal label glossed the first time it appears in a
report (`PR C2 (the second of three PRs for the lock work)`); no file names in Impact.
Resume and status don't get it (nothing was done; status is tool-rendered); a handoff prints
it once, not again for the update it runs; babysit's final report keeps its own shape.

### Defaults vs forks

```
Applied 4 review findings.
Say if wrong: in-flight notes per phase file, not sections (git test showed sections conflict) · lessons as one-line pointers.
```

The rule is review.md §3's criteria: decide mechanism choices yourself and list them; ask
when the answer changes what the work is, moves scope between specs, deletes or migrates
data, or changes an external contract. Examples that always ask: the prep brief stop,
review's user-level forks, claim take-over, opening a PR (pr-babysit's question) and the
merge method when `pr.merge` is unset, merging, deploy confirmation, create's phasing gate,
task-phase items only a person can do, and preflight's *Forks for you*.

## Edge cases

- **"1" with no *Next sessions* block as the last numbered list** → it answers that list; if there is none, reprint the block and wait. Never fall back to the board.
- **A ready row whose `next` is prep, create or review** → launch that sub-command, no phase.
- **A row's tree is busy** → launch refuses (`treeBusy`); report it as is; the other rows still launch.
- **Old single `in-flight.md`** → still read by packs and the doctor; a handoff moves the part about its own phase into its phase file and leaves the rest. A phase file for a ticked phase awaiting deploy may stay; the doctor warns only when every phase is done (today's rule).
- **Working folder in a subproject** (`landing/src`, `skills/spec/`) → resolves to the outermost folder holding `docs/specs`, so root settings and lessons still apply.
- **Working folder outside any `docs/specs/` tree** → the walk stops at the git toplevel (`.git` directory or file) or `/` and behaves as today.

## Later (deferred on purpose)

One-step `spec.ts sync` (merge main, resolve spec-doc conflicts by rule, list code conflicts,
after-merge gate; never pushes); board behind-main count; one-step `start` / `close`;
git-derived `updated`; saved row list; `board next` text rows; stale-version warning.
Research for each is in `research/` (wave 2, craft, wave 2b).
