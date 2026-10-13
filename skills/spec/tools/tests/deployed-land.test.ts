import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { deployedOnMain } from "../phases/deployed-land";
import { phaseCommand } from "../commands/phase";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

const PROGRESS = (phaseOne: string) => `## Phases\n${phaseOne}\n- [ ] Phase 2 — Open → \`phases/phase-2-open.md\`\n`;
const TICKED = "- [x] Phase 1 — Aggregate → `phases/phase-1-aggregate.md`";
const SPEC = "docs/specs/billing";

describe("phase deployed --land (real git)", () => {
  let repo: TestRepo;

  beforeEach(() => {
    repo = repoWithOrigin("spec-deployed-land-");
    repo.write(`${SPEC}/CLAUDE.md`, "---\nstatus: active\n---\n# Billing\n");
    repo.write(`${SPEC}/progress.md`, PROGRESS(TICKED));
    repo.write(`${SPEC}/phases/phase-1-aggregate.md`, "- [x] a\n");
    repo.write(`${SPEC}/phases/phase-2-open.md`, "- [ ] b\n");
    repo.commitAll("billing");
    repo.git("push", "-q", "origin", "main");
  });
  afterEach(() => repo.cleanup());

  const onOrigin = () => repo.git("--git-dir", repo.origin, "show", `main:${SPEC}/progress.md`);
  const land = (phase: string) => deployedOnMain(repo.dir, { spec: "billing", phase, day: "2026-10-12" }, isolatedRunner);

  test("writes the marker on origin's main in one commit and leaves the checkout alone", async () => {
    const head = repo.git("rev-parse", "HEAD");
    expect(await land("1")).toMatch(/^Phase 1 marked deployed 2026-10-12 on main \([0-9a-f]{7}\)$/);
    expect(onOrigin()).toContain(`${TICKED} · deployed 2026-10-12\n`);
    expect(repo.git("--git-dir", repo.origin, "log", "-1", "--format=%s", "main")).toBe("[deployed] billing phase 1");
    expect(repo.git("rev-parse", "HEAD")).toBe(head);
    expect(repo.git("status", "--porcelain")).toBe("");
  });

  test("a phase main already marks is not marked twice", async () => {
    await land("1");
    expect(await land("1")).toBe("Phase 1 is already marked deployed");
  });

  test("a phase not ticked on main is refused and nothing is pushed", async () => {
    const tip = repo.git("--git-dir", repo.origin, "rev-parse", "main");
    expect(await land("2")).toBe("phase deployed: Phase 2 is not ticked; only a finished phase can be deployed");
    expect(repo.git("--git-dir", repo.origin, "rev-parse", "main")).toBe(tip);
  });

  test("the command passes --land through and keeps its usage", async () => {
    expect(await phaseCommand(repo.dir, ["deployed", "billing"])).toBe("usage: phase deployed <spec> <phase> [--date YYYY-MM-DD] [--land]");
  });
});
