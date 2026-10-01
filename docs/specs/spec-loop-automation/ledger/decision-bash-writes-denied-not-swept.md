---
kind: decision
applies-to: [phase 8]
superseded-by: decision-no-bash-guard.md
created: 2026-09-30T15:16:12-07:00
---

# Shell writes to spec files are denied up front, not validated afterwards

The draft ran the spec-file check after Bash calls mentioning `docs/specs`, validating files with mtime newer than a per-session stamp (first run: last 120 s). That lets the python/sed edit land first, keeps the habit the success metric targets, and blocks on files the session never wrote (anything a `git merge`/`pull`/`stash pop` touched since the stamp).

Decision: a PreToolUse `bash-guard.ts`, behind an `if:` pre-spawn filter on `docs/specs`, denies commands carrying a write signal (regexes copied from CRM `ops/src/hooks/pre-tool-use/protect-generated.ts:13-22`), exempts git verbs, and names the `spec.ts` writer or Write/Edit tool to use instead. No stamps, no sweep. The `spec.ts` writers validate their own plans in-process (`principle-writers-plan-validate-then-apply.md`).
