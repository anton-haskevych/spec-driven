import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SUB_COMMANDS } from "../commands/context";
import { isRecord, parseFrontmatter, stringField } from "../core/frontmatter";

const SKILL_DIR = join(import.meta.dir, "..", "..");
const PLUGIN_ROOT = join(SKILL_DIR, "..", "..");
const SCRIPT_PATH = /"(\$CLAUDE_PLUGIN_ROOT|\$\{CLAUDE_SKILL_DIR\})\/([^"]+\.ts)"/;

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

  test.each(["sh", "zsh"].filter((shell) => Bun.which(shell)))("%s passes free-text arguments through verbatim", (shell) => {
    const skill = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf8");
    const injection = /!`(command -v bun[^`]*context[^`]*)`/.exec(skill)?.[1] ?? "missing";
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
  const tokens = (text: string) => [...text.matchAll(/`([a-z]+)`/g)].map((match) => match[1] ?? "").sort();

  test("SKILL.md's sub-command set, dispatch table and argument-hint match the tools' set", () => {
    const setLine = /\*\*Sub-command set:\*\*(.*)/.exec(skill)?.[1] ?? "";
    const dispatch = skill.slice(skill.indexOf("**Dispatch:**"), skill.indexOf("## Session lifecycle"));
    const tableRows = [...dispatch.matchAll(/^\| `([a-z]+)` \|/gm)].map((match) => match[1] ?? "").sort();
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
