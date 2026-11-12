---
date: 2026-11-11
wave: 2
lens: implementation
slug: store-seam-packaging
brief: product-brief.md
---

# Recon Wave 2 — store, seam, packaging

*Source of record — do not edit. Distilled into the spec by `/spec create`.*

Three agents: where a shared record can live (measured from the CRM repo, read-only), how narrow the plugin's
read/write seam is, and what the plugin can ship. Plugin paths are relative to `skills/spec/`; `T/` is `tools/`;
`R/` is the plugin repo root. CRM paths are relative to `~/IdeaProjects/crm/`.

## Verified

### Three homes for the shared record
| | (a) separate GitHub repo of JSON docs | (b) custom refs in the project repo | (c) commits onto the default branch |
|---|---|---|---|
| Read | head check 0.7–1.0 s (ETag, 304 free), then one GraphQL read of every doc; cold CLI 6–12 s | `ls-remote` / fetch of refs ~1 s | `fetch origin main` 0.7–1.2 s, then the base cache |
| Write | Git Data API: tree, commit, PATCH ref | `push --force-with-lease`, one ref per record | scratch-index commit, plain push |
| Conflict unit | per doc (blob sha `if_version`); branch moved → re-plan | per ref | whole branch (non-fast-forward) |
| Retries / timeout | 5, no timeout (`ops/src/academy-board/board-store.ts:4,17-29`) | 3, 10 s (`T/claims/remote-take.ts:23`, `remote.ts:15`) | 2, none (`T/core/land-on-main.ts:20,28-47`) |
| A write triggers in CRM | nothing | nothing (0 deployments, statuses, runs on a claim sha) | no workflow; Vercel: 9 of 10 projects skip, `crm-dance-landing` runs a full production deploy |
| Offline | `busy`, nothing written | claim kept locally, says so (`T/commands/claim.ts:22-23`) | `failed`, nothing written |
| Local grep copy | none | `refs/spec-claims-remote/*`; payload is a commit message, not files | base cache `<common>/spec-board/base/<sha>` (44 MB, 6,032 files, 2 kept) |
| Auth on another machine | `gh` token with access to that repo | push rights to origin | push rights to origin and main |
| Volume now | 514 docs, 228 KB, 124 commits in 9 days | 47 claim refs of 2,327 refs | below |

- **CRM main, last 7 days:** 508 first-parent commits (31–113 a day); **419 (82%) touch only `docs/specs/`**, 384 titled
  `docs(spec)`. Each is a production deploy of `crm-dance-landing`. Branch protection: no required reviews or checks;
  direct pushes succeed.
- **CRM volume if everything joined:** 407 + 16 spec folders, 2,369 phase files, 256 backlog files in `docs/specs/_backlog`.
- **The slow part of the Academy read is the all-docs GraphQL query** in a fresh process; the long-running MCP server
  caches by head sha (`board-store.ts:11-15`).
- **Not verified:** whether cloud or sandboxed sessions can push custom refs, push main, or reach `gh`.

### The read seam
- **Phase state has one funnel:** `T/core/spec-state.ts:49` `specStateFrom(spec, read)` behind a swappable
  `ReadSpecFile` (`:39,:41,:45`). Reached by context (`T/commands/context.ts:78`), ready (`ready.ts:11`), board / list /
  crew tick (`T/mainline/load.ts:70`, `T/workspaces/views.ts:15`), doctor (`T/doctor/run.ts:34`), trees place
  (`T/trees/place-system.ts:72`), pr open / resolve (`T/pr/actions/open.ts:35`, `resolve.ts:46`), every phase command,
  the spec-file hook (`T/hooks/spec-file-check.ts:65`), codex entry (`T/runtime/codex/entry.ts:94`), claim rules
  (`T/claims/rules.ts:39,52`).
- **Spec metadata has a second funnel:** `T/graph/nodes.ts:30` `loadNodes` (status, priority, due, owner, focus, ship).
- **Readers that bypass them:** a second `progress.md` parser in `graph/nodes.ts:42` (feeds `isFinished` `:69`);
  `doctor/run.ts:66-70`; `phases/validate.ts:19`; raw text reads in `tick.ts:63`, `deployed.ts:30`, `split.ts:55`,
  `add.ts:38`; `CLAUDE.md` frontmatter read directly in `trees/place-system.ts:84`,
  `commands/crew/launch-session.ts:77`, `focus/plan.ts:34`, `playbook/playbooks.ts:45`, `doctor/spec-meta.ts:9`;
  `pr-opening.md` PR numbers in `board/load.ts:95`, `pr/resolve.ts:49`, `pr/actions/merge.ts:86`,
  `commands/gates.ts:19`, `doctor/run.ts:41`.
- **Packs print the raw phase entry text** (`T/context/packs.ts:74`).

### The write seam
- **Plan, then apply, already:** `EditPlan` of `{file, text}[]` applied only by `applyEdits`
  (`T/core/apply-edits.ts:15-31`), called from `commands/phase.ts:58,74,90,108,127,146` and `commands/lessons.ts:59,73`;
  validated by diffing doctor issues before and after (`phases/validate.ts:14-16`). `landOnMain` takes a one-file
  `MainEditPlan` (`core/land-on-main.ts:23`), used by owner / ship, focus, deployed --land and the merge line.
- **Every plan is whole-file text made by line surgery**, not a structured change: `tick.ts:38-39`,
  `progress-lines.ts:6,21-26`, `deployed.ts:16`, `move-items.ts:33-46`, `frontmatter-patch.ts`, `merge-line.ts:21-34`.
- **Outside the funnel:** `publish/publish.ts:37-56` (whole-file 3-way merge, no field awareness),
  `scripts/spec-bump.sh:2`.
- **Mode files tell Claude to hand-edit state:** `update.md:131-142` (spec `status:`), `update.md:187` (pointer),
  `review.md:291-295` ("edit the spec files directly… deliverables that changed"), `create.md:105,200,287-290`
  (`progress.md`, phase frontmatter), `create.md:142` / `prep.md:84` (status), `execute.md:171-173` (`pr-opening.md`
  boxes and the `PR #n · branch` line), `idea.md:10,30-31` and `prep.md:101` (backlog files and `git mv` to `_closed/`),
  plus every "Without Bun" path (`execute.md:133,231`, `update.md:43,49,60`, `list.md:64`, `status.md:19-29`).

### Deliverable items
- Addressed by `#N` among open items (shifts after each tick) or a text prefix (`T/phases/locate.ts:19-61`); evidence is
  a ` — ` suffix (`T/core/checkbox.ts:4-28`); gates by a `Gate:` prefix (`T/core/gate.ts:8,16`); split moves by `#N`
  (`move-items.ts:33-46`).
- **Counting rules disagree:** `phase-entry.ts:21-23` counts the `Deliverables` section only; `tick.ts:41` and
  `doctor/phases.ts:19` count every checkbox.
- Phase ids are text with an index fallback (`phase-title.ts:6,16-20`, `spec-state.ts:61`); new ids from `ids.ts:6-16`.

### What the plugin can ship
- **Zero runtime dependencies** (`R/ROADMAP.md:19-21`; `R/package.json:9-12` has dev types only; every non-test import
  is `node:*`). No zod, no HTTP or GitHub client. No path ships third-party code to the installed copy.
- **No MCP server, no `Bun.serve`, no port, no HTML, no Artifact publishing** anywhere in the plugin. The one detached
  process is `T/trees/prune-background.ts:8-35`.
- **Hooks:** only PreToolUse and PostToolUse on `Write|Edit|MultiEdit`, registered by `SKILL.md:6-18`, live only after
  `/spec` is invoked. No SessionStart hook, by rule (`R/ROADMAP.md:13-18`). Skill load injects the context pack
  (`SKILL.md:25-32`).
- **Settings:** `T/playbook/settings.ts:49-56` knows `docs`, `pr.*`, `checks.external`, `gates.*`, `deploy.*`, `crew.*`;
  unknown keys are problems (`:93,153`). Per-clone settings in `<common>/spec-driven/local.md`
  (`T/trees/local-settings.ts:22-24`). **No key names an external repository.**
- **GitHub access:** `gh` only, no auth check; first stderr line becomes the reason (`T/pr/gh-lists.ts:25-30`); the
  board degrades to "PRs unavailable" (`T/board/render.ts:143`).
- **Codex `local-pilot`** has no claims, board, push, PR, launch or crew (`capabilities.md:14-16`,
  `T/runtime/workflow-capabilities.ts:18-35`); cloud sessions get no hooks or load-time commands.
- **Output reaches the user** as a fenced block Claude prints (`list.md:7-30`, `T/commands/board.ts:42,55`).
- **Release:** `R/scripts/version.py:35-44` bumps three manifests; CI runs tests and typecheck; releases listed in
  `R/ROADMAP.md:29+`.

### Test surface
- 205 test files, all flat in `T/tests/`; `bun test` with `bunfig.toml` root `skills`.
- Fixtures: `tests/tree.ts:15` `createTree().spec(name, files)` (real files), `tests/git-repo.ts:17,80`
  (`isolatedRunner`, `repoWithOrigin`), `tests/board-factories.ts:28` `specFixture`, `tests/factories.ts:12-66`
  (`phaseLine`, `phaseState`, `specMeta`, `specNode`, `phaseEdges`), `tests/context-fixture.ts:11`.
- 42 test files mention `progress.md`; 59 import the parsing modules; 50 contain checkbox text.

### Project lessons that apply
- `gotcha-code-under-test-that-spawns-git-needs-the-isolated-runner` — any store test that runs git uses `isolatedRunner`.
- `gotcha-publish-docs-skips-deleted-files` — shared state can't be changed by deleting a spec doc.
- `gotcha-remote-claims-never-read-as-done` — claim status is computed on local claims only (`claims/rules.ts:39`).
- `gotcha-board-lane-json-is-the-whole-model` — a filter must change `Board` itself.
- `gotcha-session-files-span-every-repo` — scope live sessions by this repo's worktree paths.
- `gotcha-trees-place-reads-pr-group-from-base` — a regroup that exists only on a branch is ignored by `trees place`.
- `gotcha-squash-merged-branch-is-not-an-ancestor` — match a merged PR by `headRefOid`.
- `gotcha-runner-stdout-is-decoded-text` — never parse byte-framed output through `Runner`.

## Reuse
- `ReadSpecFile` injection in `specStateFrom`: the phase-state seam already takes a reader.
- `EditPlan` + `applyEdits` + before/after doctor diff: the validation step is reusable; the plan shape is not
  (text, where a shared record needs field changes).
- `gh api` as the HTTP client the plugin already depends on (no new dependency).
- Lease-push and scratch-index commit code for homes (b) and (c).
- `tests/factories.ts` and `board-factories.ts` in-memory builders for a store-backed `SpecState`.
- `<common>/spec-board/` as the home of any local mirror, next to `base/` and `claims/`.

## Still open
- **Which home** for the record: (a), (b) or a mix. A decision for the spec, with the table above as its evidence.
- **How the page is served** by a plugin with no server and no dependencies.
- **Cloud and sandboxed sessions:** auth for any of the three homes is unverified.
- **Specs not yet on the record** must keep working from files; the dual path lives at `specStateFrom`'s reader and
  `loadNodes`.
- **The hand-edit instructions** in eight mode files are writes no tool sees; each needs a tool call or a rule.
