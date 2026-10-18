import { join } from "node:path";
import { NO_DEFAULT_BRANCH } from "../commands/push";
import { readTextIfExists } from "./files";
import { parseFrontmatter } from "./frontmatter";
import { removeFrontmatterLine, setFrontmatterLine } from "./frontmatter-patch";
import { gitAt } from "./git";
import { landOnMain, type MainEditPlan, type MainLanding } from "./land-on-main";
import { defaultBranch, type Runner } from "./run";
import { findSpecs } from "./spec-folders";

// One key in a spec's CLAUDE.md, set (value) or removed (no value).
export interface SpecFieldEdit {
  spec: string;
  key: string;
  value?: string;
  // Whether the key's parsed current value already says what this edit writes.
  same(current: unknown): boolean;
  // The reason given when it does.
  already: string;
  message: string;
}

export type SpecFieldPlan = { kind: "write"; text: string; message: string; landed: SpecFieldEdit } | { kind: "unchanged" | "refused"; reason: string };

// Commits the edit onto a freshly fetched origin/<default> and pushes it; the checkout is never touched.
export async function landSpecField(projectDir: string, runner: Runner, edit: SpecFieldEdit): Promise<MainLanding<SpecFieldEdit>> {
  const branch = defaultBranch(projectDir, runner);
  if (!branch) return { kind: "failed", reason: NO_DEFAULT_BRANCH };
  return landOnMain(gitAt(projectDir, runner), branch, (dir) => specFieldEdit(dir, branch, edit));
}

export function planSpecField(edit: SpecFieldEdit, claudeMd: string): SpecFieldPlan {
  const parsed = parseFrontmatter(claudeMd);
  if (parsed.kind === "ok" && edit.same(parsed.data[edit.key])) return { kind: "unchanged", reason: edit.already };
  const patch = edit.value === undefined ? removeFrontmatterLine(claudeMd, edit.key) : setFrontmatterLine(claudeMd, edit.key, yamlScalar(edit.value));
  if (patch.kind === "invalid") return { kind: "refused", reason: `${edit.spec}'s CLAUDE.md: ${patch.reason}` };
  return { kind: "write", text: patch.text, message: edit.message, landed: edit };
}

// Plain when YAML reads it back as the same string (most names), else double-quoted.
export function yamlScalar(value: string): string {
  const parsed = parseFrontmatter(`---\nvalue: ${value}\n---\n`);
  return parsed.kind === "ok" && parsed.data.value === value ? value : JSON.stringify(value);
}

function specFieldEdit(projectDir: string, branch: string, edit: SpecFieldEdit): MainEditPlan<SpecFieldEdit> {
  const specs = findSpecs(projectDir, edit.spec);
  const [spec] = specs;
  if (!spec) return { kind: "refused", reason: `no spec named ${edit.spec} on origin/${branch}; land the spec first` };
  if (specs.length > 1) return { kind: "refused", reason: `${specs.length} specs are named ${edit.spec} on origin/${branch}` };
  const file = join(spec.dir, "CLAUDE.md");
  const plan = planSpecField(edit, readTextIfExists(file) ?? "");
  return plan.kind === "write" ? { ...plan, file } : plan;
}
