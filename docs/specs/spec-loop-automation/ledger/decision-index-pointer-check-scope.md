---
kind: decision
applies-to: [phase 5, 10]
created: 2026-09-30T17:34:55-07:00
---

# The doctor resolves only `docs/specs/_ledger/…` rows; other cross-spec INDEX rows stay unchecked

`checkLedgerIndex` errors on a spec INDEX row whose `docs/specs/_ledger/…` target is missing from the repo root. Every other row containing `/` is left alone.

Why: the first version resolved every `/` row from the repo root and gave CRM 6 false errors. CRM's spec INDEXes hold cross-spec rows written relative to `docs/specs/` (`ci-cost-trim/ledger/gotcha-x.md`) or to the ledger folder (`../../other/ledger/INDEX.md`). There is no single base, so we don't guess.

Effect on CRM (checked 2026-09-30 against 2.30.0): no new errors; 5 new warnings, all real. `_ledger/INDEX.md` lacks rows for 3 lessons and lists `gotcha-integration-tests-share-the-demo-tenant.md` twice; `migration-engine/ledger/INDEX.md` lists one gotcha twice. Phase 10 can fix them with `lessons add` or a hand edit.
