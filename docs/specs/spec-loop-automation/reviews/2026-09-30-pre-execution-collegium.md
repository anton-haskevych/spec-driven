---
date: 2026-09-30
spec-phase-at-review: pre-execution (draft; ready set 1, 2, 5, 8, 9)
agents: [principal-engineer, integration-architect, adversarial-tester, code-quality-reviewer, prior-art-reviewer]
slug: pre-execution-collegium
---

# Review — pre-execution-collegium

*Source of record — do not edit. Actionable findings are applied to the spec and ledger by the review run itself.*

## Summary

All five lenses: **fix-then-proceed**. Nobody questions the spine (deterministic `spec.ts` commands called from mode files, one `Runner` seam, pure line-patch writers, settings under `_playbook/`, skill-frontmatter hooks). The defects cluster in three places:

1. **publish-docs re-creates the incident it exists to prevent.** Step 3 copies every branch-changed non-INDEX file over main; the guard only protects INDEX lines. Four of five reviewers found it independently. The adversarial pass adds that, as written, every later "merge main" would conflict on the spec's own files (the publish commit isn't an ancestor of the branch), plus a moving-`origin/main` race, dropped renames and worktree-vs-HEAD content. I replaced the algorithm with a **docs snapshot commit merged into main via `git merge-tree`, then merged back into the branch**, and verified it end to end in throwaway repos (below). That deletes `index-merge.ts` and both hand-written guards.
2. **The Phase 1 "pack always loads" fix wouldn't load a pack for any root spec.** `SPEC_FILE_PATTERN` needs a `/` before `docs/specs/`; git prints repo-relative paths. Content-diff inference also loses the spec after a merge of main. And dropping SKILL.md's parse prose breaks every pack-less mode and the no-Bun fallback.
3. **Phase seams planned in rather than designed out.** Three INDEX parsers across phases 4/5/7 (the one to be "shared" can't read project rows), stand-in settings readers in phase 8, multi-file writers with no all-or-nothing contract, and `spec.ts gates <gate-name>` assumed but never specified (the command takes a spec name).

Everything else is sharpening: `phase split` must not retire the original id, `deployed` must insert after the pointer, `pr-status` should lean on `gh pr checks` buckets and the jobs-log API, `push` needs an explicit refspec.

## Forks put to the user

None. Every reviewer disagreement was a mechanism choice that satisfies all concerns either way; decided below per Anton's "don't gate on good defaults" rule.

## Resolved by the synthesizer

- **publish-docs mechanism** → snapshot commit X (merge-base or last snapshot + branch's HEAD blobs of changed spec docs) → `git merge-tree --write-tree <pinned main> X` → `commit-tree -p main -p X` → push → merge X into the branch (no-op diff, records ancestry). Chosen over PE/IA's per-file divergence guard and PA's docs-only commit without merge-back, because it's the only variant that also keeps later main-merges clean (AT F5). Verified: see *Probe*.
- **Bash writes to spec files** → PreToolUse deny on write signals (CRM `protect-generated.ts` pattern, `if:`-filtered) instead of the PostToolUse mtime sweep. Kills the stamp, the 120 s guess and the blocks-on-files-you-didn't-write problem (AT F7, IA F12, CQ F12), and serves the "zero python/sed edits" metric directly (PA F2). The tool writers validate in-process (CQ F2).
- **Parse ownership** → SKILL.md keeps the parse rules (aligned with the tool) because they are the no-Bun fallback and the only parse for pack-less modes; the pack's `spec=` wins when present. Rejects the design's "drop the prose" (IA F2, AT F18).
- **`phase split` ids** → the original id stays on the first part; new parts take the next free letters; `comparePhaseIds` orders letters and dots. Keeps letters (the plugin already has letter ids like `2b-pre`) over PA's dotted proposal; either works once ordering is fixed.
- **`lessons add` shape** → bookkeeping on an entry the agent already wrote at its final path (`lessons add <entry.md> <spec>`), close matches printed as a warning, never a refusal. Resolves PE F5 (fuzzy hard refusal), CQ F2 (body file blocked by the hook) and PA F9 (house pattern).
- **Command surface** → `tick`/`deployed` fold into `phase tick|deployed|add|split` (matches `lessons` multi-action); `spec.ts` switches to a command table with derived USAGE; flags via `node:util` `parseArgs`.
- **Folders** → `core/run.ts` (Runner), `pr/`, `publish/`, `playbook/settings.ts`; no `git/` grab-bag, no one-file `settings/`.
- **Phase 5 / 9 overlap** (`packs.ts`, execute §10) → not an edge; noted in `pr-opening.md` to run them sequentially if parallel.
- **`_playbook/page.md`** → cut from phase 10 (out of the brief's scope); capture as a CRM backlog idea.
- **Nudge threshold per project** → kept (PE F8 accepted as-is), documented as assuming 1M-window sessions.

## Probe (verification of the publish-docs replacement)

Throwaway bare origin + main clone + worktree, `docs/specs/**/INDEX.md merge=union`:

| Step | Result |
|---|---|
| branch ticks Phase 1 + adds INDEX row `b`; main concurrently adds row `c` + code | — |
| publish #1 (snapshot on merge-base) | main gets only the 2 spec files; INDEX = a, c, b; branch code not leaked |
| branch merges snapshot X | empty diff |
| both sides edit again (branch: progress + row `e`; main: row `f` + code) → branch merges main | **clean**; progress keeps branch edits |
| publish #2 (snapshot on last X) | clean; main INDEX a, c, b, e, f; progress current |
| main edits `design.md` (budget 150); branch edits same line → publish | **merge-tree conflict → refused**, nothing pushed |

Trap hit while probing: in zsh, `$D:refs/heads/main` applies the `:r` modifier and mangles the refspec. argv-array spawning (the Runner) avoids it; any prose fallback must write `"${D}:refs/heads/main"`.

## Findings

Severity is the synthesizer's; `V` = verified in code/probe, `U` = unverified.

### S1 — publish-docs overwrites main's edits; later main-merges conflict — critical · consensus · V
PE F1, IA F3, AT F1, PA F1 (+ AT F3 moving ref, AT F4 renames, AT F5 post-publish conflicts, AT F9 worktree content, AT F10 INDEX merge gaps, AT F19 retry on any failure, AT F6 landing roots). Algorithm replaced (see resolved). `index-merge.ts` and both guards deleted; pin `origin/<default>` to one SHA after fetch; `--no-renames`; HEAD blobs, not worktree; retry only on non-fast-forward; spec-doc predicate covers `*/docs/specs`.

### S2 — Spec inference never matches root specs and loses the spec after merging main — critical · consensus · V (regex) / inferred (merge)
AT F2, IA F4, PE F3, AT F16, AT F17. `core/spec-folders.ts:14` requires `/docs/specs/`. Fix: paths from the branch's own commits (`git log --name-only --format= <base>..HEAD`) + `git status --porcelain -z --untracked-files=all`, each joined onto `rev-parse --show-toplevel`; pack carries `inferred="true"` and the agent states the resolved spec in one line; 0/≥2 candidates → one line listing them.

### S3 — `spec.ts gates <gate-name>` doesn't exist — high · consensus · V
PE F2, IA F1, PA F5. `commands/gates.ts:6-11` takes a spec. Phase 5 adds `gates --name <g…>` on `loadGates`, lists `commands/gates.ts`, fixes `execute.md:134` / SKILL.md wording; `doctor/settings.ts` reuses `doctor/gates.ts` shape.

### S4 — Dropping SKILL.md parse prose breaks pack-less modes and no-Bun — high · consensus · V
IA F2, AT F18. `contextPack` returns "" for every mode but resume/status/execute/route (`commands/context.ts:34`). Resolved: prose stays, aligned with the tool.

### S5 — INDEX parsing planned three times; "shared" parser can't read project rows — high · consensus · V
CQ F3, IA F8, PE F4 (stand-in code), CQ F9. `ledger-scope.ts:14` `ROW` requires `[tags]`; project rows have none. `core/ledger-index.ts` keys rows on the leading backticked path (allowing `/`), tags parsed only in ledger-scope; exports `insertRow`. Phase 5 `needs: [4]`; phase 8 `needs: [5]`; index-merge gone (S1).

### S6 — Multi-file writers have no all-or-nothing contract — high · unique (CQ F1) · V
`EditPlan = {kind:"ok", edits, renames?} | {kind:"invalid", reason}`; one `core/apply-edits.ts`; writers validate planned text in-process with the existing checkers before applying (CQ F2).

### S7 — Bash sweep validates after the fact and blocks on others' files — high · consensus · inferred
PA F2, AT F7, IA F12, CQ F12, CQ F2. Resolved: PreToolUse deny.

### S8 — `deployed` appended at line end is invisible after trailing notes — high · unique (AT F8) · V
`core/progress.ts:10` anchors the suffix right after the pointer; CRM `backend-ecs-blue-green/progress.md:30` has `(closed 2026-09-08)` after it. Insert immediately after the pointer; fixture with a trailing note.

### S9 — `phase split` retires the id the design promised never to break — medium · consensus · V
IA F5, AT F11, PA F7. Resolved: original id stays on the first part; collisions via `samePhase`; insert after the last `<id>*`; refuse folder-shape and done phases; chunk regex `/^\d+[a-z]*(\.\d+)?$/i`.

### S10 — `numericPart` can't order `9.10` or letters; callers unlisted — medium · consensus · V
CQ F11, IA F6. Callers: `graph/relations.ts:47`, `context/ledger-scope.ts:57-58`. `comparePhaseIds(a,b)` replaces it; both callers + the RANGE parse migrate in phase 1.

### S11 — `tick` completion, locator and close-phase signal underspecified — medium · consensus · V
PE F7, IA F14, AT F12. `doctor/phases.ts:17` counts all boxes, `phase-entry.ts:21` counts Deliverables only. Completion = `countCheckboxes(entry).unchecked === 0`; locator skips code fences and matches markdown-stripped text; `#N` addressing (backticks in a shell-quoted prefix run command substitution in zsh); flip prints `Phase N complete — run update.md → Close the phase`.

### S12 — `doctor/index-rows.ts` duplicates `checkLedgerIndex` — medium · consensus · V
CQ F4, PA F6. `doctor/ledger.ts:29-34` already errors on missing files and collects rows into a Set (hides dups). Extend it to count duplicates; add project-INDEX + pointer-row checks; no new module.

### S13 — Writers would import regexes from `doctor/` — medium · unique (CQ F5) · V
Move checkbox/evidence patterns + `formatTickedItem` to `core/checkbox.ts`; `tick --evidence` validates against `EVIDENCE`.

### S14 — pr-status re-derives what gh gives; log path blocks; PR choice ambiguous — medium · consensus · V (lesson) / inferred (gh enums)
PA F3, PA F4, AT F13, IA F10. `gh pr checks --json name,state,bucket,workflow,link`; job ids from `gh run view --json jobs`; logs via `gh api repos/{owner}/{repo}/actions/jobs/<id>/logs` (CRM lesson `workaround-read-a-failed-job-log-while-the-run-is-still-going.md`: `--log-failed` waits for the whole run); no arg → PR of current branch; spec arg → every PR link listed, last open one reported; MERGED/CLOSED first, `red` before `pending`; walk-back budget capped overall.

### S15 — push: bare `git push`, detached HEAD, default branch detection — medium · unique (AT F14) · inferred
Always `push origin HEAD:refs/heads/<current>`; refuse detached; default = `symbolic-ref refs/remotes/origin/HEAD` → `gh repo view --json defaultBranchRef` → refuse; skip publish on the default branch.

### S16 — `phaseForHint` misses `phase15` / `phase-3` — medium · unique (AT F15) · V
`commands/context.ts:71` strips only `phase\s+`. `/^phase[-\s]*/i`.

### S17 — Repo-level `.gitattributes` warning hits every project; text-parsing attributes — medium · consensus · V
IA F9, PA F8, AT F6. Only when `_playbook/settings.md` exists; spec issues before repo lines; `git check-attr merge` on a root and a `*/docs/specs` INDEX; scaffold both patterns (CRM has 16 `landing/docs/specs` specs, 11 with ledgers).

### S18 — Parallel-ready phases share files without edges — medium · unique (IA F7) · V
Resolved: 5/9 overlap noted in pr-opening; Tools-bullet overlaps accepted as trivial.

### S19 — `git/` mechanism folder; orchestration has no home — medium · unique (CQ F6) · inferred
Resolved: `core/run.ts`, `pr/{checks,main-compare,log-tail,render}.ts`, `publish/{snapshot,publish}.ts`.

### S20 — `spec.ts` switch + SKILL.md Tools won't stay navigable — medium · unique (CQ F7) · V
Resolved: command table + derived USAGE + wiring test; grouped Tools bullets.

### S21 — Flag parsing hand-rolled per command — medium · unique (CQ F8) · V
`node:util` `parseArgs` in Conventions.

### S22 — `lessons add` fuzzy hard refusal and body-file path — medium · consensus · V
PE F5, PA F9, CQ F2. Resolved (entry-file bookkeeping, warn only). `similar.ts:28-31` divides by the smaller set.

### S23 — settings.md not validated on write; module placement — low · consensus · V
PE F6, CQ F10. `spec-file-check.ts:27,41` sends `_playbook/*` to `checkPlaybook`, which returns `[]` without `match:`. Route settings.md to the settings check; `playbook/settings.ts`; `booleanField`/`numberField` in `core/frontmatter.ts`.

### S24 — Nudge assumptions — low · consensus · V (autoCompact) / U (hook lifetime)
PA F11, PE F8, IA F13, AT F19. `~/.claude/settings.json:244` `autoCompactEnabled: false` → "compaction is the hard stop" is false for Anton; CRM already has `checkpoint-reminder.ts` (PostToolUse, every 20 calls) — reconcile in phase 10; wave-2 (docs) vs `REFERENCE.md:230` disagree on skill-hook lifetime → probe deliverable; no session id → skip memory; skip sidechain/synthetic/partial transcript lines; `if:` pre-spawn filter.

### S25 — `_playbook/page.md` out of scope — low · unique (PE F9) · V
Resolved: cut.

### S26 — `enforced-by:` would point at a plugin file CRM doesn't have — low · unique (IA F11) · V
`doctor/project-lesson.ts:25-28` resolves against the project. Point at `docs/specs/_playbook/settings.md`.

### S27 — `phase add` template misses the Outcome line — low · unique (IA F15) · inferred
Phase 3's TS template includes `**Outcome:**` regardless of phase 9's ordering.

### S28 — `isoTimestamp` duplicates `spec-bump.sh --now` — low · unique (PA F10) · V
Accepted as deliberate (script is the no-Bun path); recorded in the decisions table.

### S29 — code-map and ledger empty before execute — low · unique (CQ F13) · V
Code-map filled; ledger seeded from this review.

## Rejected or unverified

- **PA F1's docs-only commit without merge-back** — superseded by the probe-verified snapshot + merge-back (it leaves AT F5's post-publish conflicts).
- **PE F1 / IA F3 per-file divergence guard** — superseded; `merge-tree` performs the same refusal natively.
- **AT F5 "resolve own-spec conflicts to ours after merging main"** — superseded; ancestry makes the conflict not happen.
- **PA F7 dotted ids** — rejected in favour of letters with a fixed comparator (either works; letters already exist in the plugin).
- **AT F9 "scope publish to `<spec>` only"** — rejected: in `docs: main` projects every spec-doc change on the branch belongs on main (Anton's rule); the argument only labels the commit. Shared `_ledger/` edits ride along by design.
- **IA F13 skill-hook lifetime** — unverified; left as a phase-8 probe deliverable, not a spec change.
- **AT F13 "~5 gh calls" undercount** — accepted in substance; handled by the overall walk-back cap.
