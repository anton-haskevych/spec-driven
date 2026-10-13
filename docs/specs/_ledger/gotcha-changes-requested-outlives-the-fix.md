---
kind: gotcha
paths: [skills/spec/tools/board/**, skills/spec/tools/pr/**, skills/spec/oversee-crew.md, skills/spec/babysit.md]
created: 2026-10-12T22:45:30-07:00
seen-in: [oversee-crew-spec]
---

# A PR's `reviewDecision` stays `CHANGES_REQUESTED` after the fix is pushed: act once per review, by its REST id

GitHub keeps a PR's `reviewDecision` at `CHANGES_REQUESTED` until the reviewer submits a new review or
dismisses the old one; pushing the fix changes nothing. Anything that acts on that state (the board's
`pr-changes` row, the overseer's relaunch) must remember which review it already acted on. Key on the
review's numeric id from `gh api repos/{owner}/{repo}/pulls/<n>/reviews`: that id is what inline review
comments carry as `pull_request_review_id`. `gh pr view --json reviews` gives GraphQL node ids, which match
nothing in the REST comments.

Found while building the overseer's after-review step (oversee-crew-spec phase 2, `oversee-crew.md` §4).
