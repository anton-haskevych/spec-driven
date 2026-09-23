export interface TaskItem {
  section: string;
  checked: boolean;
  depth: number;
  text: string;
}

export interface CodeSpan {
  section: string;
  code: string;
}

export interface MarkdownOutline {
  tasks: TaskItem[];
  codeSpans: CodeSpan[];
}

const SECTION_LEVEL = 2;

export function outlineMarkdown(body: string): MarkdownOutline {
  const tasks: TaskItem[] = [];
  const codeSpans: CodeSpan[] = [];
  let section = "";

  Bun.markdown.render(body, {
    heading: (children, meta) => {
      if (meta.level === SECTION_LEVEL) section = children.trim();
      return children;
    },
    listItem: (children, meta) => {
      if (meta.checked !== undefined) {
        tasks.push({ section, checked: meta.checked, depth: meta.depth, text: children.trim() });
      }
      return children;
    },
    codespan: (children) => {
      codeSpans.push({ section, code: children });
      return children;
    },
  });

  return { tasks, codeSpans };
}
