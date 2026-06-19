/**
 * Convert clipboard HTML to markdown.
 * Handles the common cases from GFG, MDN, docs sites:
 * lists, bold, italic, inline code, code blocks, headings, paragraphs.
 */
function nodeToMd(node: Node, listType?: 'ul' | 'ol', listIdx?: { n: number }): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }

  const el = node as Element;
  const tag = el.tagName?.toLowerCase();
  const inner = () => Array.from(node.childNodes).map(c => nodeToMd(c)).join('');

  switch (tag) {
    case 'p':
      return inner().trim() + '\n\n';

    case 'br':
      return '\n';

    case 'strong': case 'b':
      return `**${inner()}**`;

    case 'em': case 'i':
      return `*${inner()}*`;

    case 'code': {
      // If parent is <pre>, don't double-wrap
      const parentTag = (el.parentElement?.tagName ?? '').toLowerCase();
      if (parentTag === 'pre') return inner();
      return `\`${inner()}\``;
    }

    case 'pre': {
      const text = el.textContent ?? '';
      return `\`\`\`\n${text.trim()}\n\`\`\`\n\n`;
    }

    case 'ul': {
      const items = Array.from(el.children)
        .map(li => `- ${nodeToMd(li).trim()}`)
        .join('\n');
      return items + '\n\n';
    }

    case 'ol': {
      const items = Array.from(el.children)
        .map((li, i) => `${i + 1}. ${nodeToMd(li).trim()}`)
        .join('\n');
      return items + '\n\n';
    }

    case 'li':
      return Array.from(node.childNodes).map(c => nodeToMd(c)).join('').trim();

    case 'h1': return `# ${inner().trim()}\n\n`;
    case 'h2': return `## ${inner().trim()}\n\n`;
    case 'h3': return `### ${inner().trim()}\n\n`;
    case 'h4': case 'h5': case 'h6':
      return `**${inner().trim()}**\n\n`;

    case 'blockquote':
      return inner().trim().split('\n').map(l => `> ${l}`).join('\n') + '\n\n';

    case 'hr':
      return '\n---\n\n';

    case 'sup': {
      // Strip citation superscripts like [1], [2] from Wikipedia/docs sites
      const supText = (el.textContent ?? '').trim().replace(/^\[|\]$/g, '');
      if (/^\d+$/.test(supText)) return '';
      return inner();
    }

    case 'a': {
      const href = el.getAttribute('href') ?? '';
      const text = inner().trim();
      if (!text) return '';
      // Fragment-only links (#footnote) — just the text
      if (!href || href.startsWith('#')) return text;
      // Real URLs — render as markdown link
      return `[${text}](${href})`;
    }

    // Structural wrappers — just recurse
    case 'div': case 'section': case 'article':
    case 'span': case 'td': case 'th':
    case 'header': case 'footer': case 'main':
      return inner();

    case 'tr':
      return inner() + '\n';

    case 'table':
      return inner() + '\n';

    default:
      return tag ? inner() : (node.textContent ?? '');
  }
}

export function htmlToMarkdown(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return nodeToMd(div)
    .replace(/\n{3,}/g, '\n\n') // collapse excess blank lines
    .trim();
}

/**
 * Call this in an onPaste handler on a textarea.
 * If the clipboard has HTML, converts it to markdown and inserts it.
 * If not, lets the default paste proceed unchanged.
 * Returns the new value if handled, null if not.
 */
export function pasteAsMarkdown(
  e: React.ClipboardEvent<HTMLTextAreaElement>,
  currentValue: string,
): string | null {
  const html = e.clipboardData.getData('text/html');
  if (!html) return null;

  e.preventDefault();
  const md = htmlToMarkdown(html);
  const ta = e.currentTarget;
  return currentValue.slice(0, ta.selectionStart) + md + currentValue.slice(ta.selectionEnd);
}
