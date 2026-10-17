import { marked } from 'marked';

/** Inspect table source before Markdown splits unescaped pipes into separate cells. */
export function unescapedTableLinks(markdown: string): string[] {
  const links: string[] = [];
  marked.walkTokens(marked.lexer(markdown, { gfm: true }), (token) => {
    if (token.type !== 'table') return;
    for (const match of token.raw.matchAll(/\[\[([^\]\n]+)\]\]/g)) {
      if (/(^|[^\\])(?:\\\\)*\|/.test(match[1])) links.push(match[0]);
    }
  });
  return links;
}
