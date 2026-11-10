import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { contextPack } from "../commands/context";
import { createContextFixture, contextDeps } from "./context-fixture";
import { stubRunner } from "./stub-runner";

describe("contextPack without a spec name", () => {
  const { project, cleanup } = createContextFixture();
  afterAll(cleanup);

  const noneHeld = () => new Map<string, string>();
  const changed = (...paths: string[]) =>
    stubRunner([
      [["git", "rev-parse", "--show-toplevel"], { stdout: `${project}\n` }],
      [["git", "status"], { stdout: paths.map((path) => ` M ${path}\0`).join("") }],
    ]);

  test("loads the one spec the changed files belong to and says it was inferred", async () => {
    const pack = await contextPack(project, { mode: "execute", hint: "1" }, contextDeps({ runner: changed("docs/specs/checkout/progress.md") }));
    expect(pack).toStartWith('<spec-pack spec="checkout" mode="execute" inferred="true">');
    expect(pack).toContain("inferred from changed files");
    expect(pack).toContain('Picked: Phase 1 — Harness (from your hint "1")');
  });

  test("names the candidates when changed files span several specs", async () => {
    mkdirSync(join(project, "docs/specs/billing"), { recursive: true });
    writeFileSync(join(project, "docs/specs/billing/CLAUDE.md"), "---\nstatus: active\n---\n");
    const runner = changed("docs/specs/checkout/progress.md", "docs/specs/billing/CLAUDE.md");
    expect((await contextPack(project, { mode: "resume" }, contextDeps({ runner })))).toBe("No spec named; the changed files belong to billing, checkout. Ask which one.");
    rmSync(join(project, "docs/specs/billing"), { recursive: true });
  });

  test("says so when nothing in this tree points at a spec", async () => {
    expect((await contextPack(project, { mode: "status" }, contextDeps({ runner: changed("src/app.ts") })))).toBe(
      "No spec named, and nothing in this tree points at one (no claim here, no changed spec files). Infer it from the conversation.",
    );
  });

  test("execute with nothing to go on applies the top ready row, after the conversation, and says so", async () => {
    const pack = await contextPack(project, { mode: "execute" }, contextDeps({ runner: changed("src/app.ts") }));
    expect(pack).toContain("If this conversation already resumed or executed a spec, use that one.");
    expect(pack).toContain("board ready --for me --json --local");
    expect(pack).toContain("take its top row (focus specs rank first)");
    expect(pack).toContain("run its `next` sub-command for that spec (with the phase for execute)");
    expect(pack).toContain("`Say if wrong:`");
    expect(pack).not.toContain("on a yes");
  });

  test("a claim taken in this tree names the spec and its phase, ahead of changed files", async () => {
    const claimsHere = () => [{ spec: "checkout", phase: "1" }];
    const pack = await contextPack(project, { mode: "execute" }, contextDeps({ runner: changed("docs/specs/billing/x.md"), readHeld: noneHeld, readClaimsHere: claimsHere }));
    expect(pack).toStartWith('<spec-pack spec="checkout" mode="execute" inferred="true">');
    expect(pack).toContain("inferred from this tree's claim on phase 1");
    expect(pack).toContain("Picked: Phase 1 — Harness");
  });

  test("a named hint still wins over the claimed phase", async () => {
    const pack = await contextPack(project, { mode: "execute", hint: "2" }, contextDeps({ runner: changed(), readHeld: noneHeld, readClaimsHere: () => [{ spec: "checkout", phase: "1" }] }));
    expect(pack).toContain('Picked: Phase 2 — Aggregate (from your hint "2")');
  });

  test("every inferred pack tells the session that a spec from the conversation wins", async () => {
    const pack = await contextPack(project, { mode: "resume" }, contextDeps({ runner: changed("docs/specs/checkout/progress.md") }));
    expect(pack).toContain("If this conversation already resumed or executed another spec, use that one instead");
  });

  test("stays silent outside git and for modes that never infer", async () => {
    const runner = stubRunner([]);
    expect((await contextPack(project, { mode: "execute" }, contextDeps({ runner })))).toBe("");
    expect((await contextPack(project, { mode: "review" }, contextDeps({ runner })))).toBe("");
    expect((await contextPack(project, { mode: "route" }, contextDeps({ runner })))).toBe("");
    expect((await contextPack(project, { mode: "babysit" }, contextDeps({ runner })))).toBe("");
    expect(runner.calls).toHaveLength(1);
  });
});
