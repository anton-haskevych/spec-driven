export interface TreeName {
  branch: string;
  folder: string;
}

// One tree per spec PR group. `-pr-` matches the branches already in use (feat/spec-board-pr-b).
export function treeName(spec: string, prGroup?: string): TreeName {
  const folder = prGroup === undefined ? spec : `${spec}-pr-${prGroup.toLowerCase()}`;
  return { branch: `feat/${folder}`, folder };
}

const SPEC_BRANCH = /^feat\/(.+?)(?:-pr-[a-z0-9]+)?$/;

export function specOfBranch(branch: string): string | undefined {
  return SPEC_BRANCH.exec(branch)?.[1];
}
