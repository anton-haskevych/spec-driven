import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { doctorReport } from "../commands/doctor";
import { hookResponse } from "../hooks/spec-file-check";

let project = "";
const spec = () => join(project, "docs", "specs", "checkout");

function write(relativePath: string, text: string): string {
  const path = join(spec(), relativePath);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, text);
  return path;
}

beforeAll(() => {
  project = mkdtempSync(join(tmpdir(), "spec-doctor-"));
  mkdirSync(join(project, ".claude"));
  writeFileSync(join(project, ".claude", "taxonomy.md"), "## status\n| `active` | x |\n| `done` | y |\n");
  write("CLAUDE.md", "---\nstatus: active\ncreated: a\nupdated: b\n---\n");
  write("progress.md", "## Phases\n- [ ] Phase 1 — Harness → `phases/phase-1-harness.md`\n");
  write("phases/phase-1-harness.md", "- [ ] build it\n");
  write("ledger/INDEX.md", "## Gotchas\n- `gotcha-a.md` — [general] — x\n");
  write("ledger/gotcha-a.md", "---\nkind: gotcha\napplies-to: [general]\ncreated: a\n---\nbody\n");
});

afterAll(() => rmSync(project, { recursive: true, force: true }));

describe("doctorReport", () => {
  test("reports a clean spec", () => {
    expect(doctorReport(project, "checkout")).toBe("doctor: clean (1 spec)");
  });

  test("names a spec it cannot find", () => {
    expect(doctorReport(project, "nope")).toContain("no spec named nope");
  });

  test("a project-wide run also checks the backlog", () => {
    const item = join(project, "docs", "specs", "_backlog", "bad-idea.md");
    mkdirSync(join(item, ".."), { recursive: true });
    writeFileSync(item, "---\npriority: urgent\n---\n");
    expect(doctorReport(project)).toContain("_backlog/bad-idea.md: frontmatter has no title");
    rmSync(item);
  });
});

describe("hookResponse", () => {
  const payload = (filePath: string, toolName = "Write") => ({ tool_name: toolName, tool_input: { file_path: filePath }, cwd: project });

  test("blocks with the problem when a written CLAUDE.md uses a status the project rejects", () => {
    const file = write("CLAUDE.md", "---\nstatus: draft\ncreated: a\nupdated: b\n---\n");
    const response = JSON.parse(hookResponse(payload(file), project) ?? "{}");
    expect(response.decision).toBe("block");
    expect(response.reason).toContain('status "draft" is not allowed here');
    write("CLAUDE.md", "---\nstatus: active\ncreated: a\nupdated: b\n---\n");
  });

  test("blocks a ledger entry without frontmatter", () => {
    const file = write("ledger/gotcha-b.md", "# no frontmatter\n");
    expect(hookResponse(payload(file, "Edit"), project)).toContain("ledger entry has no frontmatter");
  });

  test("blocks a backlog item without a title, open or closed", () => {
    const backlog = join(project, "docs", "specs", "_backlog");
    mkdirSync(join(backlog, "_closed"), { recursive: true });
    for (const file of [join(backlog, "idea.md"), join(backlog, "_closed", "old.md")]) {
      writeFileSync(file, "---\ntags: [a]\n---\nbody\n");
      expect(hookResponse(payload(file), project)).toContain("frontmatter has no title");
      rmSync(file);
    }
  });

  test("stays silent for valid spec files, code files, other tools and malformed input", () => {
    expect(hookResponse(payload(join(spec(), "ledger", "gotcha-a.md")), project)).toBeUndefined();
    expect(hookResponse(payload(join(project, "src", "app.ts")), project)).toBeUndefined();
    expect(hookResponse(payload(join(spec(), "CLAUDE.md"), "Read"), project)).toBeUndefined();
    expect(hookResponse("not json", project)).toBeUndefined();
  });
});
