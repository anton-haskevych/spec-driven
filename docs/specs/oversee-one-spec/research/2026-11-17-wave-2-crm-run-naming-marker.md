---
date: 2026-11-17
wave: 2
lens: implementation
slug: crm-run-naming-marker
brief: product-brief.md
---

# Recon Wave 2 — crm-run-naming-marker

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Aimed at wave 1's four open gaps. T = `skills/spec/tools`.

## Verified

### What the CRM run actually did (migration-reconciliation-rules, 2026-11-17)
- **Integration branch** `feat/migration-reconciliation-rules-engine` first pushed 01:52 at pr-a's tip `fd55bf5f40` (pr-a already merged to main as #1292 at 01:50 → it effectively began as main).
- **Merge-back worked as fast-forward pushes.** 19 pushes, every one a fast-forward. Each worker merged `origin/<engine>` into its own branch, verified, then `git push origin HEAD:<engine>`; on refusal fetch, merge, verify, retry. Races visible and resolved: pr-h merged engine twice (02:20:12, 02:20:22), pr-m three times (02:21–02:25). No non-fast-forward push. Brief text (verbatim, briefs #7/#8): "At handoff, after your [handoff] commit: merge origin/feat/migration-reconciliation-rules-engine into your branch again, run your lane's verify, then git push origin HEAD:feat/migration-reconciliation-rules-engine (fast-forward only; if refused, fetch, merge, verify, retry). Open no PR for your group".
- Workers kept their per-group trees/branches (`…-pr-b,c,h,j,l,m,p,q,r`), one tree per branch; all are now fully contained in engine. Engine itself had its own tree only at the end (3 merges by the #1296 babysitter).
- `main..engine` = 127 commits (41 merges). Many merges are publish-docs snapshot merge-backs (`T/publish/publish.ts:59-61`) and hand merges of origin/main.
- **#1296** engine → main: OPEN, 100+ commits, +20165/−3667, 463 files, held for review. #1291 (pr-d, backend) and #1292 (pr-a) merged alone. #1295 closed as duplicate.
- **#1295 base:** the phase-10 worker split itself into 10a/10b and pushed its own HEAD (on pr-j, after pr-j merged engine) as new branches pr-q / pr-r. Not cut by tools or the overseer — a worker creating branches from its current HEAD. Overseer transcript: "babysit R isn't something I launched".
- **publish-docs divergence, root cause:** each worker's handoff publish-docs pushes a snapshot of its branch's spec docs to main. Phase 6's `code-map.md` rows reached main via pr-p's own snapshot; phase 8's branch carried the same rows via the engine merge, but phase 6 had edited a row after its snapshot → same lines, different text → `merge-tree` conflict (`T/publish/publish.ts:23-24`). Criss-cross merge-bases make `snapshotBase` (`T/publish/snapshot.ts:57-64`) pick an old base. Same refusal hit phase 5 earlier. `git diff origin/main engine -- docs/specs/migration-reconciliation-rules/` is now empty: docs reached main by snapshots, not the PR.
- **"Crew line missing" false alarm:** close-out reads the Crew line from the worker's last transcript turn (`T/crew/close-out-run.ts:42,48`, `findCrewLine(lastTurn)`), not a commit; pushed/handoff checks look at the worker's own `origin/<branch>` (:70-80). Adding a Crew line to the commit (later brief advice) doesn't fix it. Also phase 11's first worker never got a close-out line in `run.md` Log.
- Run file: `<crm>/.git/spec-board/crew/run.md`; Log says nothing about the engine branch — the whole integration scheme lived in `--note` text.

### "Files to touch" is not machine-parseable
- Consistent label `**Files to touch:**` + `-` bullets (75 plugin phase files; CRM phases at lines 7–14), 7 use `## Files to touch`.
- Bullet content mixes full paths, globs, brace sets, paths relative to an unstated root ("playground `lib/…`"), several paths per bullet, and pure prose ("their tests", "generated SDKs"). CRM lane rule lived in prose: `technical.md:90-91` "Phase 4 owns every shared file; lanes edit only their globs."

### Branch/tree naming for parallel phases
- `specOfBranch` (`T/trees/naming.ts:12-16`) strips only `-pr-<g>`: `feat/x-ph-3` → spec `x-ph-3`. `feat/x` collides with "spec with no `pr:`" (`naming.ts:7-10`, `T/plan/docs/pr-doc.ts:11-12,54-56`, `T/pr/groups.ts:4`).
- Callers and what breaks: `T/pr/resolve.ts:35-37,59-68` (spec from head branch; multi-group spec fails hard at :65), `T/pr/actions/open.ts:44,97-106` (branch = `treeName`, refuses other branch at :99, base fixed at :100), `T/plan/docs/pr-doc.ts:54-60` + `T/plan/pr-sync.ts:54-55,74` (a `feat/x` PR matches no group → record writes refused, board on), `T/context/babysit-pack.ts:16-27`, `T/board/tree-target.ts:16-23`, `T/board/render-person.ts:36`, `T/plan/tidy-holders.ts:62-63` (`feat/<spec>*` glob also matches another spec named `x-…`), `T/trees/prune.ts:80,92-98`, `T/crew/close-out-run.ts:47-53,77-78`, `T/launch/place-for-launch.ts:18-22`, `T/board/joins.ts:38-39`. Neutral: `T/context/infer-spec.ts`, `T/workspaces/list.ts:42-46`. Docs: `SKILL.md:122,124`, `handoff.md:151`, `babysit.md:39,111`.
- Two trees for one PR group: folders don't collide (`T/trees/acquire.ts:35-38` `freeFolder` adds `-2`), but the branch does (git checks a branch out once) and `findTree` (`T/trees/find.ts:32-39`) returns the existing tree → `place.ts:73-75` busy → launch refuses (`place-for-launch.ts:21`). No fallback.
- Tests pinning naming/placement: `tests/trees-naming.test.ts:5-25`, `trees-find.test.ts:15,26-44`, `trees-acquire.git.test.ts:11-64`, `trees-placement-ports.test.ts:7,22,36,46`, `trees-command.git.test.ts:53`, `board-lanes.test.ts:22-25`, `pr-resolve.test.ts:70-112`, `pr-open.git.test.ts:49-153` (`--base main` :80, wrong-branch :137), `board-render-person.test.ts:21-30,54-55`, `plan-pr-observed.test.ts`, `crew-tick-step.test.ts:71-74`.

### Spec-level overseer marker (board record off)
- Storage accepts `<spec>#overseer` as is: file `claims/<spec>#overseer.json` (`T/claims/store.ts:37-38`), ref `refs/spec-claims/<spec>/overseer` (`T/claims/remote-payload.ts:19-21`), create-only lease push (`T/claims/remote.ts:22-28`, `remote-take.ts:37-55`), released by session id (:57-69). Independent of the record.
- Refused at validation: `T/claims/rules.ts:48-57` `takeRefusal` → "phase overseer is not in x" (called `T/commands/claim.ts:119-122`); needs a branch beside the `pr-<g>` case (:51-52).
- Liveness `T/claims/rules.ts:36-42`: main checkout never `gone`, `overseer` never `done` → a dead overseer's claim stays `closed` forever (`removable` keeps only done/gone, `claim.ts:214-217`); shows under needs-you (`T/board/attention.ts:62-67`). `claimStatus` doesn't follow `parkedJobId`; `whoseRun` (`T/crew/overseer.ts:11-20`) does.
- Side effects of a claim in the main checkout: **context inference** (`T/context/claims-here.ts:15-22`, `T/commands/context.ts:75-78`) — a spec-less `/spec resume|status|execute` in main would infer the overseer's spec with hint phase `overseer` (highest risk); board flight row with phase `overseer` (`T/board/flight.ts:22-44`); `blockingClaim` marks main held (`T/trees/find.ts:93-95`, low impact); takeover prints "their work is on main".
- Phase-write guard: `phaseWriterFor` (`T/plan/phase-writer.ts:55-61`) has `deps.env` (session id via `T/sessions/own.ts:3-5`), `deps.runner`, `projectDir`; no claims/sessions. `T/claims/live.ts:20-29` shows how to load them from `{runner, claudeHome, env}`. Outputs: refuse via `refusingWriter` (`invalid`), warn via `PhaseOutcome.notice` (:22-29,73-76). All ten `phase` commands go through `T/commands/phase/context.ts:24-37`. Direct Edit of a spec-in-files phase file bypasses it.
- Recognising a worker from a tool process: brief text is system-prompt only (invisible to tools); launch sets only `CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF=1` (`T/launch/background.ts:15`); title `<spec> execute <phase>` (`T/launch/title.ts:19-25`, spoofable); `run.md` `## Launched` ids (`T/crew/run-state.ts:17-21`) most reliable.

## Reuse
- The CRM brief's merge-back recipe (merge integration in, verify, fast-forward push to it, retry on refusal) — proven under real races; `T/core/land-on-ref.ts` lease/retry for a tool version.
- Per-group trees/branches stay; only their base and push target change. `freeFolder` for extra folders.
- Claim store/refs for the marker; `whoseRun` parked-id following; `PhaseOutcome.notice` for a warning.

## Still open (none blocking create; decisions for its Decide stage)
- Collision judgement: no parser is possible on today's prose → overseer judges from "Files to touch" + code-map and records it as `same-files-as` / `pr:` via `phase set`, or a structured field is added. Decision.
- Spec docs on an integration branch: per-phase publish-docs duplicates rows on main (root cause above). Who publishes docs, and when, under an integration branch. Decision.
- Branch scheme: integration branch name that `specOfBranch` parses and doesn't collide with `feat/<spec>`; phase-level vs group-level trees. Decision.
- Workers creating branches from their own HEAD (the #1295 cause): forbid in the crew worker rules, or have tools refuse a split-off branch. Decision.
- Close-out: read the Crew line and pushed state from the integration branch, not the worker transcript/own branch. Build.
