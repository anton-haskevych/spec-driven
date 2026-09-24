import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isRecord, parseFrontmatter } from "../core/frontmatter";

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
