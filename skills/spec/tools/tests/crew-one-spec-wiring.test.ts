import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SKILL_DIR = join(import.meta.dir, "..", "..");

describe("one-spec overseer wiring", () => {
  const read = (name: string) => readFileSync(join(SKILL_DIR, name), "utf8");
  const oneSpec = () => read("oversee-crew.md").slice(read("oversee-crew.md").indexOf("## 7. One spec"));

  test("oversee-crew.md's One spec section starts, ticks and ships through the --spec commands, never waiting on ship mode", () => {
    const text = oneSpec();
    for (const line of ["`crew overseer --spec <spec>`", "`ready <spec> --order`", "`crew start --spec <spec> [--ship-alone <group,…>]`", "`crew tick --spec <spec>`", "`PR moment: <spec> final PR`", "`crew launch babysit <spec> default`", "`Finished: <spec>"]) expect(text).toContain(line);
    expect(text).toContain("The spec's `ship:`, else settings `pr.ship`, else `hold-for-review`");
    expect(text).toContain("ending `Starting.`, never `Go?`");
  });

  test("a lane worker runs merge-back where others push: execute §1 and Crew worker, handoff §3 with the Crew line in its commit", () => {
    const execute = read("execute.md");
    const handoff = read("handoff.md");
    for (const text of [execute, handoff]) {
      expect(text).toContain("tools/spec.ts merge-back <spec");
      expect(text).toContain("--push");
    }
    expect(handoff).toContain("`Crew:` line in the commit body");
  });
});
