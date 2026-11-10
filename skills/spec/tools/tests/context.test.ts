import { describe, expect, test } from "bun:test";
import { summarizePhaseEntry } from "../core/phase-entry";
import { parsePhaseTitle } from "../core/phase-title";
import { parseLedgerIndex, rowsForPhase } from "../context/ledger-scope";
import { phaseStatuses, renderStatusTable } from "../context/status-table";
import { phaseState } from "./factories";

const phase = (done: boolean, checked: number, unchecked: number) =>
  phaseState({ done, summary: { deliverables: { checked, unchecked }, nextRun: [] } });

describe("phaseStatuses", () => {
  test("follows status.md: done, WIP, one active, then pending", () => {
    const statuses = phaseStatuses([phase(true, 3, 0), phase(false, 0, 2), phase(false, 1, 2), phase(false, 0, 4)]);
    expect(statuses).toEqual(["✅ done", "🟢 active", "🟡 WIP (1/3)", "⬜ pending"]);
  });

  test("an open phase with a due day shows it in its status cell", () => {
    const table = renderStatusTable({
      spec: { name: "checkout", dir: "/specs/checkout" },
      hasProgress: true,
      phases: [phaseState({ schedule: { due: "2026-10-01", problems: [] } })],
    });
    expect(table).toContain("| 🟢 active · due 2026-10-01 |");
  });

  test("Delivers shows the Outcome's first sentence, else the Goal", () => {
    const summary = (extra: object) => ({ deliverables: { checked: 0, unchecked: 1 }, nextRun: [], goal: "`spec.ts push` refspec", ...extra });
    const table = renderStatusTable({
      spec: { name: "checkout", dir: "/specs/checkout" },
      hasProgress: true,
      phases: [
        phaseState({ id: "1", summary: summary({ outcome: "Work never sits only on the laptop. Risk: pushing is outward-facing." }) }),
        phaseState({ id: "2", summary: summary({}) }),
      ],
    });
    expect(table).toContain("| Work never sits only on the laptop |");
    expect(table).toContain("| `spec.ts push` refspec |");
  });

  test("a WIP phase claims the focus, so a later untouched phase is pending", () => {
    expect(phaseStatuses([phase(false, 1, 1), phase(false, 0, 1)])).toEqual(["🟡 WIP (1/2)", "⬜ pending"]);
  });
});

describe("parsePhaseTitle", () => {
  test.each([
    ["Phase 2b-pre — Enrollment seam → phases/phase-2b-pre.md", "2b-pre", "Enrollment seam"],
    ["Phase 5.5: Dark launch gate", "5.5", "Dark launch gate"],
    ["Track B1 backend", "7", "Track B1 backend"],
  ])("%p", (title, id, name) => {
    expect(parsePhaseTitle(title, "7")).toEqual({ id, name });
  });
});

describe("summarizePhaseEntry", () => {
  test("reads the goal, the first guidance sentence, deliverable counts and the next open run", () => {
    const entry = [
      "**Goal:** Ship the harness.",
      "## Deliverables",
      "- [x] fault client",
      "- [ ] replayer",
      "- [ ] race harness",
      "## Implementation guidance",
      "Wrap the HTTP client. Then add the replayer.",
    ].join("\n");
    expect(summarizePhaseEntry(entry)).toEqual({
      goal: "Ship the harness.",
      outcome: undefined,
      work: "Wrap the HTTP client",
      deliverables: { checked: 1, unchecked: 2 },
      nextRun: ["replayer", "race harness"],
    });
  });

  test("reads a goal that wraps across lines and stops at the next label", () => {
    const entry = "**Goal:** One pure policy decides\nwhether a user can be deleted.\n**Depends on:** none\n";
    expect(summarizePhaseEntry(entry).goal).toBe("One pure policy decides\nwhether a user can be deleted.");
  });

  test("reads the plain-words Outcome paragraph under the Goal", () => {
    const entry = "**Goal:** `spec.ts push` refspec.\n\n**Outcome:** Work never sits only on the laptop. Risk: pushing is outward-facing.\n\n**Files to touch:**\n- a.ts\n";
    expect(summarizePhaseEntry(entry).outcome).toBe("Work never sits only on the laptop. Risk: pushing is outward-facing.");
  });
});

describe("rowsForPhase", () => {
  const index = [
    "- `gotcha-a.md` — [general] — a",
    "- `decision-b.md` — [phase 3] — b",
    "- `decision-c.md` — [phase 2, 4] — c",
    "- `gotcha-d.md` — [phase 2+] — d",
    "- `gotcha-e.md` — [phase 5+, load-bearing] — e",
    "- `decision-f.md` — [phase 4] — f [superseded → decision-c.md]",
    "- `odd-format.md` has no tags",
  ].join("\n");

  test("keeps general, load-bearing, exact, enumerated and open-ended matches, load-bearing first", () => {
    const parsed = parseLedgerIndex(index);
    expect(parsed.unparsed).toBe(1);
    expect(rowsForPhase(parsed.rows, "4").map((row) => row.file)).toEqual([
      "gotcha-e.md",
      "decision-c.md",
      "gotcha-d.md",
      "gotcha-a.md",
    ]);
  });

  test("an open-ended letter phase does not reach back to an earlier letter", () => {
    const parsed = parseLedgerIndex("- `gotcha-x.md` — [phase 7b+] — x\n");
    expect(rowsForPhase(parsed.rows, "7a")).toEqual([]);
    expect(rowsForPhase(parsed.rows, "7c").map((row) => row.file)).toEqual(["gotcha-x.md"]);
    expect(rowsForPhase(parsed.rows, "9.10").map((row) => row.file)).toEqual(["gotcha-x.md"]);
  });
});
