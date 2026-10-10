import {externalLink} from './external-links.js';

// Source labels are plain text, never rendered as arbitrary Markdown or HTML.
export function documentSources(values = []) {
  const sources = new Map();
  for (const value of values) {
    const text = String(value).trim();
    if (!text) continue;
    const match = /^\[([^\]]+)\]\((\S+)\)(.*)$/.exec(text);
    const link = externalLink(match ? match[2] : text);
    const title = match ? match[1] + match[3] : text;
    const key = link?.href || text;
    if (!sources.has(key)) sources.set(key, {title, href: link?.href || null});
  }
  return [...sources.values()];
}

export function copyDocumentMarkdown(node) {
  const sources = documentSources(node.sources).map(({title, href}) => href ? `[${title}](${href})` : title);
  return `# ${node.title}\n\n${sources.length ? `来源：${sources.join('；')}\n\n` : ''}${node.body}`;
}
