import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { ownerCommand, parseOwnerArgs } from "../commands/owner";
import { anonymousRunner, isolatedRunner, repoWithOrigin, type TestRepo } from "./git-repo";

const META = "docs/specs/a/CLAUDE.md";
const claudeMd = (owner?: string) => `---\nstatus: active\n${owner ? `owner: ${owner}\n` : ""}---\n\n# A\n`;

describe("parseOwnerArgs", () => {
  test("takes a spec and a name, me or none", () => {
    expect(parseOwnerArgs(["a", "Taras Korpach"])).toEqual({ spec: "a", who: { kind: "name", name: "Taras Korpach" } });
    expect(parseOwnerArgs(["a", "me"])).toEqual({ spec: "a", who: { kind: "me" } });
    expect(parseOwnerArgs(["a", "None"])).toEqual({ spec: "a", who: { kind: "none" } });
  });

  test("anything else is the usage line; a name under 3 letters to match on is refused", () => {
    for (const args of [[], ["a"], ["a", "taras", "b"]]) expect(parseOwnerArgs(args)).toBe("usage: owner <spec> <name|me|none>");
    expect(parseOwnerArgs(["a", "tk"])).toBe('owner: "tk" is too short to match anyone; use at least 3 letters of their name');
    expect(parseOwnerArgs(["a", "Тарас"])).toBe('owner: "Тарас" is too short to match anyone; use at least 3 letters of their name');
  });
});

describe("ownerCommand (real git)", () => {
  let repo: TestRepo;

  beforeEach(() => {
    repo = repoWithOrigin("spec-owner-command-");
    repo.write(META, claudeMd());
    repo.commitAll("spec a");
    repo.git("push", "-q", "origin", "main");
  });

  afterEach(() => repo.cleanup());

  const onOrigin = () => repo.git("--git-dir", repo.origin, "show", `main:${META}`);

  test("lands a named owner on origin without touching the checkout, then says it is already set", async () => {
    const head = repo.git("rev-parse", "HEAD");
    expect(await ownerCommand(repo.dir, ["a", "taras"], isolatedRunner)).toMatch(/^owner: a is taras \([0-9a-f]{7}\)$/);
    expect(onOrigin()).toBe(claudeMd("taras").trim());
    expect(repo.git("rev-parse", "HEAD")).toBe(head);
    expect(await ownerCommand(repo.dir, ["a", "taras"], isolatedRunner)).toBe("owner: a is already taras");
  });

  test("me is the configured git name; none removes the line", async () => {
    expect(await ownerCommand(repo.dir, ["a", "me"], isolatedRunner)).toMatch(/^owner: a is spec-tests \([0-9a-f]{7}\)$/);
    expect(onOrigin()).toBe(claudeMd("spec-tests").trim());
    expect(await ownerCommand(repo.dir, ["a", "none"], isolatedRunner)).toMatch(/^owner: a has no owner \([0-9a-f]{7}\)$/);
    expect(onOrigin()).toBe(claudeMd().trim());
    expect(await ownerCommand(repo.dir, ["a", "none"], isolatedRunner)).toBe("owner: a already has no owner");
  });

  test("me with no configured git name writes nothing", async () => {
    expect(await ownerCommand(repo.dir, ["a", "me"], anonymousRunner)).toBe("owner: can't tell who you are; set git user.name, or name the person");
    expect(onOrigin()).toBe(claudeMd().trim());
  });

  test("refuses a spec that exists only on a branch", async () => {
    repo.git("checkout", "-q", "-b", "feat");
    repo.write("docs/specs/b/CLAUDE.md", claudeMd());
    repo.commitAll("spec b on a branch");
    expect(await ownerCommand(repo.dir, ["b", "taras"], isolatedRunner)).toBe("owner: no spec named b on origin/main; land the spec first");
  });
});
