---
date: 2026-10-12
spec-phase-at-review: Phase 1 — The overseer, fast path (not started)
agents: [principal-engineer, integration-architect, adversarial-tester, code-quality-reviewer, prior-art-reviewer]
slug: state-homes-and-worker-lifecycle
---

# Review — state-homes-and-worker-lifecycle

*Source of record — do not edit. Actionable findings are applied to the spec and ledger by the review run itself.*

## Summary

The approach holds. All five reviewers said fix-then-proceed and none said rethink. One overseer that writes no code, background workers with a fixed launch brief, a per-spec ship mode, and a prose fast path hardened by tools later: this is the right shape. It sits on top of claims, trees, the board and babysit rather than beside them.

What's wrong clusters in two places.

1. **State has too many homes.**
   - `run.md` hand-keeps slots and babysitters that the roster plus claims already derive.
   - Questions live in three places across phases 1, 3 and 4.
   - Ship answers live in a clone-local file.
   - The handoff note duplicates `in-flight.md` and *Signal completion*.
   - Every duplicate drifts, which is the Oct 11 failure class the run file was meant to remove.
2. **The worker lifecycle is under-specified at its edges.** The two criticals are here.
   - Anton's file-guard hook blocks a worker in a worktree from writing the note under `<git-common-dir>`.
   - A babysitter idle on background `pr wait` likely reads `done`, and close-out would stop and remove it mid-CI.
   - Also: the Monitor watcher dies at its 30-minute cap, and SendMessage to `--bg` sessions was never probed.
   - Also: handoff §4 still ends a crew worker on a question, the pick rule takes task phases, and "parked" stop+rm leaves a dirty tree the next worker inherits.

Phase 1's hand-typed `claude --bg` line is the riskiest repeated step. Anton chose to pull two small tools into phase 1 (fork A). He also cut deploy babysitting from scope except for infra work (fork B), which removes the after-merge gate, its name clash with `gates.after-merge-main`, the `publish-docs` misuse, and the "never infer a deploy" reversal for every non-infra PR.

## Forks put to the user

**A. Phase 1 code scope.**
- **Positions:** keep phase 1 prose plus two small changes (Anton's earlier order decision), or pull in `launch … --bg --brief` (plus a `hold` word for babysit) and `phase deployed --land` (principal F5, prior-art F1/F7, integration F1/F6).
- **Recommendation:** pull them in.
- **Anton:** "Of course! your work is investment into the codebase. If you see some rotten pieces or bugs along the way, fix them as you go." → Pulled in. Fix-as-you-go is a standing rule for this spec.

**B. Deployed marker in auto mode.**
- **Positions:** let the after-merge gate prove the deploy and then mark it (recommended), or never auto-mark and keep update.md:49.
- **Anton:** "Nah, no need for gates like actual deploy. That might come later. For now babysitting the deploy is out of scope … UNLESS WE WORK WITH INFRA!"
- **Applied:**
  - Auto mode means merge, then report. No gate and no marker.
  - Deploy babysitting runs only when the PR's changed files match the project's declared infra paths. Settings `deploy: { paths: [globs], gate: <gates.md section> }`.
  - Only then does babysit work through the gate, and it marks the phases deployed only when the gate's last check passes.
  - This repo has no infra, so it gets no `## deploy` section.

## Resolved by the synthesizer

- **Waking the overseer** → one background-Bash roster wait that exits on the first change (`<id> <state>` or `<id> gone`) or after 1800 s. It replaces both the Monitor `while :` loop and the `/loop` + `ScheduleWakeup` heartbeat. This is the house wait primitive (pr-babysit `domain-claude-code-wait-primitives`, babysit.md:22-27). It has no 30-minute death and no duplicate wakes. Phase 4's `crew watch` becomes `crew wait`.
- **Slots** → derived from roster plus claims plus launch titles. `run.md` keeps only what nothing else knows: the overseer id, state, caps, ship answers, the question bookkeeping (asked and answered times), pending launches, and a capped log. Liveness comes from the existing session reader.
- **Handoff note file** → dropped.
  - Questions go where handoff already puts them: `in-flight.md` (committed and pushed, visible to every machine).
  - *Signal completion* gains the crew-only lines, and the overseer reads that block from the transcript before `rm`.
  - This removes the hook-blocked write (adversarial F1) with no new tool.
- **Questions and parking** → one home from phase 1: `in-flight.md` *Needs you*. Phase 3 adds a park marker in the same committed channel, not a local `crew/parked/` store, and drops `questions.ts`.
- **Ship answers** → phase 1 keeps them in `run.md` (one clone, acceptable for the fast path). Phase 2 adds `spec.ts ship <spec> <mode>`, which writes `ship:` onto main through `landOnMain`, the focus pattern, and only on Anton's word. The project default moves from `crew.ship` to `pr.ship` (phase 5).
- **Babysitter lifecycle** → its own rows in the state table. While its `pr-<group>` claim is live, `done` means waiting. It is finished only when the claim is released and `pr log` ends merged or stopped. Never stop a session whose claim is live.
- **Only launched ids** → the overseer acts only on ids it launched (recorded in `run.md` pending launches until a claim exists). Its scope uses `git worktree list` paths with a trailing `/`, not a root prefix.
- **`blocked` without `waitingFor`** → send "Hand off now" first (the session is alive and idle), then run close-out. Treat it as parked only when `in-flight.md` has a *Needs you* entry. Never stop+rm a session over a dirty tree.
- **Pick rule** → *Next sessions*' ready rows with `next: execute`, not `treeBusy`, not `readyIn`/`onlyOn`, not `code: false`, not parked, at most one worker per spec in phase 1 (docs conflicts until self-driving-loop phase 3). Drop the claim clause, since the board already excludes claimed rows.
- **Push rule** → decided once at §1 with a cheap PR lookup (`gh pr view <branch> --json state,isDraft`). An open non-draft PR means push at the end of the chunk. No PR, a draft or a failed lookup means push after each commit. Merged or closed means stop and report. A failed push never stops the worker, and the worker never uses `--no-verify`.
- **Server teardown** → crew workers only (brief-gated). Non-crew sessions stay as today, except for push-from-first-commit.
- **Fresh-tree bootstrap** → `launch --bg` passes the placement's `Fresh tree:` and `Setup failed:` lines into the brief.
- **Handoff §4** → a crew branch comes first: no §10 question and no *Next sessions*; end with `Handed off.`.
- **Overseer compaction** → rotate. On compaction it saves `run.md`, prints one line asking for a fresh `/spec oversee-crew`, and stops. Workers keep running. SKILL.md *Session lifecycle* names it.
- **Version** → picked at merge (self-driving-loop `decision-release-version-at-merge`). No hardcoded 2.43.0.
- **Hold-for-review GitHub writes** → `pr hold <n> --how-to-review <file>` through `GhWrites`, not raw `gh`. It is small, and phase 1 needs it.
- **Probes first** → the first phase-1 deliverable probes, on the installed CLI:
  - the `agents --json` state of a `--bg` session idle on a background shell, and whether that shell's exit re-invokes it;
  - SendMessage to a `--bg` session, by id;
  - the state after a `kill -9`;
  - `CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF`;
  - whether `claude rm` deletes the transcript.
- **Phase 4** → marked "re-plan after the first crew run". Point it at one idempotent `crew tick` that applies the fixed transitions.
- **Pause** → skips workers blocked on a prompt (they go to needs you) and lets babysitters finish. Workers are addressed by id only.
- **Concurrent infra deploys** → one infra deploy gate at a time per clone.

## Findings

Severity is the synthesizer's. ✔ = verified in code this session.

### Critical
1. **Worker can't write the handoff note under `.git/` from a worktree.**
   - Signal: unique-insight (adversarial F1). ✔ `~/.claude/hooks/pre-tool-use/files/file-guard.ts:35-45` denies Write/Edit to main-repo paths from a worktree; `lib/git/worktree.ts:72-77`.
   - Fix: drop the note file. Questions go to `in-flight.md`, the rest to the *Signal completion* lines (applied).
2. **Babysitters idle on `pr wait` would be closed out as `done`.**
   - Signal: consensus (adversarial F2, integration F3). ✔ babysit.md:18-27 (background wait, turn ends); technical.md state table had no babysitter row. The CLI state itself is unprobed, so it is added to the phase-1 probes.
   - Fix: babysitter rows, and a rule against stopping a session with a live claim (applied).

### High
3. **`run.md` duplicates the roster, claims and board.**
   - Signal: consensus (principal F1, code-quality F1, prior-art F3). ✔ `T/claims/store.ts:9-19`, `T/launch/title.ts:12-21`, `T/board/lanes.ts:84`.
   - Fix: slots are derived (applied).
4. **Questions and parked phases have three homes (phases 1, 3, 4).**
   - Signal: consensus (principal F2, code-quality F2, prior-art F6). ✔ technical.md:30,72-77; phase-3 3.3-3.5.
   - Fix: one home, `in-flight.md` (applied).
5. **Handoff §4 still ends a crew worker on a question or *Next sessions*, so a finished worker reads `blocked` and gets parked.**
   - Signal: consensus (integration F2, code-quality F4). ✔ handoff.md:177-180.
   - Fix: a crew branch first in §4 (applied).
6. **Answer 4 (hold) outside a crew merges anyway.**
   - Signal: unique-insight (integration F1). ✔ `T/launch/command-line.ts:20` refuses a 4th argument.
   - Fix: `launch babysit <spec> <group> hold` (applied, fork A).
7. **The Monitor watcher dies at 30 minutes and nothing re-arms it; the heartbeat is a second mechanism.**
   - Signal: consensus (integration F5, prior-art F2). ✔ pr-babysit `domain-claude-code-wait-primitives.md:19-20`.
   - Fix: background roster wait (applied).
8. **Watcher semantics.**
   - The issues: `comm -13` never reports a worker that disappeared; a failed poll replays every line; a null `.cwd` breaks jq; the scope is a root prefix, not `ownerOf`.
   - Signal: consensus (adversarial F3/F4, code-quality F9, prior-art F8, integration F13). ✔ technical.md:160-166; `gotcha-session-files-span-every-repo`.
   - Fix: a gone line, skip failed polls, launched ids only (applied).
9. **`blocked`-without-`waitingFor` → stop+rm leaves a dirty tree, which the next worker inherits.**
   - Signal: unique-insight (adversarial F5). ✔ `T/trees/find.ts:27-28,54-62` (a closed claim doesn't block; uncommitted changes count only with an idle session present).
   - Fix: "Hand off now" first (applied).
10. **The pick rule takes `code: false` task phases and `readyIn` rows.**
    - Signal: unique-insight (adversarial F6). ✔ `T/board/lanes.ts:145` sets `next: "execute"` unconditionally.
    - Fix: skip task phases and `readyIn`/`onlyOn` (applied).
11. **The ready-PR push exception keys on `pr status` verdicts.**
    - The issues: `none` = a ready PR without CI; no PR gives no verdict at all; `unknown` defers pushes; the check runs on every commit.
    - Signal: consensus (adversarial F8, integration F10, code-quality F8). ✔ execute.md:175; `T/pr/resolve.ts`.
    - Fix: decided once at §1 (applied).
12. **After merge, `phase deployed` + `publish-docs` publishes nothing.**
    - The issues: the marker is uncommitted; `publish-docs` pushes the merged branch back first; a commit in the merged tree breaks prune.
    - Signal: consensus (code-quality F5, integration F6, prior-art F1). ✔ `T/commands/publish-docs.ts:17`; `T/pr/actions/merge.ts:77` uses `landOnMain`.
    - Fix: `phase deployed --land`, only for infra deploys (applied, forks A and B).
13. **`gates.after-merge` is one word from `gates.after-merge-main`.**
    - Signal: consensus (all five). ✔ `T/playbook/settings.ts:29`.
    - Superseded: fork B replaces the key with `deploy: { paths, gate }`.

### Medium
14. **Babysit marking deployed reverses update.md:49 without a recorded decision.**
    - Signal: consensus (principal F3, prior-art F10). ✔ update.md:49.
    - Fix: per fork B, it is infra-only, the gate's last check must pass, and the decision is recorded and update.md amended (applied).
15. **Ship answers live in a clone-local file, and the project default sits under `crew:`.**
    - Signal: consensus (principal F4, prior-art F5). ✔ `T/focus/land.ts:16`.
    - Fix: phase 2 `spec.ts ship`; phase 5 `pr.ship` (applied).
16. **The hand-typed launch sits next to `spec.ts launch`.**
    - Signal: consensus (principal F5, prior-art F7). ✔ `T/commands/launch.ts:16-27`.
    - Fix: `launch --bg` (applied, fork A).
17. **SendMessage to `--bg` is unprobed; same-name relaunches risk the wrong session.**
    - Signal: consensus (integration F4, adversarial F12). ✔ no probe in `research/`.
    - Fix: probe, address by id only (applied).
18. **Fresh-tree bootstrap lines are lost when the overseer places first.**
    - Signal: consensus (integration F9, adversarial F13). ✔ `T/commands/trees.ts:47`.
    - Fix: pass them through the brief (applied).
19. **Server teardown for every session contradicts "nothing changes"; it also kills stacks that are deliberately left up.**
    - Signal: unique-insight (integration F11). ✔ `T/sessions/live.ts:18`.
    - Fix: crew-only (applied).
20. **Several workers on one spec conflict on spec docs.**
    - Signal: unique-insight (adversarial F10). ✔ handoff.md publish path.
    - Fix: one worker per spec in phase 1 (applied).
21. **Resume never relaunches half-done phases (in flight, not ready); a fresh start overwrites `run.md`.**
    - Signal: unique-insight (adversarial F9). ✔ `T/board/lanes.ts:84-87`.
    - Fix: resume relaunches stood-down slots first; start merges (applied).
22. **The overseer is designed to compact, against SKILL.md "compaction is not part of the flow".**
    - Signal: unique-insight (principal F6). ✔ SKILL.md:85.
    - Fix: rotate (applied).
23. **Raw `gh label`/`gh pr edit` against babysit's "every command is spec.ts".**
    - Signal: unique-insight (prior-art F9). ✔ babysit.md:9.
    - Fix: `pr hold` (applied).
24. **Hardcoded 2.43.0 against self-driving-loop's version-at-merge decision.**
    - Signal: unique-insight (integration F12). ✔ self-driving-loop `ledger/decision-release-version-at-merge.md`.
    - Fix: applied.
25. **Phase 4 lists `run-state.ts`/`handoffs.ts` with no deliverable.**
    - Signal: unique-insight (code-quality F6). ✔ phase-4 plan.
    - Fix: re-plan note; the handoff file is gone, and `run-state` is only needed if it survives the first run (applied).
26. **Doctor's settings check lists gate keys by hand; `context.ts:108` needs no edit.**
    - Signal: consensus (integration F7, code-quality F3). ✔ `T/doctor/settings.ts:20-22`.
    - Fix: the file list is corrected (applied).
27. **Concurrent infra deploys from two babysitters.**
    - Signal: unique-insight (adversarial F7). Inferred.
    - Fix: one infra gate at a time (applied).
28. **Hold-for-review has no path after a hand merge or "changes requested".**
    - Signal: unique-insight (adversarial F14). Inferred.
    - Fix: phase 2 deliverable for a `pr-changes` kind (applied). Hand merge: nothing to do for non-infra; infra gets an infra-only babysitter.

### Low
29. Adding `oversee-crew` to `SUB_COMMANDS` makes `launch oversee-crew <spec>` valid (code-quality F11). ✔ `T/launch/command-line.ts:21`. Fix: refuse it in `launchTarget` (applied).
30. `oversee-crew.md` may run 250–300 lines (code-quality F10). Fix: templates move to `crew-brief.md`; target under 200 (applied as guidance).
31. Run times have no date, and the log is unbounded (code-quality F1). Fix: ISO times and the last 30 log lines (applied).
32. The transcript read and CLI details are not isolated (principal F10). Fix: record the probed CLI version in the mode file; phase 4 isolates it (applied).
33. The two-overseer check could refuse its own session (adversarial F16). Fix: compare with `CLAUDE_CODE_SESSION_ID` (applied).
34. The pick rule's `owner:` check has no field on `ReadyRow` (integration F13). ✔ `T/board/model.ts:51-70`. Fix: dropped from phase 1 (applied).

## Rejected or unverified

- **The CLI state of a `--bg` session idle on a background shell** (finding 2's mechanism) is unverified. It goes into the phase-1 probes, and the safe rule (never stop a session holding a live claim) is applied regardless.
- **"Claude Code may prompt for writes under `.git/` even in bypass mode"** (adversarial F1, second half) is unverified. It is moot now that the note file is dropped.
- **Code-quality F7 (YAML frontmatter for the handoff note)** is superseded because the note file is dropped.
- **Code-quality F1's suggestion to put the whole run file in YAML frontmatter** is partly taken: the scalars stay in frontmatter. The question bookkeeping stays as markdown lines because `run.md` shrinks to a few fields and phase 4 is re-planned.
- **Prior-art F11 (call `sync-marketplace.sh` from this repo's deploy gate)** is moot: per fork B this repo has no deploy gate.
- **Principal F7 (`crew tick`)** is recorded as phase 4's direction, not built now.
- **Adversarial F16, second half (the crew updating its own plugin mid-run)** is moot without this repo's deploy gate.
