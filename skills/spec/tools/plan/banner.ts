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

const READ_START = "> Read it by hand: ";

export function manualReadLine(spec: string): string {
  return `${READ_START}\`git fetch origin refs/spec-board/record\`, then \`git show FETCH_HEAD:specs/${spec}/phases/<id>.json\`.`;
}

// A joined spec keeps progress.md for good: routing tells a spec from a prep folder by it.
export function progressStub(progress: string, spec: string, day: string): string {
  const lines = progress.split("\n");
  const title = lines.find((line) => TITLE.test(line)) ?? `# ${spec} — Progress`;
  const banner = lines.find((line) => line.startsWith(BANNER_START)) ?? bannerLine(day);
  return `${title}\n\n${banner}\n${manualReadLine(spec)}\n`;
}

export function withoutBoardLines(progress: string): string {
  const kept = progress.split("\n").filter((line) => !line.startsWith(BANNER_START) && !line.startsWith(READ_START));
  return kept.join("\n").replace(/\n{3,}/g, "\n\n");
}
