// Walk the original tree rather than a cloned fragment: a partial selection must
// still know its enclosing list, link, emphasis and code language.
export function selectionMarkdown(article: Element, range: Range): string {
  const ignored =
    '.internal-link-icon, .copy-code, .code-header, .diagram-canvas, .diagram-status, summary';
  const fence = (text: string, minimum: number) =>
    '`'.repeat(Math.max(minimum, ...[...text.matchAll(/`+/g)].map((match) => match[0].length + 1)));
  const escapeText = (text: string) => text.replace(/[\\`*_[\]<>~]/g, '\\$&');
  const children = (node: Node, literal = false): string =>
    [...node.childNodes]
      .map((child) => visit(child, literal))
      .reduce(
        (result, next) =>
          !literal && result.endsWith('\n') && next.startsWith('\n')
            ? result.replace(/\n+$/, '\n\n') + next.replace(/^\n+/, '')
            : result + next,
        '',
      );
  const visit = (node: Node, literal = false): string => {
    if (!range.intersectsNode(node)) return '';
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent || '').slice(
        node === range.startContainer ? range.startOffset : 0,
        node === range.endContainer ? range.endOffset : undefined,
      );
      if (
        !literal &&
        !text.trim() &&
        node.parentElement?.matches(
          'article, div, section, ul, ol, table, thead, tbody, tr, blockquote',
        )
      )
        return '';
      return literal ? text : escapeText(text);
    }
    if (!(node instanceof Element) || node.matches(ignored)) return '';
    const tag = node.tagName.toLowerCase();
    const source = node.getAttribute('data-copy-source');
    if (source) {
      if (tag === 'img') return source;
      const selected = children(node, true).replace(/ [↗⊘]$/, '');
      if (!selected) return '';
      const full = (node.textContent || '').replace(/ [↗⊘]$/, '');
      if (selected === full) return source;
      const wiki = /^!?\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/.exec(source.replaceAll('\\|', '|'));
      if (wiki) return `[[${wiki[1]}|${selected.replaceAll('|', '\\|')}]]`;
      return escapeText(selected);
    }
    if (tag === 'pre') {
      const text = children(node, true);
      if (!text) return '';
      const language =
        node.closest('.code-block')?.querySelector('.code-header span')?.textContent || '';
      const marker = fence(text, 3);
      return `\n\n${marker}${language === 'text' ? '' : language.toLowerCase()}\n${text.replace(/\n$/, '')}\n${marker}\n\n`;
    }
    if (tag === 'ul' || tag === 'ol') {
      const items = [...node.children].filter((child) => child.tagName === 'LI');
      const start = Number(node.getAttribute('start') || 1);
      const lines = items
        .map((item, index) => {
          const text = children(item).trim();
          if (!text) return '';
          const ownText = [...item.childNodes]
            .filter((child) => !(child instanceof Element && child.matches('ul, ol')))
            .map((child) => visit(child))
            .join('')
            .trim();
          if (!ownText) return text;
          const prefix = tag === 'ol' ? `${start + index}. ` : '- ';
          const checkbox = item.querySelector(
            ':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]',
          );
          const task = checkbox ? (checkbox.hasAttribute('checked') ? '[x] ' : '[ ] ') : '';
          return prefix + task + text.replaceAll('\n', '\n' + ' '.repeat(prefix.length));
        })
        .filter(Boolean);
      return lines.length ? `\n\n${lines.join('\n')}\n\n` : '';
    }
    if (tag === 'table') {
      const rows = [...node.querySelectorAll('tr')]
        .map((row) => ({
          header: Boolean(row.querySelector('th')),
          cells: [...row.children].map((cell) =>
            children(cell)
              .trim()
              .replace(/(?<!\\)\|/g, '\\|')
              .replaceAll('\n', '<br>'),
          ),
        }))
        .filter((row) => row.cells.some(Boolean));
      if (!rows.length) return '';
      const width = Math.max(...rows.map((row) => row.cells.length));
      const line = (cells: string[]) => `| ${cells.join(' | ')} |`;
      if (!rows[0].header) rows.unshift({ header: true, cells: Array<string>(width).fill('') });
      return (
        '\n\n' +
        [
          line(rows[0].cells),
          line(Array<string>(width).fill('---')),
          ...rows.slice(1).map((row) => line(row.cells)),
        ].join('\n') +
        '\n\n'
      );
    }
    const text = children(node, literal || tag === 'code');
    if (tag === 'br') return '  \n';
    if (tag === 'hr') return '\n\n---\n\n';
    if (!text) return '';
    if (tag === 'a' || node.hasAttribute('data-copy-href')) {
      const label = text.replace(/ ↗$/, '');
      const href = node.getAttribute('data-copy-href') || node.getAttribute('href');
      const title = node.getAttribute('data-copy-title');
      return href
        ? `[${label}](<${href.replaceAll('>', '%3E')}>${title ? ` "${title.replaceAll('"', '\\"')}"` : ''})`
        : label;
    }
    if (tag === 'code') {
      if (literal) return text;
      const marker = fence(text, 1);
      const pad = /^[` ]|[` ]$/.test(text) ? ' ' : '';
      return `${marker}${pad}${text}${pad}${marker}`;
    }
    if (tag === 'strong' || tag === 'b') return `**${text}**`;
    if (tag === 'em' || tag === 'i') return `*${text}*`;
    if (tag === 'del' || tag === 's') return `~~${text}~~`;
    if (/^h[1-6]$/.test(tag)) return `\n\n${'#'.repeat(Number(tag[1]))} ${text}\n\n`;
    if (tag === 'blockquote')
      return `\n\n${text
        .trim()
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')}\n\n`;
    if (tag === 'p') return `\n\n${text}\n\n`;
    return text;
  };
  return children(article).trim();
}
