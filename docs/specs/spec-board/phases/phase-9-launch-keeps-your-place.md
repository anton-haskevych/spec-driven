---
needs: []
pr: C
---

# Phase 9 — Launch keeps your place

**Goal:** launching a session opens a new tab at the end of the tab bar, titled with the session name,
without moving focus away from the tab Anton is working in, and the launch line says which tab it is.

**Outcome:** you keep switching with ⌘1…⌘8 as you do now. A launch never pulls you away from the tab you
were typing in, and two launches at once never type into the same tab · small change to the terminal
launcher · low risk.

**Evidence** (CRM transcripts 2026-10-02):
- 20:08: the phase 2 launch came out garbled. `migration-data-storage 5: Research captures leave the repo ·
  this worktree` was typed into the same new tab first, and zsh failed on it. The iTerm script creates a tab,
  then writes into `current session of current window`, which is whichever tab is in front at that moment.
- Anton: "I don't want to be teleported to one random page… and then just forget where I was originally."
  He keeps 1–8 tabs and switches with ⌘1, ⌘2…; background sessions (`claude --bg`) were rejected because
  they would replace that.
- Linux (Taras): `pickTerminal` knows only tmux, iTerm and Terminal.app. Under tmux, `new-window` without
  `-d` switches the client to the new window.

**Files to touch:**
- `skills/spec/tools/launch/terminal.ts` (`iTermScript`, tmux argv), `commands/launch.ts` (the report line)
- `skills/spec/tools/tests/launch.test.ts`

## Implementation guidance

- **iTerm:** remember the current tab, create the new tab, write the command into *that tab's* session
  (not `current session`), set its name, select the remembered tab again, and return the new tab's index.
- **tmux:** `new-window -d` so the client stays put.
- **Report:** `Launched: iTerm tab <n> (⌘<n>) — <title>`.
- Verify by hand in iTerm with two launches fired at the same moment, while typing in another tab.

## Deliverables

- [x] iTerm: the command goes into the tab the script created; focus returns to the tab you were in; the tab is titled by `claude -n` (iTerm resets a scripted session name)
- [x] tmux: the new window opens detached; Terminal.app no longer activates itself, and the window you were in stays in front
- [x] The launch line names the tab (`⌘<n>`); SKILL.md *Tools* → Launch says so
