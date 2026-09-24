import { findSpecs } from "../core/spec-folders";
import { playbooksForSpec } from "../playbook/playbooks";
import { renderPlaybooks } from "../playbook/render";

export function playbooksReport(projectDir: string, specName: string | undefined): string {
  if (!specName) return "usage: playbooks <spec-name>";
  const [spec] = findSpecs(projectDir, specName);
  if (!spec) return `playbooks: no spec named ${specName}`;
  const playbooks = playbooksForSpec(projectDir, spec);
  return playbooks.length > 0 ? renderPlaybooks(playbooks) : `No playbook applies to ${specName}.`;
}
