import { gitAt } from "../core/git";
import { defaultBranch, systemRunner, type Runner } from "../core/run";
import { loadSettings } from "../playbook/settings";
import { publishDocs } from "../publish/publish";
import { pushBranch } from "../publish/push";
import { publishLines, remoteLine } from "../publish/render";
import { NO_DEFAULT_BRANCH } from "./push";

export const PUBLISH_DOCS_USAGE = "publish-docs [<spec-name>]";

export function publishDocsReport(projectDir: string, args: readonly string[], runner: Runner = systemRunner): string {
  if (loadSettings(projectDir).docs !== "main") return "publish-docs: docs: branch — spec docs ride the feature PR; use spec.ts push";
  const branch = defaultBranch(projectDir, runner);
  if (!branch) return `publish-docs: ${NO_DEFAULT_BRANCH}`;

  const git = gitAt(projectDir, runner);
  const pushed = pushBranch(git, branch);
  if (!pushed.ok) return `publish-docs: ${pushed.reason}`;
  if (pushed.value.branch === branch) return `${remoteLine(pushed.value, branch)}\npublish-docs: on ${branch} — the push published the docs`;

  const published = publishDocs(git, { defaultBranch: branch, ...(args[0] ? { spec: args[0] } : {}) });
  if (!published.ok) return `${remoteLine(pushed.value, branch)}\npublish-docs: ${published.reason}`;
  if (published.value.kind === "nothing") return [remoteLine(pushed.value, branch), ...publishLines(published.value, branch)].join("\n");

  const mergeBackPushed = pushBranch(git, branch);
  const commits = pushed.value.commits + (mergeBackPushed.ok ? mergeBackPushed.value.commits : 0);
  return [
    remoteLine({ ...pushed.value, commits }, branch, published.value.sha),
    ...publishLines(published.value, branch),
    ...(mergeBackPushed.ok ? [] : [`push after merge-back failed: ${mergeBackPushed.reason}`]),
  ].join("\n");
}
