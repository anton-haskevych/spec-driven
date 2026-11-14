# Phase 10aa browser check (2026-11-13)

This branch's page served over CRM's board (read-only preview on 127.0.0.1:41990, CRM's own page left
running), chrome-devtools MCP, 1440×900 and 390×844 (mobile emulation).

| Finding | Before | After |
|---|---|---|
| Done-but-open rows on Now | 22 | 0 (`now-1440.png`) |
| Count vs rows | 108 vs 3 + 126 more | 94 = 3 + 91 more; others fold apart (13) |
| Taras chips | "Taras Korpach 8", "taras 5", "Taras 8" | one "Taras 13", inside the box |
| Whole-spec covers | 30–49 squares per row | one bar `21/30` (`moving-1440.png`, `plan-1440.png`: 33 bars, 9 squares in panels) |
| c30 page | no done state, no note, "no deadline yet" | Done line with when/who/why, note, no deadline (`card-c30-1440.png`) |
| Plan | 4 empty tags, 20-line summaries | none; tallest summary 61 px (3 lines) |
| 390 px | — | no element past the viewport (`now-390.png`, `card-c32-390.png`, `plan-390.png`) |

Found during the check and fixed: c32's note runs ~2,000 characters, so a note over 280 opens from its
first four lines.
