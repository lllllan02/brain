import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import yaml from 'js-yaml';
import { Lexer, Parser, Renderer } from 'marked';
import hljs from 'highlight.js';
import { CONTENT_COLLECTIONS, collectionIcons, collectionStyle } from './collections.js';


export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const slug = text => text.replace(/<[^>]*>/g, '').replace(/[*`_]/g, '').trim().toLowerCase().replace(/\s+/g, '-');
const list = value => value == null ? [] : Array.isArray(value) ? value.map(String) : [String(value)];
export function parseDocument(raw, file) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const meta = match ? yaml.load(match[1], { schema: yaml.JSON_SCHEMA }) ?? {} : {};
  const body = match ? raw.slice(match[0].length) : raw;
  const id = path.basename(file, '.md');
  const collection = file.replaceAll(path.sep, '/').replace(/^content\//, '').split('/')[0];
  if (meta.category != null && typeof meta.category !== 'string') throw new Error(`文档 ${file} 的 category 必须是单个文本`);
  if (meta.parent != null && (typeof meta.parent !== 'string' || !meta.parent.trim())) throw new Error(`文档 ${file} 的 parent 必须是非空文本`);
  return { parentTarget: meta.parent?.trim() || null, id, collection, path: file.replaceAll(path.sep, '/'), title: String(meta.title || id), aliases: list(meta.aliases), tags: list(meta.tags), category: (meta.category || '').trim(), type: String(meta.type || list(meta.classes)[0] || 'note'), updated: meta.updated_at || null, created: meta.created_at || null, sources: [...new Set([...list(meta.source), ...list(meta.url), ...list(meta.URL)].map(value => value.trim()).filter(Boolean))], body, summary: String(meta.description || body.split(/\n\s*\n/).find(p => p.trim() && !p.startsWith('#')) || '').replace(/\[\[([^\]|]+)(?:\\?\|([^\]]+))?\]\]/g, (_, target, label) => label || target).replace(/[*`#]/g, '').slice(0, 200) };
}
async function walk(root, dir) {
  const files = [];
  let entries;
  try { entries = await readdir(path.join(root, dir), { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return files; throw error; }
  for (const entry of entries) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(root, file));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(file);
  }
  return files;
}
export function resolveDocument(target, documents, current) {
  const cleaned = target.replaceAll('\\|', '|').split('#')[0].replace(/\.md$/, '').replace(/^content\//, '').replace(/^\//, '');
  if (!cleaned) return { doc: current };
  const relative = current ? path.posix.normalize(path.posix.join(path.posix.dirname(current.path), cleaned)) : cleaned;
  const exact = documents.filter(d => d.path.replace(/\.md$/, '') === cleaned || (cleaned.startsWith('.') && d.path.replace(/\.md$/, '') === relative));
  const suffix = documents.filter(d => d.path.replace(/\.md$/, '').endsWith('/' + cleaned));
  const matches = exact.length ? exact : suffix.length ? suffix : documents.filter(d => d.id === cleaned || d.title === cleaned || d.aliases.includes(cleaned));
  return matches.length === 1 ? {doc: matches[0]} : {error: matches.length ? '目标不唯一' : '文档未收录'};
}
export async function safeAsset(root, target, currentPath = '') {
  const candidates = [path.resolve(root, target), path.resolve(root, path.dirname(currentPath), target), path.resolve(root, 'assets', target)];
  const base = await realpath(root);
  for (const candidate of candidates) {
    try {
      const resolved = await realpath(candidate);
      const relative = path.relative(base, resolved);
      if (relative.startsWith('..') || path.isAbsolute(relative) || !relative.split(path.sep).includes('assets')) continue;
      if ((await stat(resolved)).isFile()) return {file: resolved, path: relative.replaceAll(path.sep, '/')};
    } catch { /* Missing or outside allowed directory. */ }
  }
  return null;
}
// Parent remains an explicit metadata relationship; never infer it from body links.
function parentParts(value) {
  const raw = value.trim();
  const match = /^\[\[([^\]\n]+)\]\]$/.exec(raw);
  if (!match && /[\[\]\n]/.test(raw)) return null;
  const [target, label] = (match ? match[1] : raw).replaceAll('\\|', '|').split('|');
  return target.trim() ? {target: target.trim(), label: label?.trim()} : null;
}
function parentCycle(doc, documents) {
  const seen = new Set([doc.id]);
  let current = doc;
  while (current.parentTarget) {
    const parts = parentParts(current.parentTarget);
    if (!parts) return false;
    const next = resolveDocument(parts.target.split('#')[0], documents, current).doc;
    if (!next) return false;
    if (seen.has(next.id)) return true;
    seen.add(next.id); current = next;
  }
  return false;
}
export function renderDocument(doc, documents) {
  const toc = [], references = [], issues = [], counts = new Map();
  const headingId = text => { const base = slug(text); const n = counts.get(base) || 0; counts.set(base, n + 1); return base + (n ? '-' + n : ''); };
  const options = {gfm: true, breaks: false, renderer: new Renderer(), extensions: {inline: [], startInline: [], renderers: {}}};
  const wiki = (target, label, embed) => {
    const [name, anchor = ''] = target.split('#');
    const result = resolveDocument(name, documents, doc);
    if (!result.doc) { issues.push({target, reason: result.error}); return `<span class="broken-link" title="${escape(result.error)}">${escape(label || target)} ⊘</span>`; }
    const dest = result.doc;
    const block = anchor.startsWith('^');
    const exists = !anchor || (block ? new RegExp('\\^' + anchor.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\s|$)').test(dest.body) : dest.body.split('\n').some(line => /^#{1,6}\s/.test(line) && slug(line.replace(/^#{1,6}\s+/, '')) === slug(anchor)));
    if (!exists) { issues.push({target, reason: '章节或块不存在'}); return `<span class="broken-link" title="章节或块不存在">${escape(label || target)} ⊘</span>`; }
    const referenceId = 'reference-' + references.length;
    references.push({id: dest.id, anchor, target, referenceId});
    const href = `#/doc/${encodeURIComponent(dest.id)}${anchor ? '/' + encodeURIComponent(block ? anchor : slug(anchor)) : ''}`;
    const collection = collectionIcons[dest.collection];
    const text = escape(label || dest.title);
    const icon = collection ? `<svg class="internal-link-icon" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="${escape(collection.path)}"/></svg>` : '';
    const {color, opacity} = collectionStyle(dest.collection).link;
    const linkStyle = ` style="--link-color:${color};--link-opacity:${opacity}"`;
    const provenance = collection ? ` data-collection="${dest.collection}" title="${escape(collection.label)}" aria-label="${text}（${escape(collection.label)}）"` : '';
    const link = `<a class="wiki-link" id="${referenceId}" href="${href}"${provenance}${linkStyle}>${icon}${text}</a>`;
    return embed ? `<span class="embed-card">${link}<span>${escape(dest.summary)}</span></span>` : link;
  };
  const config = {extensions:[{name:'wiki', level:'inline', start: src => src.indexOf('[['), tokenizer(src) { const m = /^(!?)\[\[([^\]\n]+)\]\]/.exec(src); if (m) return {type:'wiki', raw:m[0], value:m[2], embed:Boolean(m[1])}; }, renderer(token) { const [target, label] = token.value.replaceAll('\\|','|').split('|'); if (/\.(png|jpe?g|gif|webp|svg|pdf|mp3|mp4)$/i.test(target)) { const url = `/api/asset?path=${encodeURIComponent(target)}&from=${encodeURIComponent(doc.path)}`; return token.embed && /\.(png|jpe?g|gif|webp)$/i.test(target) ? `<img loading="lazy" src="${url}" alt="${escape(label || target)}">` : `<a href="${url}" target="_blank" rel="noopener">${escape(label || target)} ↗</a>`; } return wiki(target, label, token.embed); }}], renderer:{
    html: text => escape(text),
    heading(text, level, raw) { const id = headingId(raw); toc.push({id, title: raw.replace(/[*`]/g,''), level}); return `<h${level} id="${escape(id)}">${text}</h${level}>`; },
    paragraph(text) { const block = text.match(/\s*\^([\w-]+)\s*$/); return `<p${block ? ` id="^${escape(block[1])}"` : ''}>${block ? text.slice(0, block.index) : text}</p>`; },
    code(code, language) {
      const lang = (language || '').trim().split(/\s/)[0];
      if (lang.toLowerCase() === 'mermaid') {
        return `<div class="code-block diagram-block"><div class="code-header"><span>Mermaid</span><button type="button" class="copy-code" title="复制源码" aria-label="复制源码"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="copy-glyph" d="M9 9h12v12H9ZM5 15H3V3h12v2"/><path class="copied-glyph" d="m5 12 4 4L19 6"/></svg></button></div><p class="diagram-status" role="status">正在绘制图表…</p><div class="diagram-canvas" hidden tabindex="0" role="region" aria-label="图表，可横向滚动"></div><details class="diagram-source" open><summary>查看源码</summary><pre><code>${escape(code)}</code></pre></details></div>`;
      }
      const value = lang && hljs.getLanguage(lang) ? hljs.highlight(code, {language:lang}).value : escape(code);
      return `<div class="code-block"><div class="code-header"><span>${escape(lang || 'text')}</span><button type="button" class="copy-code" title="复制代码" aria-label="复制代码"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="copy-glyph" d="M9 9h12v12H9ZM5 15H3V3h12v2"/><path class="copied-glyph" d="m5 12 4 4L19 6"/></svg></button></div><pre><code>${value}</code></pre></div>`;
    },
    link(href, title, text) { if (/^(https?:|mailto:)/i.test(href)) return `<a href="${escape(href)}" target="_blank" rel="noopener noreferrer">${text} ↗</a>`; if (href.startsWith('#')) return `<a href="#/doc/${encodeURIComponent(doc.id)}/${encodeURIComponent(slug(decodeURIComponent(href.slice(1))))}">${text}</a>`; if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return `<span>${text}</span>`; if (/\.(png|jpe?g|gif|webp|pdf|mp3|mp4)(?:#|$)/i.test(href)) return `<a href="/api/asset?path=${encodeURIComponent(href)}&from=${encodeURIComponent(doc.path)}" target="_blank" rel="noopener">${text} ↗</a>`; return wiki(decodeURIComponent(href), text.replace(/<[^>]*>/g,''), false); },
    image(href, title, text) { if (/^(https?:|data:|javascript:)/i.test(href)) return `<span class="broken-link">外部图片：${escape(text)}</span>`; return `<img loading="lazy" src="/api/asset?path=${encodeURIComponent(href)}&from=${encodeURIComponent(doc.path)}" alt="${escape(text)}">`; },
    table(header, body) { return `<div class="table-wrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`; }
  }};
  Object.assign(options.renderer, config.renderer);
  options.renderer.options = options;
  for (const extension of config.extensions) { options.extensions.inline.push(extension.tokenizer); options.extensions.startInline.push(extension.start); options.extensions.renderers[extension.name] = extension.renderer; }
  let parent = null;
  if (doc.parentTarget) {
    const parts = parentParts(doc.parentTarget);
    if (!parts) issues.push({target: doc.parentTarget, reason: 'parent 格式无效'});
    else if (parentCycle(doc, documents)) issues.push({target: doc.parentTarget, reason: 'parent 存在自引用或循环'});
    else {
      const before = references.length;
      wiki(parts.target, parts.label, false);
      if (references.length > before) {
        const ref = references[before];
        ref.kind = 'parent';
        const dest = documents.find(d => d.id === ref.id);
        parent = {...ref, title: parts.label || (ref.anchor ? `${dest.title} · ${ref.anchor}` : dest.title),
          href: `#/doc/${encodeURIComponent(ref.id)}${ref.anchor ? '/' + encodeURIComponent(ref.anchor.startsWith('^') ? ref.anchor : slug(ref.anchor)) : ''}`};
      }
    }
  }
  const html = Parser.parse(Lexer.lex(doc.body, options), options);
  return {...doc, html, toc, references, issues, parent};
}
export async function loadLibrary(root) {
  const files = (await Promise.all(CONTENT_COLLECTIONS.map(dir => walk(root, dir)))).flat().sort();
  const docs = await Promise.all(files.map(async file => {
    const absolute = path.join(root, file);
    const [raw, info] = await Promise.all([readFile(absolute, 'utf8'), stat(absolute)]);
    return {...parseDocument(raw, file), modified: new Date(Math.floor(info.mtimeMs / 1000) * 1000).toISOString()};
  }));
  const ids = new Set();
  for (const d of docs) { if (ids.has(d.id)) throw new Error(`文档文件名重复：${d.id}`); ids.add(d.id); }
  const documents = docs.map(d => renderDocument(d, docs));
  for (const d of documents) d.backlinks = documents.filter(other => other.id !== d.id && other.references.some(r => r.id === d.id)).map(other => other.id);
  return {version:createHash('sha256').update(JSON.stringify(documents)).digest('hex').slice(0,16), documents};
}
