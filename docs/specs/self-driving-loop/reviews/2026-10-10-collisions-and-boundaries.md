---
date: 2026-10-10
spec-phase-at-review: Phase 1 — Pick by number (no phase started)
agents: [principal-engineer, integration-architect, adversarial-tester, code-quality-reviewer, prior-art-reviewer]
slug: collisions-and-boundaries
---

# Review — collisions-and-boundaries

*Source of record — do not edit. Actionable findings are applied to the spec and ledger by the review run itself.*

## Summary

The spine holds: cheap prose first, one SKILL.md home per rule, remove shared writes instead of adding merge rules, reuse `withinBudget`. All five reviewers said fix-then-proceed. The defects cluster in two places.

1. **Phase 3's collision fixes didn't remove the collisions, and one removed a load-bearing write.** Per-phase sections in one `in-flight.md` still conflict whenever two sessions *add* a section (the common case; verified with a git merge in a scratch repo). Dropping the Spec-state refresh also drops the only writer of the open-PR link that `pr-status`, the board's FOCUS `merging` state and pr-babysit's fallback read (5 of 5 reviewers).
2. **Phase 1/4 rules were written against an imagined tool surface.** Board ready rows have no `title`, and `next` is `prep | create | execute` rather than always execute. Preflight's contract gives every decision a recommendation, so "auto-apply the recommended one" would apply every real fork. The hooks resolve the project from `payload.cwd`, so they have the same subfolder bug. Walking to the *nearest* `docs/specs` silently re-roots CRM `landing/` sessions away from the root settings. The 6K lessons cap can't bring the 47K pack under 30K (arithmetic).

Also folded in: Anton's instruction relayed from the prep session (review always follows create), and a live repro of the subfolder bug (`spec.ts claim list` run from `skills/spec/` → ENOENT on `.git/spec-board/base/<sha>/skills/spec/`).

## Forks put to the user

None. Every contradiction was a mechanism choice where one option met all reviewers' concerns. The release-version clash with pr-babysit crosses specs, but pr-babysit is held by a live session. This spec fixes its own side, and the other side is flagged in the report rather than edited here.

## Resolved by the synthesizer

- **In-flight: per-phase files, not sections.** The design table named files as "the later upgrade if sections still collide". The git test shows sections collide on append, so we take the upgrade now. `in-flight/phase-<id>.md` (or `in-flight/pr-<group>.md` for a PR-gate session) is deleted at a clean boundary. The legacy `in-flight.md` is still read.
- **Spec state: keep the one-time PR-link line.** Drop only the "phases done / left" prose. A link written once per PR doesn't collide. Choosing find-by-branch in the board instead would change pr-babysit's scope.
- **Project dir: outermost ancestor holding `docs/specs`, bounded by the git toplevel (`.git` dir or file).** Its listing already covers nested `*/docs/specs`. This rejects "nearest" (loses root settings) and "reuse `locateSpecFile`" (doesn't cover `landing/src` or `skills/spec/`).
- **Board rows: add `title` to `ReadyRow` (bump `BOARD_VERSION`), and launch `<row.next>`.** A `board next` text renderer was rejected: it is a new tool command, and the field alone stops the guessing.
- **Preflight: split *Decisions for you* into *Defaults applied* and *Forks for you*.** Execute applies the first and stops on the second. A fork is a decision that changes the phase Goal or Outcome, deletes or migrates data, changes an external contract, or moves scope between specs.
- **Bare number: it answers the most recent numbered list.** It launches only when that list is *Next sessions*. With no block in view, reprint the block and don't fall back to the board.
- **One-list rule: pr-babysit owns it** (its design.md:47-48). We keep only "print *Next sessions* after the PR question is answered".
- **Reports: Impact = the first sentence of the Outcome line of the phases moved, plus a number when measured.** Applies to end-of-chunk, handoff (once), standalone update and review, not resume or status. Babysit's report keeps its own shape.
- ***Say if wrong*: the rule is review.md §3's criteria lifted into SKILL.md, with the forks list as examples.** The draft-PR example is replaced. Opening a PR and the merge method are forks.
- **Pack: lessons render as one-line pointers inside a 3K budget, and playbooks are clipped at 3K.** A whole-pack test fixture must stay under 30K. The CRM max pack is measured before and after.
- **Release version is picked at merge**: main's minor + 1. Release steps move into pr-opening.md.
- **Review row after create:** create ends with `<spec> review` at row 1. The board gives a spec with phases, no `reviews/` folder and no ticked phase `next: review`.

## Findings

| # | Finding | Signal | Severity | Verified | Raised by | Recommendation |
|---|---|---|---|---|---|---|
| 1 | Dropping the §10 / handoff Spec-state refresh removes the only writer of the open-PR link (`pr/resolve.ts:14-31`, `board/focus.ts:127-139`, `board/load.ts:83-88`). pr-babysit phase 4 says "No Spec-state write at open"; design.md:28 assumed otherwise | consensus | high | verified (execute.md:156, resolve.ts, pr-babysit phase-4:24) | all five | Keep one `PR #<n> · <branch>` line written once at PR open; drop only phases done/left prose; fix design.md:28 |
| 2 | Per-phase sections in one `in-flight.md` conflict when two sessions add a section (empty file, marker, legacy block) | consensus | high | verified (scratch-repo merge: CONFLICT; separate files: clean) | principal, adversarial | Per-phase files `in-flight/phase-<id>.md`, deleted at clean boundary |
| 3 | Pack clips the whole in-flight file at 2,000 chars; other phases' notes push out the picked phase's and leak into its session | consensus | medium | verified (packs.ts:31,91-93) | adversarial, prior-art, principal | Pack reads only the picked phase's file (+ legacy file) |
| 4 | Section format underspecified (H2 template clash, id prefix matching, `<unknown>` section never cleared) | consensus | medium | verified (handoff.md:62-83) | adversarial, code-quality, prior-art | Superseded by #2 (files need no section parser) |
| 5 | New `checkInFlight` per-ticked-phase warning is wider than today's rule and flags legitimate deploy notes | consensus | medium | verified (doctor/phases.ts:29-33) | adversarial, integration | Keep today's rule: warn on pending in-flight files only when every phase is done; signature takes the files list; `doctor/run.ts` changes |
| 6 | Board `ReadyRow` has no `title`; the *Next sessions* template demands one, which drives guessing or per-row reads | consensus | medium | verified (model.ts:10-14,46-65) | code-quality, principal, prior-art | Add `title`, bump `BOARD_VERSION`, document fields in *Next sessions* step 1 |
| 7 | Ready rows have `next: prep|create|execute`; the reply rule hard-codes `launch execute` | consensus | medium | verified (model.ts:44) | principal, integration, adversarial | Launch `<row.next> <spec> [<phase>]` |
| 8 | Hooks resolve the project from `payload.cwd`, which follows `cd`; "hooks keep `process.cwd()`" is wrong; spec-file-check can block on unresolved refs from a subfolder | consensus | medium | verified (lesson-recall.ts:23, spec-file-check.ts:86) | code-quality, prior-art, integration, adversarial | `findProjectDir(payload.cwd ?? fallback)` in both hooks + tests |
| 9 | Nearest-`docs/specs` walk re-roots `landing/…` to `landing/`: loses `_playbook` settings (`docs: main` → branch), lessons, root specs; loud failure becomes silent misconfig | consensus | high | verified (spec-folders.ts:14-16, playbook/settings.ts:5; CRM layout per craft :106) | principal, integration, adversarial | Outermost ancestor within the git toplevel; check `docs/specs` before the `.git` stop; tests for nested roots and worktree `.git` file |
| 10 | Lessons cap 6K leaves the 46.9K max pack at ~35.2K, over the ~30K limit | consensus | high | verified (wave-1:69-70 arithmetic) | code-quality, adversarial | One-line lesson pointers, 3K budget; playbooks clipped 3K; whole-pack fixture test < 30K; measure CRM max |
| 11 | A bare "1" / "yes" with no block in view launches the board's top row; it collides with the PR question, review forks, resume's "Start?" and the board's two numbered lanes | consensus | high | verified (design.md:89; pr-babysit design:47-56; render.ts:61, render-focus.ts:14) | principal, integration, adversarial | Number answers the most recent numbered list; launches only when that is *Next sessions*; no board fallback (reprint) |
| 12 | Auto-applying preflight's *Decisions for you* applies every genuine fork: the contract recommends one for each | consensus | medium | verified (phase-preflight/SKILL.md:137-140) | integration, adversarial | Preflight splits Defaults applied / Forks for you; execute stops on forks |
| 13 | The one-list rule is already decided and scheduled by pr-babysit (design.md:47-48, phase 7) | consensus | medium | verified | prior-art, code-quality | Drop our copy; keep "print *Next sessions* after the PR question is answered" |
| 14 | Impact line rebuilds the phase Outcome line (create.md:282, phase-entry.ts:27, status.md:27, execute.md:157) | unique-insight | medium | verified | prior-art | Impact = Outcome first sentence of phases moved + a measured number |
| 15 | Header scope inconsistent: design includes status, technical excludes; resume has nothing to report; handoff would print it twice via update | consensus | low | verified (design.md:63, technical.md:14, handoff.md:19) | principal, integration, code-quality | Work reports only; handoff once; not resume/status; babysit keeps its shape |
| 16 | *Say if wrong* is a third "when to ask" rule and a closed list; its draft-PR example contradicts pr-babysit's PR question and `pr.merge` refusal | consensus | medium | verified (review.md:212-224, preflight:139-152, pr-babysit design:19,47,157) | prior-art, principal | Criteria in SKILL.md (from review.md §3), list as examples, new example, PR open + merge method are forks; review.md points at it |
| 17 | Release versions collide: pr-babysit hardcodes 2.42.0; self-driving's PRs likely ship first | unique-insight | high | verified (pr-babysit phase-7:39, pr-opening:6,16, technical:223) | integration | Version picked at merge (main's minor + 1); flag pr-babysit's hardcoded value to its session |
| 18 | Undeclared overlap: code-map empty (board ★ wrong), phase 3 `same-files-as: [2]` only, pr-babysit merge note only on phase 1 | consensus | medium | verified | integration, code-quality | Fill code-map; phase 3 `same-files-as: [1, 2]`; merge note on phase 3 |
| 19 | `OFFER_TOP_READY` in the pack still says offer-and-wait, contradicting execute.md:22's new rule | unique-insight | low | verified (commands/context.ts:28,57) | prior-art | Phase 1 changes the string and its test |
| 20 | Dropping per-session `updated:` changes `list table` membership (3rd sort key, top-30 cap), not just a tie-break; "create, review and a status change only" is wrong (create never calls it, prep does) | consensus | medium | verified (portfolio/order.ts:7-11, create.md:140, prep.md:38,101) | integration, code-quality, adversarial | State the list effect in the decision row; SKILL.md says "status change or a review/prep rewrite; never per session", no caller list |
| 21 | `spec-bump.sh` walk placement and test: the `cd` must sit in the name branch; the planned `schedule.test.ts` call only runs `--now` | consensus | low | verified (spec-bump.sh:28-45) | code-quality, integration, adversarial | Walk in the name branch; new `tests/spec-bump.test.ts` with `TZ` |
| 22 | SKILL.md restates rules phase 1/3 change: :32 (execute offers on a yes), :213 and :426 (in-flight overwritten) | unique-insight | low | verified | integration | Edit both |
| 23 | Release lines live in phase 3 (`needs: []`) so can finish before 1–2 | unique-insight | low | verified | integration | Move release into pr-opening.md pre-PR checks |
| 24 | Review always follows create: create's *Next sessions* listed execute rows and "I agree" launched phase 1 unreviewed | user (Anton, via prep session) | high | verified (create.md:376; claim `self-driving-loop#1 closed`, tree clean at b94e9eb) | — | create ends with `<spec> review` at row 1; board `next: review` for specs with phases, no `reviews/`, nothing ticked; wiring pin |
| 25 | Subfolder bug also breaks the board base cache path (`claim list` from `skills/spec/` → ENOENT on `.git/spec-board/base/<sha>/skills/spec/`) | unique-insight | medium | verified (live run this session) | synthesizer | Covered by `findProjectDir` in `spec.ts`; add a `claim list`/board-from-subfolder test |
| 26 | `findProjectDir` signature/stop order/test style underspecified; `docs/specs` literal duplicates `TOP_SPEC_ROOT` | unique-insight | low | verified (spec-folders.ts:14, tests/tree.ts) | code-quality | `findProjectDir(start, exists = existsSync)`, check `TOP_SPEC_ROOT` first, `createTree` tests |
| 27 | Pins only prove labels exist in SKILL.md, not that modes point at *Reports* | unique-insight | low | verified (skill-wiring.test.ts:101-112) | code-quality | Loop pin over execute/handoff/update/review |

## Rejected or unverified

- **Reuse `locateSpecFile` instead of a walk** (prior-art F9): it covers only cwds inside a spec folder; the live repro was `skills/spec/`, which is not one. Rejected.
- **`board next` text renderer** (prior-art F4): a new tool command; the `title` field fixes the guessing. Rejected for now.
- **Keep execute's offer-and-wait for a bare `/spec execute`** (adversarial F12): conflicts with Anton's standing rule. Claims already refuse a phase held by a live session. Rejected; the busy-tree case reports as is.
- **Sort load-bearing lessons first** (adversarial F7): project lessons have no load-bearing flag; recall's `seenIn` order stays. Rejected.
- **Derive the project from the path, preferring an outer root** (principal F4): converges with the outermost walk; superseded.
- **draft→active `updated:` race between two first-phase tabs** (adversarial F13): inferred and rare (once per spec). Not applied; noted.
- **Section-format fixes** (adversarial F5, prior-art F5, code-quality F5): superseded by per-phase files.
