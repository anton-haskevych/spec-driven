import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { contextPack } from "../commands/context";
import { createContextFixture, contextDeps } from "./context-fixture";

describe("contextPack", () => {
  const { project, spec, write, cleanup } = createContextFixture();
  afterAll(cleanup);

  test("packs carry a Settings line only when the project has settings.md", async () => {
    expect((await contextPack(project, { mode: "resume", name: "checkout" }, contextDeps()))).not.toContain("Settings:");
    const settings = join(project, "docs", "specs", "_playbook", "settings.md");
    mkdirSync(join(settings, ".."), { recursive: true });
    writeFileSync(settings, "---\npr:\n  draft: false\ngates:\n  per-commit: quick\n  ci-triage: ci\n---\n");
    const line = "Settings: docs on branch · PRs ready · merge: ask the user · each commit: gate quick · CI triage: gate ci";
    expect((await contextPack(project, { mode: "resume", name: "checkout" }, contextDeps())).split("\n\n")[1]).toBe(line);
    expect((await contextPack(project, { mode: "execute", name: "checkout" }, contextDeps()))).toContain(`(first ready phase)\n\n${line}`);
    rmSync(settings);
  });

  test("resume pack carries the status table and the next chunk", async () => {
    const pack = await contextPack(project, { mode: "resume", name: "checkout" }, contextDeps());
    expect(pack).toContain('<spec-pack spec="checkout" mode="resume">');
    expect(pack).toContain("| 2 — Aggregate | 🟢 active | Aggregate. |");
    expect(pack).toContain("### Next chunk: Phase 2 — Aggregate\n- model src/Checkout.java");
  });

  test("execute shows its phase's, its PR group's and the legacy note whole and names other phases' by path; resume shows them all", async () => {
    write("phases/phase-2.md", "---\npr: A\n---\n**Goal:** Aggregate.\n## Deliverables\n- [ ] model `src/Checkout.java`\n");
    write("in-flight/phase-1.md", "deploy pending for phase 1");
    write("in-flight/phase-2.md", "half-wired aggregate");
    write("in-flight/pr-A.md", "PR gate needs the deployment evidence");
    write("in-flight.md", "legacy note");
    const execute = await contextPack(project, { mode: "execute", name: "checkout" }, contextDeps());
    expect(execute).toContain(
      [
        "### In-flight (raw)\n#### in-flight/phase-2.md\nhalf-wired aggregate",
        "#### in-flight/pr-A.md\nPR gate needs the deployment evidence",
        "#### in-flight.md\nlegacy note",
        `Other phases' pending notes, not this chunk's. Read one only when the work touches that phase:\n- ${join(spec(), "in-flight/phase-1.md")}`,
      ].join("\n\n"),
    );
    expect(execute).not.toContain("deploy pending for phase 1");
    const resume = await contextPack(project, { mode: "resume", name: "checkout" }, contextDeps());
    for (const note of ["#### in-flight/phase-1.md\ndeploy pending for phase 1", "#### in-flight/phase-2.md\nhalf-wired aggregate", "#### in-flight/pr-A.md\nPR gate needs the deployment evidence", "#### in-flight.md\nlegacy note"]) {
      expect(resume).toContain(note);
    }
    rmSync(join(spec(), "in-flight"), { recursive: true });
    rmSync(join(spec(), "in-flight.md"));
    write("phases/phase-2.md", "**Goal:** Aggregate.\n## Deliverables\n- [ ] model `src/Checkout.java`\n");
    expect((await contextPack(project, { mode: "execute", name: "checkout" }, contextDeps()))).toContain("### In-flight (raw)\n(none)");
  });

  test("execute and resume packs show the picked phase's park question, then its answer", async () => {
    write("in-flight/phase-2.md", "## Needs you\n- Parked 2026-10-13T10:00:00-07:00: Grid or list? · recommend: grid\n");
    const asked = 'Parked: Phase 2 asks "Grid or list?" · recommend grid. Unanswered: ask the user; a crew worker hands off.';
    expect((await contextPack(project, { mode: "execute", name: "checkout" }, contextDeps()))).toContain(`Picked: Phase 2 — Aggregate (first ready phase)\n\n${asked}`);
    expect((await contextPack(project, { mode: "resume", name: "checkout" }, contextDeps()))).toContain(asked);
    write("in-flight/phase-2.md", "## Needs you\n- Parked 2026-10-13T10:00:00-07:00: Grid or list?\n  - Answered 2026-10-13T11:00:00-07:00: grid\n");
    expect((await contextPack(project, { mode: "execute", name: "checkout" }, contextDeps()))).toContain('Answered 2026-10-13T11:00:00-07:00: "grid" (Phase 2 asked "Grid or list?"). Build on it.');
    rmSync(join(spec(), "in-flight"), { recursive: true });
  });

  test("execute and resume packs carry a Stale line only when CLAUDE.md has stale:", async () => {
    expect((await contextPack(project, { mode: "execute", name: "checkout" }, contextDeps()))).not.toContain("Stale:");
    write("CLAUDE.md", "---\nstatus: active\ncreated: a\nupdated: b\nstale: phase 2 predates the ledger move\n---\n# Checkout\n");
    const line = "Stale: phase 2 predates the ledger move (propose `/spec review` to re-plan before building on it)";
    expect((await contextPack(project, { mode: "execute", name: "checkout" }, contextDeps()))).toContain(`Picked: Phase 2 — Aggregate (first ready phase)\n\n${line}`);
    expect((await contextPack(project, { mode: "resume", name: "checkout" }, contextDeps())).split("\n\n")[1]).toBe(line);
    write("CLAUDE.md", "---\nstatus: active\ncreated: a\nupdated: b\n---\n# Checkout\n");
  });

  test("execute pack scopes ledger rows and code-map rows to the picked phase", async () => {
    const pack = await contextPack(project, { mode: "execute", name: "checkout" }, contextDeps());
    expect(pack).toContain("Picked: Phase 2 — Aggregate (first ready phase)");
    expect(pack).toContain("`gotcha-a.md`");
    expect(pack).not.toContain("`gotcha-b.md`");
    expect(pack).toContain("| `src/Checkout.java` | aggregate |");
    expect(pack).not.toContain("src/Other.java");
  });

  test("packs skip a ready phase another session holds and say so", async () => {
    write("progress.md", "- [x] Phase 1 — Harness → `phases/phase-1.md`\n- [ ] Phase 2 — Aggregate → `phases/phase-2.md`\n- [ ] Phase 3 — Views → `phases/phase-3.md`\n");
    write("phases/phase-2.md", "---\nneeds: [1]\n---\n**Goal:** Aggregate.\n## Deliverables\n- [ ] model `src/Checkout.java`\n");
    write("phases/phase-3.md", "---\nneeds: [1]\n---\n**Goal:** Views.\n## Deliverables\n- [ ] render\n");
    const held = () => new Map([["checkout#2", "checkout execute 2"]]);
    try {
      expect((await contextPack(project, { mode: "execute", name: "checkout" }, contextDeps({ readHeld: held })))).toContain(
        "Picked: Phase 3 — Views (first ready phase; skipped 2 (in flight: checkout execute 2))",
      );
      expect((await contextPack(project, { mode: "resume", name: "checkout" }, contextDeps({ readHeld: held })))).toContain(
        "### Next chunk: Phase 3 — Views\n- render\nSkipped: 2 (in flight: checkout execute 2)",
      );
      const allHeld = () => new Map([["checkout#2", "s2"], ["checkout#3", "s3"]]);
      expect((await contextPack(project, { mode: "execute", name: "checkout" }, contextDeps({ readHeld: allHeld })))).toContain(
        "Every ready phase is in flight in another session: 2 (in flight: s2), 3 (in flight: s3). Tell the user and stop.",
      );
    } finally {
      write("progress.md", "- [x] Phase 1 — Harness → `phases/phase-1.md`\n- [ ] Phase 2 — Aggregate → `phases/phase-2.md`\n");
      write("phases/phase-2.md", "**Goal:** Aggregate.\n## Deliverables\n- [ ] model `src/Checkout.java`\n");
      rmSync(join(spec(), "phases/phase-3.md"));
    }
  });

  test("a hinted phase is picked even when another session holds it; claim take guards it", async () => {
    const pack = await contextPack(project, { mode: "execute", name: "checkout", hint: "2" }, contextDeps({ readHeld: () => new Map([["checkout#2", "s2"]]) }));
    expect(pack).toContain('Picked: Phase 2 — Aggregate (from your hint "2")');
  });

  test.each(["phase 1", "phase1", "phase-1", "1"])("execute pack honours the hint %p", async (hint) => {
    const pack = await contextPack(project, { mode: "execute", name: "checkout", hint }, contextDeps());
    expect(pack).toContain(`Picked: Phase 1 — Harness (from your hint "${hint}")`);
  });

  test("execute pack tells the agent when the picked phase is a task phase", async () => {
    const codePack = await contextPack(project, { mode: "execute", name: "checkout" }, contextDeps());
    expect(codePack).not.toContain("Task phase");
    write("phases/phase-2.md", "---\ncode: false\n---\n**Goal:** Aggregate.\n## Deliverables\n- [ ] model `src/Checkout.java`\n");
    const taskPack = await contextPack(project, { mode: "execute", name: "checkout" }, contextDeps());
    expect(taskPack).toContain("Task phase (code: false): follow execute.md → Task phases.");
    write("phases/phase-2.md", "**Goal:** Aggregate.\n## Deliverables\n- [ ] model `src/Checkout.java`\n");
  });

  test("packs carry the playbooks that match the spec, and execute adds the one its phase names", async () => {
    const playbooks = join(project, "docs", "specs", "_playbook");
    mkdirSync(playbooks, { recursive: true });
    writeFileSync(join(playbooks, "billing.md"), "---\nmatch: { domain: [billing] }\n---\nCharge in cents.\n");
    writeFileSync(join(playbooks, "video.md"), "---\nmatch: { tags: [video] }\n---\nRecord hooks last.\n");

    expect((await contextPack(project, { mode: "resume", name: "checkout" }, contextDeps()))).not.toContain("### Playbooks");
    write("CLAUDE.md", "---\nstatus: active\ncreated: a\nupdated: b\ndomain: [billing]\n---\n# Checkout\n");
    expect((await contextPack(project, { mode: "resume", name: "checkout" }, contextDeps()))).toContain("### Playbooks (docs/specs/_playbook)\n#### billing\nCharge in cents.");

    write("phases/phase-2.md", "---\nplaybook: video\n---\n**Goal:** Aggregate.\n## Deliverables\n- [ ] model `src/Checkout.java`\n");
    const execute = await contextPack(project, { mode: "execute", name: "checkout" }, contextDeps());
    expect(execute).toContain("#### billing\nCharge in cents.");
    expect(execute).toContain("#### video\nRecord hooks last.");

    write("phases/phase-2.md", "**Goal:** Aggregate.\n## Deliverables\n- [ ] model `src/Checkout.java`\n");
    write("CLAUDE.md", "---\nstatus: active\ncreated: a\nupdated: b\n---\n# Checkout\n");
    rmSync(playbooks, { recursive: true });
  });

  test("a heavy execute pack stays under the 30K tool-output limit: lessons as pointers, playbooks clipped", async () => {
    const ledger = join(project, "docs", "specs", "_ledger");
    const playbooks = join(project, "docs", "specs", "_playbook");
    mkdirSync(ledger, { recursive: true });
    mkdirSync(playbooks, { recursive: true });
    const summary = "Lock the checkout row by primary key before reading totals. ".repeat(8);
    for (let n = 1; n <= 60; n++) {
      const lesson = `---\nkind: gotcha\npaths: [src/**]\nseen-in: [checkout]\n---\n# Checkout lesson ${n} about locking, retries and totals\n\n${summary}\n`;
      writeFileSync(join(ledger, `gotcha-checkout-${n}.md`), lesson);
    }
    for (const name of ["billing", "tax", "refunds"]) {
      writeFileSync(join(playbooks, `${name}.md`), `---\nmatch: { domain: [billing] }\n---\n${"Charge in cents. ".repeat(250)}\n`);
    }
    write("CLAUDE.md", "---\nstatus: active\ncreated: a\nupdated: b\ndomain: [billing]\n---\n# Checkout\n");

    const pack = await contextPack(project, { mode: "execute", name: "checkout" }, contextDeps());
    expect(pack.length).toBeLessThan(30_000);
    expect(pack).toContain("### Project lessons for this phase's files (60 match, most-seen first)");
    expect(pack).toContain("- Checkout lesson 1 about locking, retries and totals (`gotcha-checkout-1.md`, seen in 1 spec)");
    expect(pack).not.toContain("Lock the checkout row");
    expect(pack).toMatch(/\n\d+ more lessons match; the edit hook shows each before its file changes, or run `spec\.ts lessons recall <file…>`\./);
    expect(pack).toContain("[clipped at 3000 characters; read docs/specs/_playbook/ for the rest]");

    write("CLAUDE.md", "---\nstatus: active\ncreated: a\nupdated: b\n---\n# Checkout\n");
    rmSync(ledger, { recursive: true });
    rmSync(playbooks, { recursive: true });
  });

  test("babysit pack lists the PR group's phases and sends the session to babysit.md", async () => {
    write("phases/phase-1.md", "---\npr: A\n---\n**Goal:** Harness.\n- [x] done\n");
    write("phases/phase-2.md", "---\npr: A\n---\n**Goal:** Aggregate.\n## Deliverables\n- [ ] model `src/Checkout.java`\n");
    const pack = await contextPack(project, { mode: "babysit", name: "checkout", hint: "A" }, contextDeps());
    expect(pack).toContain('<spec-pack spec="checkout" mode="babysit">');
    expect(pack).toContain("babysit.md");
    expect(pack).toContain("### PR group A · branch feat/checkout-pr-a\n- [x] 1 — Harness\n- [ ] 2 — Aggregate");
    expect(pack).toContain("Open phases in group A: 2.");
    expect((await contextPack(project, { mode: "babysit", name: "checkout", hint: "Z" }, contextDeps()))).toContain("No PR group Z in checkout; its groups: A.");
    expect((await contextPack(project, { mode: "babysit", name: "checkout" }, contextDeps()))).toContain("No PR group named; its groups: A.");
    write("phases/phase-1.md", "**Goal:** Harness.\n- [x] done\n");
    write("phases/phase-2.md", "**Goal:** Aggregate.\n## Deliverables\n- [ ] model `src/Checkout.java`\n");
  });

  test("prints nothing for modes without a pack or unknown specs", async () => {
    expect((await contextPack(project, { mode: "prep", name: "checkout" }, contextDeps()))).toBe("");
    expect((await contextPack(project, { mode: "resume", name: "missing" }, contextDeps()))).toBe("");
  });

});
