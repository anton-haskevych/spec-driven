import { afterEach, beforeEach, expect, test } from "bun:test";
import { symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { issuesForWrittenFile } from "../hooks/spec-file-check";
import { formatIssues } from "../doctor/issue";
import { run } from "../spec";
import { createContextFixture } from "./context-fixture";

let fixture: ReturnType<typeof createContextFixture>;
beforeEach(() => { fixture = createContextFixture(); });
afterEach(() => fixture.cleanup());

test("explicit doctor file check uses the existing checker and observes invalid-edit correction", async () => {
  const file = join(fixture.spec(), "ledger/gotcha-a.md");
  const command = ["doctor", "checkout", "--file", "ledger/gotcha-a.md"];
  fixture.write("ledger/gotcha-a.md", "# invalid edit\n");
  const errors = issuesForWrittenFile(file, fixture.project);
  expect(errors.length).toBeGreaterThan(0);
  const result = await run(command, fixture.project);
  expect(result).toContain(formatIssues(errors, fixture.project));
  expect(result).toContain("ledger entry has no frontmatter");
  fixture.write("ledger/gotcha-a.md", "---\nkind: gotcha\napplies-to: [phase 2]\ncreated: a\n---\n# Corrected\n");
  expect(await run(command, fixture.project)).toBe("doctor: clean (1 file)");
  expect(await run(["doctor", "checkout"], fixture.project)).toBe("doctor: clean (1 spec)");
});

test("missing, directory, outside and symlinked-outside files never report clean", async () => {
  writeFileSync(join(fixture.project, "outside.md"), "# Outside\n");
  symlinkSync(join(fixture.project, "outside.md"), join(fixture.spec(), "outside.md"));
  for (const file of ["missing.md", "ledger", "../../outside.md", "outside.md", "/missing"]) {
    const result = await run(["doctor", "checkout", "--file", file], fixture.project);
    expect(result).toStartWith("doctor:");
    expect(result).not.toContain("doctor: clean");
  }
});

test("pilot permits only its named file-check command; default Claude doctor stays unchanged", async () => {
  const workflow = { kind: "local-pilot", spec: "checkout", phase: "2" } as const;
  expect(await run(["doctor", "checkout", "--file", "CLAUDE.md"], fixture.project, { workflow })).toBe("doctor: clean (1 file)");
  expect(await run(["doctor", "other", "--file", "CLAUDE.md"], fixture.project, { workflow })).toContain("unavailable in local-pilot");
  expect(await run(["doctor", "checkout", "--file"], fixture.project, { workflow })).toContain("unavailable in local-pilot");
  expect(await run(["doctor"], fixture.project)).toBe("doctor: clean (1 spec)");
});
