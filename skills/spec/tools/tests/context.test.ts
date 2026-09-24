import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { contextPack, parseContextRequest } from "../commands/context";
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
      work: "Wrap the HTTP client",
      deliverables: { checked: 1, unchecked: 2 },
      nextRun: ["replayer", "race harness"],
    });
  });

  test("reads a goal that wraps across lines and stops at the next label", () => {
    const entry = "**Goal:** One pure policy decides\nwhether a user can be deleted.\n**Depends on:** none\n";
    expect(summarizePhaseEntry(entry).goal).toBe("One pure policy decides\nwhether a user can be deleted.");
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
});

describe("parseContextRequest", () => {
  test.each([
    [["execute", "checkout", "phase", "3a"], { mode: "execute", name: "checkout", hint: "phase 3a" }],
    [["checkout resume"], { mode: "resume", name: "checkout" }],
    [["checkout"], { mode: "route", name: "checkout" }],
  ])("%p", (argv, expected) => {
    expect(parseContextRequest(argv)).toEqual({ hint: undefined, ...expected });
  });
});

describe("contextPack", () => {
  let project = "";
  const spec = () => join(project, "docs", "specs", "checkout");
  const write = (path: string, text: string) => {
    mkdirSync(join(spec(), path, ".."), { recursive: true });
    writeFileSync(join(spec(), path), text);
  };

  beforeAll(() => {
    project = mkdtempSync(join(tmpdir(), "spec-pack-"));
    write("CLAUDE.md", "---\nstatus: active\ncreated: a\nupdated: b\n---\n# Checkout\n");
    write("progress.md", "- [x] Phase 1 — Harness → `phases/phase-1.md`\n- [ ] Phase 2 — Aggregate → `phases/phase-2.md`\n");
    write("phases/phase-1.md", "**Goal:** Harness.\n- [x] done\n");
    write("phases/phase-2.md", "**Goal:** Aggregate.\n## Deliverables\n- [ ] model `src/Checkout.java`\n");
    write("ledger/INDEX.md", "- `gotcha-a.md` — [phase 2] — lock by pk\n- `gotcha-b.md` — [phase 1] — old\n");
    write("ledger/gotcha-a.md", "---\nkind: gotcha\napplies-to: [phase 2]\ncreated: a\n---\n");
    write("ledger/gotcha-b.md", "---\nkind: gotcha\napplies-to: [phase 1]\ncreated: a\n---\n");
    write("code-map.md", "| File | Why |\n|---|---|\n| `src/Checkout.java` | aggregate |\n| `src/Other.java` | x |\n");
  });

  afterAll(() => rmSync(project, { recursive: true, force: true }));

  test("resume pack carries the status table and the next chunk", () => {
    const pack = contextPack(project, { mode: "resume", name: "checkout" });
    expect(pack).toContain('<spec-pack spec="checkout" mode="resume">');
    expect(pack).toContain("| 2 — Aggregate | 🟢 active | Aggregate. |");
    expect(pack).toContain("### Next chunk: Phase 2 — Aggregate\n- model src/Checkout.java");
  });

  test("execute pack scopes ledger rows and code-map rows to the picked phase", () => {
    const pack = contextPack(project, { mode: "execute", name: "checkout" });
    expect(pack).toContain("Picked: Phase 2 — Aggregate (first ready phase)");
    expect(pack).toContain("`gotcha-a.md`");
    expect(pack).not.toContain("`gotcha-b.md`");
    expect(pack).toContain("| `src/Checkout.java` | aggregate |");
    expect(pack).not.toContain("src/Other.java");
  });

  test("execute pack tells the agent when the picked phase is a task phase", () => {
    const codePack = contextPack(project, { mode: "execute", name: "checkout" });
    expect(codePack).not.toContain("Task phase");
    write("phases/phase-2.md", "---\ncode: false\n---\n**Goal:** Aggregate.\n## Deliverables\n- [ ] model `src/Checkout.java`\n");
    const taskPack = contextPack(project, { mode: "execute", name: "checkout" });
    expect(taskPack).toContain("Task phase (code: false): follow execute.md → Task phases.");
    write("phases/phase-2.md", "**Goal:** Aggregate.\n## Deliverables\n- [ ] model `src/Checkout.java`\n");
  });

  test("packs carry the playbooks that match the spec, and execute adds the one its phase names", () => {
    const playbooks = join(project, "docs", "specs", "_playbook");
    mkdirSync(playbooks, { recursive: true });
    writeFileSync(join(playbooks, "billing.md"), "---\nmatch: { domain: [billing] }\n---\nCharge in cents.\n");
    writeFileSync(join(playbooks, "video.md"), "---\nmatch: { tags: [video] }\n---\nRecord hooks last.\n");

    expect(contextPack(project, { mode: "resume", name: "checkout" })).not.toContain("### Playbooks");
    write("CLAUDE.md", "---\nstatus: active\ncreated: a\nupdated: b\ndomain: [billing]\n---\n# Checkout\n");
    expect(contextPack(project, { mode: "resume", name: "checkout" })).toContain("### Playbooks (docs/specs/_playbook)\n#### billing\nCharge in cents.");

    write("phases/phase-2.md", "---\nplaybook: video\n---\n**Goal:** Aggregate.\n## Deliverables\n- [ ] model `src/Checkout.java`\n");
    const execute = contextPack(project, { mode: "execute", name: "checkout" });
    expect(execute).toContain("#### billing\nCharge in cents.");
    expect(execute).toContain("#### video\nRecord hooks last.");

    write("phases/phase-2.md", "**Goal:** Aggregate.\n## Deliverables\n- [ ] model `src/Checkout.java`\n");
    write("CLAUDE.md", "---\nstatus: active\ncreated: a\nupdated: b\n---\n# Checkout\n");
    rmSync(playbooks, { recursive: true });
  });

  test("prints nothing for modes without a pack or unknown specs", () => {
    expect(contextPack(project, { mode: "prep", name: "checkout" })).toBe("");
    expect(contextPack(project, { mode: "resume", name: "missing" })).toBe("");
  });
});
