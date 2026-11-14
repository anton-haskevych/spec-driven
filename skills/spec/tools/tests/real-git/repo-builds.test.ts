import { describe, expect, test } from "bun:test";
import { repoBuildsOutsideBeforeAll } from "./repo-builds";

const builds = (source: string) => repoBuildsOutsideBeforeAll(source).map(({ line, builder, where }) => `${line} ${builder} ${where}`);

describe("repoBuildsOutsideBeforeAll", () => {
  test("a repo built in beforeAll is fine", () => {
    expect(builds('let r;\nbeforeAll(() => { r = repoWithOrigin("x"); r.clone("b"); });\n')).toEqual([]);
  });

  test("names builds in beforeEach, in test bodies and at collection time", () => {
    const source = [
      'const top = repoWithOrigin("x");',
      'describe("d", () => {',
      "  const inDescribe = joinedRepo();",
      '  beforeEach(() => { repo.addWorktree("w", "b"); });',
      '  it("i", () => { repo.clone("c"); });',
      '  test.if(true)("t", async () => { await Promise.resolve(repoWithOrigin("y")); });',
      "});",
    ].join("\n");
    expect(builds(source)).toEqual([
      "1 repoWithOrigin collection time",
      "3 joinedRepo collection time",
      "4 repo.addWorktree beforeEach",
      "5 repo.clone it",
      "6 repoWithOrigin test",
    ]);
  });

  test("follows a same-file helper one level, to where it is called", () => {
    const source = [
      "function fresh() { return repoWithOrigin('x'); }",
      "const joined = () => joinedRepo();",
      "beforeAll(() => { fresh(); });",
      'test("t", () => { joined(); });',
      "function many() { return [1, 2].map(() => repoWithOrigin('z')); }",
    ].join("\n");
    expect(builds(source)).toEqual(["4 joined test"]);
  });
});
