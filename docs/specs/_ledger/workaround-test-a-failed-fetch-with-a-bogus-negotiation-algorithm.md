---
kind: workaround
paths: [skills/spec/tools/tests/**]
created: 2026-11-13T16:18:40-08:00
seen-in: [fast-tests]
---

# To test a fetch that fails while origin answers, set `fetch.negotiationAlgorithm=bogus`

`git config fetch.negotiationAlgorithm bogus` in the clone makes `git fetch` die (`fatal: unknown fetch negotiation
algorithm 'bogus'`, exit 128) while `git ls-remote` still answers. That is the one path to `fetchRecordTip`'s `failed`
outcome (`record/ref.ts:57-58`: fetch failed, ls-remote found the ref); unset it to reset.

A missing origin path fails both commands (offline), and a bad `remote.origin.fetch` refspec breaks ls-remote too.
Probed on git 2.54, 2026-11-13; used by `tests/record-ref.git.test.ts` (`breakFetch`).
