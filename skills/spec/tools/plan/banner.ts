const BANNER_START = "> On the board since ";
const TITLE = /^# /;

export type BannerPlan = { kind: "write"; text: string } | { kind: "unchanged" };

export function bannerLine(day: string): string {
  return `${BANNER_START}${day}. This list is frozen; the board is the source.`;
}

// Under the title of progress.md, once.
export function planBanner(progress: string, day: string): BannerPlan {
  const lines = progress.split("\n");
  if (lines.some((line) => line.startsWith(BANNER_START))) return { kind: "unchanged" };
  const title = lines.findIndex((line) => TITLE.test(line));
  const at = title === -1 ? 0 : title + 1;
  const before = lines.slice(0, at);
  const after = lines.slice(at);
  const spacedAfter = after[0] === "" ? after : ["", ...after];
  return { kind: "write", text: [...before, ...(title === -1 ? [] : [""]), bannerLine(day), ...spacedAfter].join("\n") };
}
