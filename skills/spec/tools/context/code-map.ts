const TABLE_ROW_PATH = /^\s*\|\s*`([^`]+)`/;

export interface CodeMapSlice {
  rows: string[];
  filtered: boolean;
}

export function codeMapForPhase(codeMap: string, phaseEntry: string): CodeMapSlice {
  const pathRows = codeMap.split("\n").flatMap((line) => {
    const path = TABLE_ROW_PATH.exec(line)?.[1];
    return path ? [{ path, line: line.trim() }] : [];
  });
  const matching = pathRows.filter((row) => phaseEntry.includes(row.path) || phaseEntry.includes(basename(row.path)));
  if (matching.length > 0) return { rows: matching.map((row) => row.line), filtered: true };
  return { rows: pathRows.map((row) => row.line), filtered: false };
}

function basename(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
}
