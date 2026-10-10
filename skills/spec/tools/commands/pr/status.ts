import { defaultBranch, systemRunner, type Runner } from "../../core/run";
import { loadSettings } from "../../playbook/settings";
import { ghClient } from "../../pr/gh";
import { renderReport } from "../../pr/render";
import { buildReport } from "../../pr/report";
import { resolvePr } from "../../pr/resolve";

export const PR_STATUS_USAGE = "pr status [<pr> | <spec-name> [<group>]]";

export function prStatus(projectDir: string, args: readonly string[], runner: Runner = systemRunner, now = new Date()): string {
  if (args.length > 2) return `usage: ${PR_STATUS_USAGE}`;
  const gh = ghClient(projectDir, runner);
  const resolved = resolvePr(gh, projectDir, args);
  if (!resolved.ok) return `pr status: ${resolved.reason}`;
  const report = buildReport(gh, resolved.value.view, {
    externalPatterns: loadSettings(projectDir).checks.external,
    defaultBranch: defaultBranch(projectDir, runner),
    otherPrs: resolved.value.otherPrs,
  });
  return renderReport(report, now);
}
