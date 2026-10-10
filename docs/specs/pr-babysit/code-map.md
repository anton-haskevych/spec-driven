# Code Map — PR Babysit

Load-bearing files this spec depends on or introduces. Only list files a new agent
needs to know exist to navigate the code — not every file that's touched.

## Introduced by this spec

| File | Role | Phase |
|------|------|-------|

## Existing files touched

| File | Why we care | Ledger |
|------|-------------|--------|
| `skills/spec/tools/pr/checks.ts` | `prState`, `summarizeChecks` — today's pr-status verdict | |
| `skills/spec/tools/board/joins.ts` | board's PR verdict (`toPrCell`, `nextFromChecks`) | |
| `skills/spec/tools/pr/gh.ts` | sync read client, 30-call budget, `PR_FIELDS`, `RUN_FIELDS` | |
| `skills/spec/tools/pr/resolve.ts` | PR from spec's Spec state (`SPEC_STATE`, `PR_LINK`) | |
| `skills/spec/tools/playbook/settings.ts` | `pr.draft`, `pr.merge`, `checks.external`, new `pr.triage` | |
| `skills/spec/tools/claims/store.ts` | per-phase claims; gains `pr-<group>` | |
| `skills/spec/execute.md` | §10 PR gate — the question lands here | |
| `skills/spec/handoff.md` | push/publish/claim release — the question lands here too | |

## External references

- CRM `.claude/rules/git-workflow.md` (draft-skip race, merge rule), `.github/workflows/ci.yml`, `e2e.yml`
- GitHub REST: `PUT /repos/{o}/{r}/pulls/{n}/merge`; async merge API (not used, see design.md)
