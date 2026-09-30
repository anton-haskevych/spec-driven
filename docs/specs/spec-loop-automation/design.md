# Spec Loop Automation — Design

## Purpose

Builds on `product-brief.md`. A read of 52 CRM sessions (2026-09-26 → 09-30) showed the spec loop's routine chores rebuilt by hand in session after session. This spec moves those chores into the plugin: deterministic `spec.ts` commands the modes call, one project settings file, and two hooks. Nothing is user-run.

## Problem, by chore

| Chore today | Evidence (verified) | After this spec |
|---|---|---|
| Context pack silently absent on `/spec execute`, `execute phase15`, `my-spec.` | `context.ts:24-36`; 5 hand re-runs errored | Pack loads; spec inferred from changed paths when unnamed |
| Ticking boxes, deployed marker, adding/splitting phases by python/sed | ~225 python-heredoc + 46 `sed -i` edits vs 12 Edit calls | `spec.ts tick`, `deployed`, `phase add\|split` |
| Writing a project lesson = 4 hand steps | 7+ sessions | `spec.ts lessons add` |
| Ledger INDEX.md merge conflicts | ≥6 sessions | `.gitattributes` union merge, scaffolded + doctor-checked |
| Watching PR checks, triaging failures, "is main red too?" | 18 sessions; one polled 45× | `spec.ts pr-status` one-shot |
| Copying spec docs to main (3 methods, one lost an edit) | $150 budget line overwritten 09-26 23:27 | `spec.ts publish-docs` |
| Handoff doesn't push | repeated "is this on the remote?" | handoff pushes + `Remote:` line |
| Draft rule contradicts projects whose drafts run no CI | 8 sessions re-argued it | `pr.draft` setting |
| After merging main, regen steps rediscovered | ~10 sessions | `gates.after-merge-main` → a `gates.md` section |
| Anton says "you're running out of context" | 3 times | once-per-session context nudge |
| "What does this phase do for me?" | 6+ times | plain-words **Outcome** line per phase |

## Key decisions

| Decision | What we chose | Rejected alternative | Why |
|---|---|---|---|
| Settings home | Frontmatter of `docs/specs/_playbook/settings.md` | A new `.claude/spec-driven.*` file; prose in CLAUDE.md | `_playbook/` already holds project spec rules; `playbooks.ts:24-30` skips files without `match:`, so it is never injected as a tag playbook |
| After-merge / bootstrap steps | Settings name a `gates.md` section (`gates.after-merge-main: merge-main`), expanded by `spec.ts gates` | A new steps format | Reuses the existing named-checklist mechanism |
| PR state (CRM) | Ready (non-draft) so CI runs; merging stays Anton's call | Draft until Anton flips it | CRM drafts run no CI (`ci.yml:68`); sessions opened ready PRs anyway |
| Plugin default for PR state | `pr.draft: true` when unset | Flip the default | Other projects keep today's behaviour |
| Merge method (CRM) | Squash | Merge commit | Anton's call |
| CI watching | `pr-status` only when asked or at the PR gate | Background watcher after every push | Anton's no-babysitting rule |
| Spec docs location (CRM) | Straight to main via `publish-docs` | Ride the feature PR | Anton's rule; other sessions see docs before merge |
| Docs-to-main mechanism | Temp index + `commit-tree` onto `origin/main`, INDEX rows merged in-tool, no-deletion guard | ExitWorktree → commit on main; cherry-pick via temp worktree | Leaves the worktree untouched; reproduced safely (wave 2); argv spawn removes zsh quoting traps |
| INDEX merge conflicts | `docs/specs/**/INDEX.md merge=union` | A custom merge driver | Built into git; failure modes (duplicate/edited last row) caught by the doctor |
| Git/gh execution | One injected `Runner` interface (`Bun.spawnSync`, argv arrays) | `Bun.$` in each command; fake binaries on `PATH` | Mirrors the injected `RecallMemory` seam; commands stay sync and return strings |
| Phase edits | `phase add\|split` with letter suffixes (7 → 7a, 7b); never renumber | Renumbering | Renumbering breaks `spec#N` refs, `applies-to`, `research/phase-N/` |
| Writers | Pure line patch returning `updated\|unchanged\|invalid`; command writes | YAML re-emit | Follows `lessons/seen-in.ts`; keeps comments and key order |
| Writer folder | `tools/phases/` | `tools/progress/` | `core/progress.ts` already owns that name |
| Bash writes to spec files | Spec-file check also runs after Bash calls whose command mentions `docs/specs`: validates spec files modified since the last check | Parsing shell commands for target paths | Zero deps, no fragile parser; lesson recall stays Write/Edit only |
| Unnamed `execute`/`resume` | Infer from paths changed vs `origin` merge-base + uncommitted; exactly one spec → use it, else ask | Branch name; newest `in-flight.md` | Anton's rule: key on names or paths, never branches |
| Sub-command parse | `context.ts` owns it; SKILL.md keeps the set + dispatch, drops the rules | Keep both copies | The two copies already disagree |
| Context nudge | PostToolUse hook, once per session, threshold `nudge-at` from settings, reads transcript usage | `once: true`; UserPromptSubmit | `once: true` drops the hook even below threshold; PostToolUse fires mid-work |
| `lessons add` scope | Project ledger only (entry + project INDEX row + spec pointer row) | Also spec-ledger entries | Project lessons are the 4-step chore; spec-ledger writes stay one Write + one row |
| CRM adoption | Final task phase in this spec | A separate CRM spec | Small config; keeps the adoption tied to the release it needs |

## Flows

### Session start
```
/spec execute phase15
  └─ SKILL.md !injection → spec.ts context -  ("execute phase15")
       parse: mode=execute, name=∅, hint="phase15"
       name=∅ → changed paths (merge-base..HEAD + worktree) → locateSpecFile → {checkout}
       exactly one → <spec-pack spec="checkout" mode="execute"> … Picked: 15
       zero / several → no pack; prose: "infer from conversation, confirm if ambiguous"
```

### Execute → PR gate → handoff
```
chunk done ──► spec.ts tick <spec> <phase> "<item>"      (flips top box when all done)
phase done ──► pre-PR checks ──► spec.ts gates <names>
merged main? ─► spec.ts gates <settings.gates.after-merge-main>
open PR ─────► draft per settings.pr.draft; body leads with phase Outcomes
asked "status?" / PR gate ─► spec.ts pr-status <pr|spec>
handoff ─────► doctor → commit → spec.ts push → (settings.docs=main) spec.ts publish-docs <spec>
               └─ prints  Remote: pushed feat/x (+3) · docs → main 1a2b3c4 · behind main 12
```

### pr-status output
```
PR #871 ready · mergeable CLEAN · head 084ec54f
state: red
checks: 14 pass · 1 fail · 15 skipped · 0 pending · 7 external (Vercel*)
FAIL Landing Tests › Unit tests (run 36775362173, job 110039001343)
  main: last ran 09-28 (run 36379694472) → success — failure is this branch's
  tail:
    <last 30 log lines, BOM/ANSI/timestamps stripped>
```
`state:` is one of `conflicting` (no CI will run), `draft` (project runs no CI on drafts), `pending`, `red`, `green`, `unknown` (GitHub still computing mergeability after one re-poll).

## Edge cases

- **No Bun / Codex / cloud:** every command has a prose fallback line; hooks fail open. Settings absent → plugin defaults (draft PRs, docs on branch, no nudge).
- **Branch cut before `.gitattributes`:** merging main into it still conflicts once; `pr-status`/doctor note it, never auto-resolve.
- **publish-docs race:** push rejected → re-fetch, rebuild once, then stop with the error.
- **publish-docs with deletions:** deleted spec files are listed as "not published"; never staged as deletions.
- **INDEX row edited on the branch** (not appended): union merge would keep both — doctor flags duplicate/near-duplicate rows and rows pointing at missing files.
- **Main never ran the failing job recently:** `pr-status` says `main: job not run in the last N runs` instead of guessing.
- **Mergeability UNKNOWN:** one re-poll, then report `unknown`.
- **Push on the default branch** with non-docs commits: `spec.ts push` refuses and says why; the agent asks the user.
- **Tick on a task phase without evidence:** `invalid` — the doctor's evidence rule applies.
- **Nudge in a 200k-window session:** threshold is absolute tokens from settings; compaction remains the hard stop.

## Target audience

Anton and Taras, via Claude sessions running `/spec`. The user-visible surface is only output lines (`Remote:`, pr-status, doctor warnings) and fewer questions.
