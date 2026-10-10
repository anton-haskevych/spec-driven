---
kind: gotcha
paths: [skills/spec/tools/pr/actions/gh-writes.ts, skills/spec/tools/pr/gh.ts]
created: 2026-10-10T16:17:24-07:00
seen-in: [pr-babysit]
---

# A failed `gh api` call still prints valid JSON: check the exit code, read the status from stderr

On a 4xx `gh api` exits 1 but prints GitHub's error body (`{"message": "...", "status": "409"}`) on stdout, and `gh: <message> (HTTP 409)` on stderr. A reader that only parses stdout (`GhClient.call`, `pr/gh.ts`) takes the error body for an answer. Writes go through `ghWrites` (`pr/actions/gh-writes.ts`), which branches on the exit code first and takes the status from the body's `status`, else the `(HTTP nnn)` suffix; a success also has to say so (`merged: true` for a merge), not just parse.
