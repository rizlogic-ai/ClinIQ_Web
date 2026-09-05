import type { ReactNode } from "react";

/**
 * Renders the markdown subset the AI colleague is asked to produce —
 * headings, bullets, numbered steps, bold and inline code.
 *
 * Builds React nodes rather than setting innerHTML: the text comes from a
 * language model, so it must never be able to inject markup.
 */
export function ClinicalAnswer({ text }: { text: string }) {
  return <div className="clinical-answer">{renderBlocks(text)}</div>;
}

function renderBlocks(text: string): ReactNode[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let key = 0;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(<p key={key++}>{inline(paragraph.join(" "))}</p>);
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    const items = list.items.map((item, i) => <li key={i}>{inline(item)}</li>);
    blocks.push(list.ordered ? <ol key={key++}>{items}</ol> : <ul key={key++}>{items}</ul>);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push(<h4 key={key++}>{inline(heading[2])}</h4>);
      continue;
    }

    // A bold-only line is a section label when it's short and label-like.
    // The opening impression is also bold but is a full sentence, so it stays
    // a paragraph and gets the lead treatment instead.
    const boldOnly = /^\*\*(.+?)\*\*:?\s*$/.exec(line.trim());
    if (boldOnly) {
      flushParagraph();
      flushList();
      const label = boldOnly[1];
      const isLabel = label.length <= 45 && !/[.?!]$/.test(label);
      blocks.push(
        isLabel ? (
          <h4 key={key++}>{label}</h4>
        ) : (
          <p key={key++} className="clinical-lead">
            {label}
          </p>
        )
      );
      continue;
    }

    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      flushParagraph();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1]);
      continue;
    }

    // A wrapped continuation of the previous list item.
    if (list && /^\s{2,}\S/.test(raw)) {
      list.items[list.items.length - 1] += ` ${line.trim()}`;
      continue;
    }

    flushList();
    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  return blocks;
}

/** Bold and inline code within a line. */
function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*.+?\*\*|__.+?__|`[^`]+`)/g;
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("`")) {
      parts.push(<code key={key++}>{token.slice(1, -1)}</code>);
    } else {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
