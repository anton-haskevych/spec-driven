# Phase 8 recon — card documents, card add/update/source/list, cover (deliverables 1–3)

Paths under `skills/spec/tools/`. One wave of two explorers; the seam was clear after it.

## The seam

- **Validation registry** `plan/kinds.ts:16-48`: rows for spec, phase, pr, question only. Any other path is
  `no document kind is stored at this path` (:47). Cards, sources and tags need rows; `RECORD_PATH`
  (`record/plan-writes.ts:22`) already allows nested folders (`cards/0/c1.json`, `sources/c1/a.json`).
- **Direct writes** (not queued): `gitRecordPort(git)` (`record/ref.ts:19`, undefined without origin) then
  `writeRecord(port, plan, { validate: validateRecordDoc })` (`record/write.ts:23-45`). Shortest callers:
  `commands/join-from-tree.ts`, `commands/plan.ts:34-70` (offline reported as `never queued`, :66).
  `writeRecord` refuses a newer layout with `OLDER_PLUGIN` (write.ts:36). `withMeta` (write.ts:48-50) rewrites
  `meta.json` to `RECORD_LAYOUT` on every landed write.
- **The switch** is read from the default branch by `boardBase(git, branch, neverQueued)` (`plan/board-base.ts`),
  which also refuses offline. `card add` reuses it.
- **Views** `record/view.ts:7-12`: `paths()` (all, sorted), `version(path)` (blob id, usable as `ifVersion`),
  `doc(path)`. Listing pattern: `questions/read.ts:6-14` (filter `paths()` by prefix, read, drop failures).
  Command-side read: `readPlansAt(projectDir, runner, now)` + `recordViewOf(plans.record)`
  (`commands/question.ts:35-39`); `plans.record.kind === "newer"` → `OLDER_PLUGIN`.
- **Registration**: `spec.ts:42-72` `COMMANDS`; `tests/commands-table.test.ts` pins usage text and that every
  `spec.ts <name>` named in a skill `.md` exists. The Codex pilot's check is an allow-list
  (`runtime/workflow-capabilities.ts:18-36`): a new `card` command is refused there with no change.
- **Settings** `playbook/settings.ts`: `BoardSetting` is `{ record }` (:26-28), `SECTION_KEYS.board = ["record"]`
  (:65); `board.people` today is `board has an unknown key: people` (:160). `describeSettings` (:109-127) ends
  with `board record on`.
- **Doctor**: project-wide checks are in `commands/doctor.ts:40` (`projectIssues`), taking only `projectDir`;
  `plans` (local copy, `readLocalPlans`) is in scope at :27. Per-spec record checks: `doctor/joined.ts`.
- **Packs**: `commands/context.ts:108-116` `withBoardLines(plans, spec, body, memory)` prepends record lines
  above every mode's body; it has the joined plan and `recordViewOf(plans.record)`.
- **Ref grammar** `graph/relations.ts:34-46`: `parseRef(raw) → { target, phases? }`, `phasesInRef(ref, ids)`;
  `graph/checks.ts` `relationIssues` resolves against `loadNodes(projectDir, plans)` with the wording
  `no spec named X` / `X has no phase P (phases: …)`.

## The Academy rules (CRM `ops/src/academy-board/board-schema.ts`, skill SKILL.md)

- card: title, status todo|doing|done, assignee (Anton|Taras), note, due YYYY-MM-DD, priority `urgent`, items,
  order, tags (free strings), project. source: card_id, role origin|mention|evidence, app, person, occurred_at
  (`^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?([+-]\d{2}:\d{2}|Z))?$`), quote, ref, ref_url. group: per-tag
  details keyed by slug (lowercase, non-alphanumerics → `-`), priority P0–P3.
- Cross-document (`doc-reads.ts:42-58`): a source's card must exist; a `c\d+` card not done has exactly 1 origin.
- Contact details: prose only (skill :161, "phone numbers, emails"); no regex exists. Ours is new.

## Reuse

- `readObject`, `oneOf`, `requiredText`, `optionalText`, `stringArray`, `withoutUndefined` (`core/read-fields.ts`,
  `plan/docs/read.ts`); `readSchedule`/`isCalendarDay`/`PRIORITIES` (`core/schedule.ts`); `samePerson`
  (`core/people.ts:17`); `boardBase`; `parseRef`/`phasesInRef`; `oneLine` (`plan/ops/phase-state.ts`).
- Tests: `viewOf`, `fakeRecord` (`tests/fake-record.ts`), `joinedRepo` + `isolatedRunner` for real-git command
  tests (`tests/question-command.test.ts`).

## Testing-issue estimate

- No fixture gap: pure readers and plans test on `viewOf`; the command tests on `joinedRepo` (real git), whose
  settings need `board.record: on` on main for `boardBase` — check `tests/joined-repo.ts` sets it.
- `playbook/settings.ts` is 186 lines: adding `people` keeps it under 250.
- `plan/kinds.ts` grows by three rows; path helpers for cards go in `cards/paths.ts`, not kinds.ts.
- `PRIORITIES` gains `p0`: `priorityRank` shifts ranks by one (relative order unchanged); check tests that
  pin the `not one of p1, p2, p3` wording.
