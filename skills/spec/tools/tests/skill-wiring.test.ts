import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SUB_COMMANDS } from "../context/request";
import { isRecord, parseFrontmatter, stringField } from "../core/frontmatter";
import { SHIP_MODES } from "../core/spec-meta";
import { phaseFileText } from "../phases/template";

const SKILL_DIR = join(import.meta.dir, "..", "..");
const PLUGIN_ROOT = join(SKILL_DIR, "..", "..");
const SCRIPT_PATH = /"(\$CLAUDE_PLUGIN_ROOT|\$\{CLAUDE_SKILL_DIR\})\/([^"]+\.ts)"/;
const SHELLS = ["sh", "zsh"].filter((shell) => Bun.which(shell));

function contextInjection(): string {
  const skill = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf8");
  return /!`([^`]*"\$\{CLAUDE_SKILL_DIR\}\/tools\/spec\.ts" context [^`]*)`/.exec(skill)?.[1] ?? "missing";
}

function hookCommands(): string[] {
  const parsed = parseFrontmatter(readFileSync(join(SKILL_DIR, "SKILL.md"), "utf8"));
  if (parsed.kind !== "ok") throw new Error("SKILL.md frontmatter does not parse");
  return collectCommands(parsed.data.hooks);
}

function collectCommands(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectCommands);
  if (!isRecord(value)) return [];
  const own = typeof value.command === "string" ? [value.command] : [];
  return [...own, ...Object.values(value).flatMap(collectCommands)];
}

describe("SKILL.md hook wiring", () => {
  test("declares the PreToolUse and PostToolUse hooks", () => {
    expect(hookCommands()).toHaveLength(2);
  });

  test("hook commands use CLAUDE_PLUGIN_ROOT, because CLAUDE_SKILL_DIR is empty inside hooks", () => {
    for (const command of hookCommands()) {
      const match = SCRIPT_PATH.exec(command);
      expect(match?.[1]).toBe("$CLAUDE_PLUGIN_ROOT");
      expect(existsSync(join(PLUGIN_ROOT, match?.[2] ?? "missing"))).toBe(true);
    }
  });

  test("the context-pack injection points at a real script", () => {
    const skill = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf8");
    const injected = /!`[^`]*"\$\{CLAUDE_SKILL_DIR\}\/([^"]+\.ts)"[^`]*`/.exec(skill)?.[1];
    expect(existsSync(join(SKILL_DIR, injected ?? "missing"))).toBe(true);
  });

  test("the context-pack injection keeps its here-document out of && and || lists, which a worktree-isolated session refuses", () => {
    const injection = contextInjection();
    expect(injection).not.toMatch(/&&|\|\|/);
    expect(injection).toMatch(/<<'SPEC_ARGS'\n/);
  });

  test.each(SHELLS)("%s without bun prints nothing and exits 0, so the skill still loads", (shell) => {
    const noBunDir = mkdtempSync(join(tmpdir(), "spec-no-bun-"));
    const command = contextInjection().replaceAll("${CLAUDE_SKILL_DIR}", noBunDir).replace("$ARGUMENTS", "status");

    const result = Bun.spawnSync([Bun.which(shell) ?? shell, "-c", command], { cwd: noBunDir, env: { PATH: noBunDir } });

    expect(result.stderr.toString()).toBe("");
    expect(result.stdout.toString()).toBe("");
    expect(result.exitCode).toBe(0);
  });

  test.each(SHELLS)("%s passes free-text arguments through verbatim", (shell) => {
    const injection = contextInjection();
    const fakeSkillDir = mkdtempSync(join(tmpdir(), "spec-skill-"));
    mkdirSync(join(fakeSkillDir, "tools"));
    writeFileSync(join(fakeSkillDir, "tools", "spec.ts"), "console.log(JSON.stringify([...Bun.argv.slice(2), await Bun.stdin.text()]));");
    const args = "prep\n\nlet's go \"quoted\" $HOME $(touch pwned)";
    const command = injection.replaceAll("${CLAUDE_SKILL_DIR}", fakeSkillDir).replace("$ARGUMENTS", args);

    const result = Bun.spawnSync([shell, "-c", command], { cwd: fakeSkillDir });

    expect(result.stderr.toString()).toBe("");
    expect(JSON.parse(result.stdout.toString())).toEqual(["context", "-", `${args}\n`]);
    expect(existsSync(join(fakeSkillDir, "pwned"))).toBe(false);
  });
});

describe("sub-command wiring", () => {
  const skill = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf8");
  const expected = [...SUB_COMMANDS].sort();
  const tokens = (text: string) => [...text.matchAll(/`([a-z-]+)`/g)].map((match) => match[1] ?? "").sort();

  test("SKILL.md's sub-command set, dispatch table and argument-hint match the tools' set", () => {
    const setLine = /\*\*Sub-command set:\*\*(.*)/.exec(skill)?.[1] ?? "";
    const dispatch = skill.slice(skill.indexOf("**Dispatch:**"), skill.indexOf("## Session lifecycle"));
    const tableRows = [...dispatch.matchAll(/^\| `([a-z-]+)` \|/gm)].map((match) => match[1] ?? "").sort();
    const parsed = parseFrontmatter(skill);
    const hint = parsed.kind === "ok" ? stringField(parsed.data, "argument-hint") ?? "" : "";
    expect(tokens(setLine)).toEqual(expected);
    expect(tableRows).toEqual(expected);
    expect(hint.split(" ")[0]?.split("|").sort()).toEqual(expected);
  });

  test("each sub-command has a thin skill that only routes to the main skill", () => {
    const thin = readdirSync(join(SKILL_DIR, "..")).filter((name) => name.startsWith("spec-")).sort();
    expect(thin).toEqual(expected.map((command) => `spec-${command}`));
    for (const command of expected) {
      const parsed = parseFrontmatter(readFileSync(join(SKILL_DIR, "..", `spec-${command}`, "SKILL.md"), "utf8"));
      if (parsed.kind !== "ok") throw new Error(`spec-${command}/SKILL.md frontmatter does not parse`);
      expect(parsed.data.name).toBe(`spec-${command}`);
      expect(parsed.data["disable-model-invocation"]).toBe(true);
      expect(parsed.data.hooks).toBeUndefined();
      expect(parsed.body).toContain(`\`spec-driven:spec\` with args \`${command} $ARGUMENTS\``);
      expect(parsed.body).toContain("../spec/SKILL.md");
    }
  });
});

describe("ship mode wiring", () => {
  const section = (file: string, from: string, to: string) => {
    const text = readFileSync(join(SKILL_DIR, file), "utf8");
    return text.slice(text.indexOf(from), text.indexOf(to, text.indexOf(from)));
  };

  test("the PR moment reads every ship mode before it asks: execute §10, handoff §4 and babysit", () => {
    const readers = [
      section("execute.md", "## 10. The PR gate", "**Checking on a PR.**"),
      section("handoff.md", "## 4. Signal completion", "Do not ask other follow-up questions"),
      section("babysit.md", "**Mode**", "## How to run the commands"),
    ];
    for (const text of readers) for (const mode of SHIP_MODES) expect(text).toContain(`\`ship: ${mode}\``);
  });
});

describe("phase template wiring", () => {
  test("create.md's phase template carries the same Goal and Outcome lines as phase add's", () => {
    const generated = phaseFileText({ id: "1", title: "Any", edges: {} }).split("\n");
    const label = (name: string) => generated.find((line) => line.startsWith(`**${name}:**`)) ?? "missing";
    const create = readFileSync(join(SKILL_DIR, "create.md"), "utf8");
    expect(create).toContain(`${label("Goal")}\n\n${label("Outcome")}\n`);
  });
});

describe("next sessions wiring", () => {
  const read = (path: string) => readFileSync(join(SKILL_DIR, path), "utf8");
  const nextSessions = () => {
    const skill = read("SKILL.md");
    return skill.slice(skill.indexOf("## Next sessions"), skill.indexOf("Without Bun, skip the block."));
  };

  test("the block names the row fields, ends with the reply line and launches each row's own sub-command", () => {
    const block = nextSessions();
    for (const field of ["`spec`", "`phase`", "`title`", "`next`", "`target`", "`treeBusy`"]) expect(block).toContain(field);
    expect(block).toContain("Reply with row numbers to launch.");
    expect(block).toContain("launch <row.next> <spec> [<phase>]");
    expect(block).toContain("most recent numbered list");
    expect(block).toContain("print it again and wait");
    expect(block).toContain("never share a message");
  });

  test("list and handoff point at the reply rule instead of restating it", () => {
    for (const mode of ["list.md", "handoff.md"]) {
      expect(read(mode)).toContain("SKILL.md → *Next sessions* step 3");
      expect(read(mode)).not.toContain("launch execute <spec> <phase>` per row");
    }
  });

  test("create ends with its own review at row 1 and asks nothing", () => {
    const create = read("create.md");
    expect(create).toContain("with this spec's review at 1");
    expect(create).toContain("launch review <spec>");
    expect(create).not.toContain("Confirm the user is happy");
  });

  test("execute applies preflight's defaults, stops on its forks and applies the top ready row", () => {
    const execute = read("execute.md");
    expect(execute).toContain("Then its *Defaults applied* and *Forks for you*.");
    expect(execute).toContain("take its top row");
    expect(execute).not.toContain("offer the top row");
    const preflight = readFileSync(join(SKILL_DIR, "..", "phase-preflight", "SKILL.md"), "utf8");
    expect(preflight).toContain("## Defaults applied");
    expect(preflight).toContain("## Forks for you");
    expect(preflight).not.toContain("## Decisions for you");
  });
});

describe("reports wiring", () => {
  const read = (path: string) => readFileSync(join(SKILL_DIR, path), "utf8");
  const section = (heading: string) => {
    const skill = read("SKILL.md");
    const start = skill.indexOf(heading);
    return start < 0 ? "" : skill.slice(start, skill.indexOf("\n## ", start + 1));
  };

  test("SKILL.md *Reports* names the three header lines and builds Impact from the Outcome line", () => {
    const reports = section("## Reports");
    for (const label of ["Impact:", "On merge:", "Left:"]) expect(reports).toContain(label);
    expect(reports).toContain("**Outcome** line");
  });

  test.each(["execute.md", "handoff.md", "update.md", "review.md"])("%s opens its report with SKILL.md → *Reports*", (mode) => {
    expect(read(mode)).toContain("SKILL.md → *Reports*");
  });

  test("SKILL.md *Say if wrong* is the one rule for defaults vs forks; review and preflight point at it", () => {
    const sayIfWrong = section("## Say if wrong");
    expect(sayIfWrong).toContain("`Say if wrong:`");
    expect(sayIfWrong).toContain("moves scope between specs");
    const review = read("review.md");
    expect(review).toContain("SKILL.md → *Say if wrong*");
    expect(review).not.toContain("mechanism-level choices where either option satisfies");
    const preflight = readFileSync(join(SKILL_DIR, "..", "phase-preflight", "SKILL.md"), "utf8");
    expect(preflight).toContain("../spec/SKILL.md` → *Say if wrong*");
  });

  test("update takes the phase this tree's claim names instead of asking", () => {
    const update = read("update.md");
    expect(update).toContain("claim list");
    expect(update).not.toContain("ask the user which phase");
  });
});
