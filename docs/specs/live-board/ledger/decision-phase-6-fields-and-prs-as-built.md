---
kind: decision
applies-to: [phase 6+]
created: 2026-11-12T23:43:32-08:00
---

# Spec fields, PR documents and layout 2 as phase 6 built them

What later phases call, and where it differs from `technical.md`:

- **Four fields move, not ten.** Layout 2 moves `status`, `owner`, `focus` and `ship`: the fields a command
  writes (`spec-status`, `owner`, `focus`, `ship`). Relations (`part-of`, `needs`, `supersedes`, `related`),
  `stale` and `dropped` stay in `CLAUDE.md`: review, prep and create edit them by hand and no command writes
  them, so on the record a hand edit would change nothing. Preflight 2026-11-12, finding 3.
- **One copier** (`plan/upgrade.ts`): `specFieldsFromFiles(claudeMd)`, `prDocsFromFiles(spec, phases,
  prOpening, seen)`; `plan/upgrade-read.ts` `copyFromFolder` adds the file reads and asks `gh pr view` for
  the branch a bare `PR #n merged …` line lacks (merge lines never carry it). A number no group takes is
  named (`upgrade: PR #n matched no PR group …`), not guessed.
- **Join and `plan apply` stamp the fields** at creation, so a spec joined from layout 2 on needs no upgrade.
- **Upgrade on touch** (`plan/upgrade-send.ts` `upgradeIfBehind`): run by `withPlanNotice` before every
  phase write and by `writeJoinedField` before a field write. It is a direct `writeRecord`, never queued:
  offline it is skipped and the next online write upgrades (a queued upgrade showed as a second pending
  change). It reads the spec from the last fetched `origin/<default>`, else the checkout.
- **Readers.** `PlanSource.fields(spec)` gives the four fields only for a spec at layout 2;
  `graph/spec-fields.ts` `readSpecFields(dir, fromRecord?)` is the one reader (`loadNodes`, place's owner,
  crew's ship mode). `loadNodes(projectDir, plans)` takes the plan source, not `plans.marks`.
- **`meta.json`** is rewritten whenever its layout isn't this plugin's (`record/write.ts` `withMeta`).
- **PR documents** (`plan/docs/pr-doc.ts`): states add `closed`; a spec with no `pr:` has group `default` on
  `feat/<spec>`. `planChangePlan` creates one only for a group the plan didn't have.
- **Field writes** are a `field` intent (`plan/ops/field.ts`), queued offline like a tick; focus keeps its
  add/move/drop rules on the record.
- **`landOnMain`** runs through `landOnRef` with a branch port; `pushDeclined` (`core/remote-push.ts`) tells a
  server hook's refusal from a lost race, and `RefPort.push` may return `failed`.
