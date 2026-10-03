---
kind: gotcha
paths: [skills/spec/tools/launch/**]
seen-in: [spec-board]
created: 2026-10-02T17:04:22-07:00
---

# iTerm scripting: write into the session you created, find its tab by session id, and don't name it

Hold the tab `create tab` returns and `write text` into `current session of` that tab, then `select` the tab
that was in front before. `current session of current window` is whatever tab is in front at that instant,
so a second launch, or the user clicking a tab, gets the line instead. iTerm 3.6.11 can't read a tab's
`index` (`Can't get index of tab 9 of window id 26`, -1728), so loop over `tabs of <window>` and match
`unique ID of current session`. A scripted session `name` doesn't stick: the shell's title replaces it.

CRM 2026-10-02 20:08: two sessions launched at once, and one tab got `migration-data-storage 5: …` typed in
front of the other's `cd … && claude` line, so zsh failed on it. Verified by hand 2026-10-02: two concurrent
probes each landed in their own tab with the right number, and focus stayed put.
