---
kind: gotcha
paths: [skills/spec/tools/pr/**]
seen-in: [pr-babysit]
created: 2026-10-10T15:39:09-07:00
---

# `gh run list` can't tell a ready_for_review run from a synchronize run: key on run ids

`gh run list --json` (and the REST runs list) gives `event: pull_request` for every pull_request action; the action (`opened`, `synchronize`, `ready_for_review`) is not a field. To find the run one action started, list the head's run ids just before the action and treat the ids that appear after it as its runs (`pr/actions/ready-race.ts`).

Bit phase 4 of pr-babysit: the plan said "confirm a ready_for_review run for that SHA exists", which no field can confirm. Timestamps are the other option and need the local clock to agree with GitHub's; ids don't.
