import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import { systemRunner } from "../core/run";
import { HELPER_EXCEPTIONS, REAL_GIT_CAP, REAL_GIT_FILES, REPO_BUILD_EXCEPTIONS } from "./real-git/allowlist";
import { repoBuildsOutsideBeforeAll } from "./real-git/repo-builds";
import { importScanner, TEST_SUFFIX, testFilesUnder } from "./real-git/scan";
import { TRIPWIRE_LOG_ENV } from "./real-git/tripwire";

const TESTS_DIR = import.meta.dir;
const SKILLS_DIR = join(TESTS_DIR, "..", "..", "..");
const REPO_ROOT = join(SKILLS_DIR, "..");
const REAL_GIT_HELPERS = ["git-repo.ts", "joined-repo.ts"].map((name) => join(TESTS_DIR, name));
const GIT_SUFFIX = ".git.test.ts";
const RULE = [
  "Real git is for code that itself runs git (adapters, parsers of git output).",
  "Test logic on tests/fake-record.ts, tests/fake-ref.ts or tests/stub-runner.ts instead.",
].join("\n");

const scanner = importScanner(REPO_ROOT);
const testFiles = testFilesUnder(SKILLS_DIR);
const listed = Object.keys(REAL_GIT_FILES);
const named = (file: string) => relative(TESTS_DIR, file);

describe("real-git test allowlist", () => {
  test("every collected test file is a *.test.ts", () => {
    const others = testFiles.filter((file) => !TEST_SUFFIX.test(file)).map(named);
    expect(others, "bun collects these, but the fast tier only knows *.test.ts: rename them").toEqual([]);
  });

  test("every file that runs real git is a *.git.test.ts on the list", () => {
    const unmarked = testFiles.filter((file) => !file.endsWith(GIT_SUFFIX) && scanner.reaches(file, REAL_GIT_HELPERS));
    const messages = unmarked.map((file) => {
      const name = basename(file);
      const renamed = name.replace(TEST_SUFFIX, GIT_SUFFIX);
      return `${named(file)} reaches tests/git-repo.ts through its imports.\n${RULE}\nIf this file proves git behaviour: rename it ${renamed} and add it to REAL_GIT_FILES (tests/real-git/allowlist.ts) with one line naming that behaviour.`;
    });
    expect(messages).toEqual([]);
  });

  test("the *.git.test.ts files are exactly the listed ones, each with a reason", () => {
    const gitFiles = testFiles.filter((file) => file.endsWith(GIT_SUFFIX)).map(named).sort();
    expect({ unlisted: gitFiles.filter((file) => !listed.includes(file)), missing: listed.filter((file) => !gitFiles.includes(file)) }).toEqual({ unlisted: [], missing: [] });
    expect(listed.filter((file) => (REAL_GIT_FILES[file] ?? "").trim() === "")).toEqual([]);
  });

  test("the list only shrinks", () => {
    const message =
      listed.length > REAL_GIT_CAP
        ? `REAL_GIT_FILES has ${listed.length} entries; REAL_GIT_CAP is ${REAL_GIT_CAP}.\nMove the logic to the fakes, or raise REAL_GIT_CAP in this diff and say why in the PR.`
        : `REAL_GIT_FILES has ${listed.length} entries; lower REAL_GIT_CAP to ${listed.length}.`;
    expect(listed.length === REAL_GIT_CAP ? "" : message).toBe("");
  });

  test("repos are built once per file", () => {
    const gitFiles = testFiles.filter((file) => file.endsWith(GIT_SUFFIX));
    const builds = new Map(gitFiles.map((file) => [named(file), repoBuildsOutsideBeforeAll(readFileSync(file, "utf8"))]));
    const offenders = [...builds].filter(([file, found]) => found.length > 0 && !Object.hasOwn(REPO_BUILD_EXCEPTIONS, file));
    const messages = offenders.map(([file, found]) => {
      const places = found.map(({ line, builder, where }) => `${file}:${line} calls ${builder} ${where === "collection time" ? "at collection time" : `inside ${where}`}`);
      return `${places.join("\n")}\nBuild it in beforeAll and reset what a test changes, or move the test to the fakes.`;
    });
    expect(messages).toEqual([]);
    const fixed = Object.keys(REPO_BUILD_EXCEPTIONS).filter((file) => (builds.get(file) ?? []).length === 0);
    expect(fixed, "these now build in beforeAll (or are gone): drop them from REPO_BUILD_EXCEPTIONS").toEqual([]);
  });

  test("only the real-git helpers and the named exceptions import them", () => {
    const helpers = [...new Bun.Glob("**/*.{ts,tsx}").scanSync({ cwd: SKILLS_DIR })]
      .map((path) => join(SKILLS_DIR, path))
      .filter((file) => !TEST_SUFFIX.test(file) && !file.split("/").includes("fixtures") && !REAL_GIT_HELPERS.includes(file));
    const offenders = helpers.filter((file) => !Object.hasOwn(HELPER_EXCEPTIONS, named(file)) && scanner.reaches(file, REAL_GIT_HELPERS));
    expect(offenders.map((file) => `${relative(REPO_ROOT, file)} reaches tests/git-repo.ts; ${RULE}`)).toEqual([]);
    expect(Object.keys(HELPER_EXCEPTIONS).filter((name) => !scanner.reaches(join(TESTS_DIR, name), REAL_GIT_HELPERS)), "drop exceptions that no longer import git-repo").toEqual([]);
  });

  test.if(process.env[TRIPWIRE_LOG_ENV] !== undefined)("the fast tier's git tripwire is armed", () => {
    const dir = mkdtempSync(join(tmpdir(), "spec-tripwire-armed-"));
    try {
      const log = join(dir, "calls.log");
      const result = systemRunner.run(["git", "--version"], { env: { [TRIPWIRE_LOG_ENV]: log } });
      expect(result.code).toBe(97);
      expect(readFileSync(log, "utf8")).toStartWith("git --version (in ");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
