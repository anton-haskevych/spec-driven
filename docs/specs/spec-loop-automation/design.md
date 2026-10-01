# Spec Loop Automation — Design

## Purpose

Builds on `product-brief.md`. A read of 52 CRM sessions (2026-09-26 → 09-30) showed the spec loop's routine chores rebuilt by hand in session after session. This spec moves those chores into the plugin: deterministic `spec.ts` commands the modes call, one project settings file, and two hooks. Nothing is user-run.

## Problem, by chore

| Chore today | Evidence (verified) | After this spec |
|---|---|---|
| Context pack silently absent on `/spec execute`, `execute phase15`, `my-spec.` | `context.ts:24-36`; 5 hand re-runs errored | Pack loads; spec inferred from changed paths when unnamed |
| Ticking boxes, deployed marker, adding/splitting phases by python/sed | ~225 python-heredoc + 46 `sed -i` edits vs 12 Edit calls | `spec.ts phase tick\|deployed\|add\|split`; shell writes to spec files denied with a pointer to them |
| Writing a project lesson = 4 hand steps | 7+ sessions | Write the entry, then `spec.ts lessons add` |
| Ledger INDEX.md merge conflicts | ≥6 sessions | `.gitattributes` union merge, scaffolded + doctor-checked |
| Watching PR checks, triaging failures, "is main red too?" | 18 sessions; one polled 45× | `spec.ts pr-status` one-shot |
| Copying spec docs to main (3 methods, one lost an edit) | $150 budget line overwritten 09-26 23:27 | `spec.ts publish-docs` |
| Handoff doesn't push | repeated "is this on the remote?" | handoff pushes + `Remote:` line |
| Draft rule contradicts projects whose drafts run no CI | 8 sessions re-argued it | `pr.draft` setting |
| After merging main, regen steps rediscovered | ~10 sessions | `gates.after-merge-main` → `spec.ts gates --name <section>` |
| "What does this phase do for me?" | 6+ times | plain-words **Outcome** line per phase |

## Key decisions

| Decision | What we chose | Rejected alternative | Why |
|---|---|---|---|
| Settings home | Frontmatter of `docs/specs/_playbook/settings.md` | A new `.claude/spec-driven.*` file; prose in CLAUDE.md | `_playbook/` already holds project spec rules; `playbooks.ts:24-30` skips files without `match:`, so it is never injected as a tag playbook |
| After-merge / bootstrap steps | Settings name a `gates.md` section (`gates.after-merge-main: merge-main`), expanded by a new `spec.ts gates --name` form | A new steps format | Reuses `loadGates`; today's `gates <spec>` only expands a spec's `pr-opening.md` refs |
| PR state (CRM) | Ready (non-draft) so CI runs; merging stays Anton's call | Draft until Anton flips it | CRM drafts run no CI (`ci.yml:68`); sessions opened ready PRs anyway |
| Plugin default for PR state | `pr.draft: true` when unset | Flip the default | Other projects keep today's behaviour |
| Merge method (CRM) | Squash | Merge commit | Anton's call |
| CI watching | `pr-status` only when asked or at the PR gate | Background watcher after every push | Anton's no-babysitting rule |
| Spec docs location (CRM) | Straight to main via `publish-docs` | Ride the feature PR | Anton's rule; other sessions see docs before merge |
| Docs-to-main mechanism | Docs **snapshot commit** (HEAD blobs of changed spec docs on the last snapshot / merge-base) → `git merge-tree` into pinned `origin/main` → push → merge the snapshot back into the branch | Hand INDEX merge + line guards (overwrites main's non-INDEX edits — review S1); per-file divergence guard; ExitWorktree → commit on main; cherry-pick via temp worktree | Git's 3-way merge refuses concurrent edits and unions INDEX rows natively; merge-back keeps later main-merges and publishes clean. Probe-verified 2026-09-30 |
| INDEX merge conflicts | `docs/specs/**/INDEX.md merge=union` | A custom merge driver | Built into git; failure modes (duplicate/edited last row) caught by the doctor |
| Git/gh execution | One injected `Runner` interface (`Bun.spawnSync`, argv arrays) in `core/run.ts` | `Bun.$` in each command; fake binaries on `PATH` | Mirrors the injected `RecallMemory` seam; commands stay sync and return strings |
| Phase edits | `phase add\|split` with letter suffixes; split keeps the original id on the first part (7 → 7, 7a, 7b); never renumber or retire an id | Renumbering; split into 7a/7b retiring 7; dotted ids (7.1) | Any id change breaks `spec#N` refs, `applies-to`, `research/phase-N/`; letters already exist (`2b-pre`) and `comparePhaseIds` orders them |
| Writers | Pure line patches building an `EditPlan` (all files or none), validated in-process by the existing checkers; `core/apply-edits.ts` writes | YAML re-emit; one file per result | Follows `lessons/seen-in.ts`; keeps comments and key order; multi-file commands can't leave files out of step |
| Folders | `phases/` (writers), `pr/`, `publish/`, `playbook/settings.ts`, `core/run.ts` | `progress/`; one `git/` folder; one-file `settings/` | Domain folders like `lessons/`, `ready/`; `core/progress.ts` already owns `progress` |
| Bash writes to spec files | PreToolUse deny when a command mentioning `docs/specs` carries a write signal (CRM `protect-generated.ts` pattern), pointing at the `spec.ts` writers | PostToolUse mtime sweep; parsing target paths | Prevents the python/sed habit instead of checking it afterwards; no stamps; never blocks on files the session didn't write |
| Unnamed `execute`/`resume` | Infer from paths in the branch's own commits since the merge-base + uncommitted (joined to the repo root); exactly one spec → use it and say so, else list candidates | Branch name; newest `in-flight.md`; content diff vs merge-base (loses the spec once published docs are merged back) | Anton's rule: key on names or paths, never branches |
| Sub-command parse | `context.ts` implements it; SKILL.md keeps the rules, aligned with the tool; the pack's `spec=` wins when present | Drop the SKILL.md rules | The prose is the no-Bun fallback and the only parse for pack-less modes (prep, create, review, update, handoff, list, idea) |
| Context nudge | None — dropped 2026-09-30 | PostToolUse hook reading transcript usage against a `nudge-at` setting | Anton: unnecessary (`decision-no-context-nudge.md`) |
| `lessons add` shape | Agent writes the entry at its final path (hook-validated); `lessons add <entry.md> <spec>` does the bookkeeping, warning on close matches | Flags + body file; refusing on a strong `similar` score | Same shape as `lessons seen`; the similarity score is fuzzy (shared stems ÷ smaller set), so it informs, never blocks |
| CRM adoption | Final task phase in this spec | A separate CRM spec | Small config; keeps the adoption tied to the release it needs |
| pr-status data | `gh pr checks --json bucket,…`; job logs via the jobs API | Hand-normalising `statusCheckRollup`; `gh run view --log-failed` | gh already buckets both check kinds; `--log-failed` waits for the whole run (CRM lesson) |
| `isoTimestamp` | TS copy of `spec-bump.sh --now`, pinned by a comparison test | Spawning the script | The script is the no-Bun path; spawning bash per write is slower and still two sources |

## Flows

### Session start
```
/spec execute phase15
  └─ SKILL.md !injection → spec.ts context -  ("execute phase15")
       parse: mode=execute, name=∅, hint="phase15"
       name=∅ → branch commits' paths (merge-base..HEAD) + worktree → repo-root join → locateSpecFile → {checkout}
       exactly one → <spec-pack spec="checkout" mode="execute" inferred="true"> … Picked: 15
       zero / several → no pack; one line naming the candidates
```

### Execute → PR gate → handoff
```
chunk done ──► spec.ts phase tick <spec> <phase> "<item>"|#N   (flips top box when all done → Close the phase)
phase done ──► pre-PR checks ──► spec.ts gates <names>
merged main? ─► spec.ts gates --name <settings.gates.after-merge-main>
open PR ─────► draft per settings.pr.draft; body leads with phase Outcomes
asked "status?" / PR gate ─► spec.ts pr-status [<pr>|<spec>]   (default: this branch's PR)
handoff ─────► doctor → commit → settings.docs=main ? spec.ts publish-docs <spec> (push → publish → merge back → push) : spec.ts push
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
`state:` is one of `merged`, `closed`, `conflicting` (no CI will run), `draft` (project runs no CI on drafts), `red`, `pending`, `green`, `unknown` (GitHub still computing mergeability after one re-poll) — in that precedence, so a known failure shows as `red` while other checks still run.

## Edge cases

- **No Bun / Codex / cloud:** every command has a prose fallback line; hooks fail open. Settings absent → plugin defaults (draft PRs, docs on branch).
- **Branch cut before `.gitattributes`:** merging main into it still conflicts once; `pr-status`/doctor note it, never auto-resolve.
- **publish-docs race:** non-fast-forward → re-fetch, re-pin, rebuild once, then stop. Other rejections (branch protection, pre-push hook) stop immediately.
- **publish-docs vs an edit made on main** (the $150 case): `merge-tree` conflicts → nothing pushed; the output names the file and says "merge main first".
- **publish-docs with deletions or renames:** renames are split (`--no-renames`) so the new path publishes; deleted paths are listed as "not published"; never staged as deletions.
- **Uncommitted spec edits:** never published — the snapshot takes HEAD blobs.
- **INDEX row edited on the branch** (not appended): union merge keeps both — doctor flags duplicate rows and rows pointing at missing files.
- **Specs under `*/docs/specs`** (CRM `landing/`): covered by the shared `isSpecDocPath` predicate and a second union rule.
- **Main never ran the failing job recently:** `pr-status` says `main: job not run in the last N runs` instead of guessing.
- **Mergeability UNKNOWN:** one re-poll, then report `unknown`.
- **Push on the default branch** with non-docs commits: `spec.ts push` refuses and says why; the agent asks the user.
- **Tick on a task phase without evidence:** `invalid` — the doctor's evidence rule applies.
- **Inferred spec is wrong:** the agent states the inferred spec in its first line; the user can redirect.
- **Progress line with trailing notes** (`→ phases/x.md (closed 2026-09-08)`): `deployed` inserts right after the pointer, where the reader looks.

## Target audience

Anton and Taras, via Claude sessions running `/spec`. The user-visible surface is only output lines (`Remote:`, pr-status, doctor warnings) and fewer questions.
