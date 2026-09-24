import { clip } from "../context/text";
import type { Playbook } from "./playbooks";

const PLAYBOOK_LIMIT = 4000;

export function renderPlaybooks(playbooks: readonly Playbook[]): string {
  const sections = playbooks.map((playbook) => `#### ${playbook.name}\n${clip(playbook.body, PLAYBOOK_LIMIT, `docs/specs/_playbook/${playbook.name}.md`)}`);
  return `### Playbooks (docs/specs/_playbook)\n${sections.join("\n\n")}`;
}
