import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { parseShipArgs, planShip, shipCommand } from "../commands/ship";
import { isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

const claudeMd = (ship?: string) => `---\nstatus: active\n${ship === undefined ? "" : `ship: ${ship}\n`}---\n# Spec\n`;
const META = "docs/specs/a/CLAUDE.md";

describe("parseShipArgs", () => {
  test("reads a spec and a mode in any case", () => {
    expect(parseShipArgs(["a", "Hold-For-Review"])).toEqual({ spec: "a", mode: "hold-for-review" });
  });

  test("prints the usage for a malformed call, and names a word that is not a mode", () => {
    for (const args of [[], ["a"], ["a", "auto", "b"]]) expect(parseShipArgs(args)).toBe("usage: ship <spec> <auto|hold-for-review>");
    expect(parseShipArgs(["a", "hold"])).toBe("ship: hold is not a ship mode; use auto or hold-for-review");
  });
});

describe("planShip", () => {
  test("adds the line, rewrites another mode and says when it is already set", () => {
    expect(planShip({ spec: "a", mode: "auto" }, claudeMd())).toMatchObject({ kind: "write", text: claudeMd("auto"), message: "[ship] a auto" });
    expect(planShip({ spec: "a", mode: "auto" }, claudeMd("hold-for-review"))).toMatchObject({ kind: "write", text: claudeMd("auto") });
    expect(planShip({ spec: "a", mode: "auto" }, claudeMd("auto"))).toEqual({ kind: "unchanged", reason: "a is already auto" });
  });

  test("refuses a CLAUDE.md with no frontmatter", () => {
    expect(planShip({ spec: "a", mode: "auto" }, "# Spec\n")).toEqual({ kind: "refused", reason: "a's CLAUDE.md: entry has no frontmatter" });
  });
});

describe("shipCommand (real git)", () => {
  let repo: TestRepo;

  beforeEach(() => {
    repo = repoWithOrigin("spec-ship-command-");
    repo.write(META, claudeMd());
    repo.commitAll("spec a");
    repo.git("push", "-q", "origin", "main");
  });

  afterEach(() => repo.cleanup());

  const onOrigin = (path: string) => repo.git("--git-dir", repo.origin, "show", `main:${path}`);

  test("lands ship: on origin without touching the checkout, then says it is already set", async () => {
    const head = repo.git("rev-parse", "HEAD");
    expect(await shipCommand(repo.dir, ["a", "hold-for-review"], isolatedRunner)).toMatch(/^ship: a is hold-for-review \([0-9a-f]{7}\)$/);
    expect(onOrigin(META)).toBe(claudeMd("hold-for-review").trim());
    expect(repo.git("rev-parse", "HEAD")).toBe(head);
    expect(await shipCommand(repo.dir, ["a", "hold-for-review"], isolatedRunner)).toBe("ship: a is already hold-for-review");
  });

  test("refuses a spec that exists only on a branch", async () => {
    repo.git("checkout", "-q", "-b", "feat");
    repo.write("docs/specs/b/CLAUDE.md", claudeMd());
    repo.commitAll("spec b on a branch");
    expect(await shipCommand(repo.dir, ["b", "auto"], isolatedRunner)).toBe("ship: no spec named b on origin/main; land the spec first");
  });
});
