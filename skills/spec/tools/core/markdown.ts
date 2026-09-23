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

export interface Paragraph {
  section: string;
  text: string;
}

export interface MarkdownOutline {
  tasks: TaskItem[];
  codeSpans: CodeSpan[];
  paragraphs: Paragraph[];
}

const SECTION_LEVEL = 2;

export function outlineMarkdown(body: string): MarkdownOutline {
  const outline: MarkdownOutline = { tasks: [], codeSpans: [], paragraphs: [] };
  let section = "";

  Bun.markdown.render(body, {
    heading: (children, meta) => {
      if (meta.level === SECTION_LEVEL) section = children.trim();
      return children;
    },
    listItem: (children, meta) => {
      if (meta.checked !== undefined) {
        outline.tasks.push({ section, checked: meta.checked, depth: meta.depth, text: children.trim() });
      }
      return children;
    },
    codespan: (children) => {
      outline.codeSpans.push({ section, code: children });
      return children;
    },
    paragraph: (children) => {
      outline.paragraphs.push({ section, text: children.trim() });
      return children;
    },
  });

  return outline;
}
