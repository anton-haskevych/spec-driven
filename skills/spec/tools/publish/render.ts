import type { Published } from "./publish";
import type { Pushed } from "./push";

const SHORT_SHA = 7;

export function remoteLine(pushed: Pushed, defaultBranch: string, docsSha?: string): string {
  const parts = [
    pushed.commits > 0 ? `pushed ${pushed.branch} (+${pushed.commits})` : `${pushed.branch} already on origin`,
    ...(docsSha ? [`docs → ${defaultBranch} ${docsSha.slice(0, SHORT_SHA)}`] : []),
    ...(pushed.behind > 0 ? [`behind ${defaultBranch} ${pushed.behind}`] : []),
  ];
  return `Remote: ${parts.join(" · ")}`;
}

export function publishLines(published: Published, defaultBranch: string): string[] {
  const deleted = published.deleted.length > 0 ? [`not published (deleted on the branch): ${published.deleted.join(", ")}`] : [];
  if (published.kind === "nothing") return ["no spec doc changes since the last publish", ...deleted];
  const { files, sha, mergeBack } = published;
  return [
    `published ${files.length} file${files.length === 1 ? "" : "s"} to ${defaultBranch} (${sha.slice(0, SHORT_SHA)}): ${files.join(", ")}`,
    ...(mergeBack.ok ? [] : [`merge-back failed: ${mergeBack.reason}`]),
    ...deleted,
  ];
}
