import {CONTENT_COLLECTIONS} from './collections.js';
import path from 'node:path';
import {readdir, readFile, realpath, lstat, link, unlink, writeFile, rename, mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {Lexer} from 'marked';
import {loadLibrary, parseDocument, renderDocument, resolveDocument, safeAsset} from './library.mjs';

export class MoveError extends Error {
  constructor(message, status = 409) { super(message); this.status = status; }
}
const allowed = new Set(['inbox', 'notes'].filter(id => CONTENT_COLLECTIONS.includes(id)));
const external = value => /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value);
const assetPattern = /\.(?:png|jpe?g|gif|webp|svg|pdf|mp3|mp4)(?:#.*)?$/i;

// Only regular Markdown files are writable; never follow symbolic links.
async function markdownFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, {withFileTypes:true})) {
    if (entry.name.startsWith('.')) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(file));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(file);
  }
  return files;
}
async function regularFile(file, root) {
  const relative = path.relative(root, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw new MoveError('文件超出知识库范围。', 400);
  if ((await realpath(file)) !== file || !(await lstat(file)).isFile()) throw new MoveError('不支持移动符号链接或特殊文件。', 400);
}

// Mask code and HTML using Markdown tokens, including nested lists and quotes.
// The replacement keeps source offsets, formatting and code examples intact.
function protectedRanges(source) {
  const ranges = [];
  const visit = (tokens, start, end) => {
    let cursor = start;
    for (const token of tokens || []) {
      if (!token.raw) continue;
      const offset = source.indexOf(token.raw, cursor);
      if (offset < cursor || offset + token.raw.length > end) continue;
      const limit = offset + token.raw.length;
      if (['code','codespan','html'].includes(token.type) || (token.type === 'escape' && token.raw.includes('['))) ranges.push([offset, limit]);
      else {
        visit(token.tokens, offset, limit);
        if (token.items) visit(token.items, offset, limit);
        if (token.header) for (const cell of token.header) visit(cell.tokens, offset, limit);
        if (token.rows) for (const row of token.rows) for (const cell of row) visit(cell.tokens, offset, limit);
      }
      cursor = limit;
    }
  };
  visit(Lexer.lex(source), 0, source.length);
  return ranges;
}

async function rewriteSource(raw, doc, moved, destination, documents, root) {
  const newDoc = doc.id === moved.id && doc.path === moved.path ? {...doc, path:destination} : doc;
  const rewriteTarget = async (target, markdown = false) => {
    let value;
    try { value = markdown ? decodeURIComponent(target) : target; } catch { return target; }
    if (external(value)) return target;
    const hash = value.indexOf('#');
    const name = hash < 0 ? value : value.slice(0, hash), anchor = hash < 0 ? '' : value.slice(hash);
    if (assetPattern.test(value)) {
      if (newDoc === doc) return target;
      const before = await safeAsset(root, name, doc.path);
      const after = await safeAsset(root, name, newDoc.path);
      if (before && before.path !== after?.path) return (markdown ? before.path.split('/').map(encodeURIComponent).join('/') : before.path) + anchor;
      return target;
    }
    const resolved = resolveDocument(value, documents, doc).doc || documents.find(candidate =>
      path.resolve(root, path.dirname(doc.path), name) === path.join(root,candidate.path));
    if (!resolved) return target;
    if (resolved.id !== moved.id && newDoc === doc) return target;
    // Stable, vault-relative paths preserve Markdown and Obsidian resolution.
    // Short filename links already survive the move and are left untouched.
    if (!name.includes('/')) return target;
    let next = resolved.id === moved.id ? destination : resolved.path;
    if (!name.endsWith('.md')) next = next.replace(/\.md$/, '');
    if (doc.path.startsWith('../') && name.startsWith('.')) next = path.posix.relative(path.posix.dirname(doc.path), next);
    if (name.startsWith('content/')) next = 'content/' + next;
    if (name.startsWith('/')) next = '/' + next;
    return (markdown ? next.split('/').map(encodeURIComponent).join('/') : next) + anchor;
  };
  const front = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(raw)?.[0] || '';
  const body = raw.slice(front.length), ranges = protectedRanges(body), edits = [];
  // Wiki links, inline Markdown destinations and reference definitions.
  const pattern = /!?\[\[([^\]\n]+)\]\]|!?\[(?:\\.|[^\]\\\n])*\]\(\s*(?:<([^>\n]*)>|([^\s()]+))(?:\s+(?:"[^"\n]*"|'[^'\n]*'))?\s*\)|^ {0,3}\[[^\]\n]+\]:\s*(?:<([^>\n]*)>|(\S+))/gm;
  for (const match of body.matchAll(pattern)) {
    if (ranges.some(([a,b]) => match.index < b && match.index + match[0].length > a)) continue;
    const wiki = match[1] !== undefined;
    const target = wiki ? match[1].split(/\\?\|/)[0] : (match[2] ?? match[3] ?? match[4] ?? match[5]);
    const replacement = await rewriteTarget(target, !wiki);
    if (replacement !== target) {
      const offset = match.index + (wiki ? match[0].indexOf('[[') + 2 : match[0].indexOf(target, match[0].includes('](') ? match[0].indexOf('](') + 2 : match[0].indexOf(']:') + 2));
      edits.push({start:offset, end:offset + target.length, replacement});
    }
  }
  let rewritten = body;
  for (const edit of edits.reverse()) rewritten = rewritten.slice(0,edit.start) + edit.replacement + rewritten.slice(edit.end);
  let metadata = front;
  if (doc.parentTarget) {
    const parent = doc.parentTarget;
    const target = parent.replace(/^\[\[/,'').replace(/\]\]$/,'').split(/\\?\|/)[0];
    const next = await rewriteTarget(target);
    if (next !== target) {
      const line = /^parent:[^\r\n]*$/m.exec(front);
      if (!line || !line[0].includes(target)) throw new MoveError('parent 使用了复杂写法，请先改为单行文件引用再移动。');
      metadata = front.slice(0,line.index) + line[0].replace(target,next) + front.slice(line.index + line[0].length);
    }
  }
  return metadata + rewritten;
}

async function replaceFile(file, content, expected) {
  if (await readFile(file, 'utf8') !== expected) throw new MoveError('文件已被其他编辑修改，请刷新后重试。');
  const temp = file + '.move-' + randomUUID();
  try {
    const info = await lstat(file);
    await writeFile(temp, content, {flag:'wx', mode:info.mode});
    if (await readFile(file, 'utf8') !== expected) throw new MoveError('文件已被其他编辑修改，请刷新后重试。');
    await rename(temp, file);
  } finally { await unlink(temp).catch(() => {}); }
}

export async function moveDocument(root, {id, collection, version} = {}) {
  if (typeof id !== 'string' || !allowed.has(collection) || typeof version !== 'string') throw new MoveError('移动参数无效。',400);
  root = await realpath(root);
  const library = await loadLibrary(root);
  if (library.version !== version) throw new MoveError('知识库已更新，请刷新后重试。');
  const moved = library.documents.find(doc => doc.id === id);
  if (!moved || !allowed.has(moved.collection)) throw new MoveError('只能在 Inbox 和 Notes 之间切换。',400);
  if (moved.collection === collection) throw new MoveError('文档目录已变化，请刷新后重试。');
  const destination = `${collection}/${path.basename(moved.path)}`;
  const source = path.join(root, moved.path), target = path.join(root, destination);
  await regularFile(source, root);
  await mkdir(path.dirname(target),{recursive:true});
  if ((await realpath(path.dirname(target))) !== path.dirname(target)) throw new MoveError('目标目录不能是符号链接。',400);
  try { await lstat(target); throw new MoveError('目标目录已有同名文件，未覆盖。'); } catch (error) { if (error.code !== 'ENOENT') throw error; }

  const files = await markdownFiles(root);
  // Repository guides can also link to content/ paths. Include only Markdown
  // guides, never dependencies, generated builds or arbitrary project files.
  const project = path.dirname(root);
  if (path.basename(root) === 'content') {
    for (const entry of await readdir(project,{withFileTypes:true})) {
      if (entry.isFile() && entry.name.endsWith('.md')) files.push(path.join(project,entry.name));
      if (entry.isDirectory() && entry.name === 'docs') files.push(...await markdownFiles(path.join(project,entry.name)));
    }
  }
  const snapshots = await Promise.all(files.map(async file => ({file, raw:await readFile(file,'utf8')})));
  const documents = snapshots.map(({file,raw}) => parseDocument(raw, path.relative(root,file).split(path.sep).join('/')));
  // Resolve against the same collection scope as the reader; archived files can
  // contain incoming links, but cannot shadow a live document during resolution.
  const live = library.documents;
  const changes = [];
  for (let i=0; i<snapshots.length; i++) {
    const snapshot = snapshots[i], doc = documents[i];
    const next = await rewriteSource(snapshot.raw, doc, moved, destination, live, root);
    if (next !== snapshot.raw) {
      const before = renderDocument(doc,live), after = renderDocument(parseDocument(next,doc.id === moved.id && doc.path === moved.path ? destination : doc.path),live);
      const code = value => JSON.stringify(value.html.match(/<code\b[^>]*>[\s\S]*?<\/code>/g) || []);
      if (code(before) !== code(after)) throw new MoveError(`「${doc.title}」包含暂不支持自动迁移的代码上下文，未移动。`);
      changes.push({...snapshot, next});
    }
  }
  const nextDocuments = live.map(doc => {
    const entry = snapshots.find(item => item.file === path.join(root,doc.path));
    const change = changes.find(item => item.file === entry.file);
    return parseDocument(change?.next ?? entry.raw, doc.id === id ? destination : doc.path);
  });
  // Reject unsupported link syntax rather than leaving changed or broken targets.
  for (const before of live) {
    const after = renderDocument(nextDocuments.find(doc => doc.id === before.id), nextDocuments);
    const signature = doc => JSON.stringify(doc.references.map(({id,anchor,kind}) => ({id,anchor,kind})));
    const code = doc => JSON.stringify(doc.html.match(/<code\b[^>]*>[\s\S]*?<\/code>/g) || []);
    if (code(before) !== code(after) || signature(before) !== signature(after) || JSON.stringify(before.issues) !== JSON.stringify(after.issues)) throw new MoveError(`「${before.title}」包含暂不支持自动迁移的引用，未移动。`);
  }
  for (const snapshot of snapshots) {
    await regularFile(snapshot.file, snapshot.file.startsWith(root + path.sep) ? root : project);
    if (await readFile(snapshot.file,'utf8') !== snapshot.raw) throw new MoveError('文件已被其他编辑修改，请刷新后重试。');
  }
  if ((await loadLibrary(root)).version !== version) throw new MoveError('知识库已更新，请刷新后重试。');
  const applied = [];
  let linked = false, removed = false;
  try {
    // Hard-link creation refuses an existing destination, unlike rename().
    await link(source,target); linked = true;
    await unlink(source); removed = true;
    for (const change of changes) {
      const file = change.file === source ? target : change.file;
      await replaceFile(file, change.next, change.raw);
      applied.push({...change,file});
    }
    return await loadLibrary(root);
  } catch (error) {
    const failures = [];
    for (const change of applied.reverse()) {
      try { await replaceFile(change.file,change.raw,change.next); } catch (failure) { failures.push(failure); }
    }
    if (linked) {
      try { if (removed) await link(target,source); await unlink(target); } catch (failure) { failures.push(failure); }
    }
    if (failures.length) throw new MoveError('移动未完成，部分文件发生并发修改；已保留文件，请检查本地终端和 Git 差异。',500);
    throw error;
  }
}

export function isLocalWriteRequest(req) {
  const host = req.headers.host || '';
  return /^(?:127\.0\.0\.1|localhost):\d+$/.test(host)
    && req.headers.origin === `http://${host}`
    && req.headers['content-type']?.split(';')[0].trim() === 'application/json'
    && (!req.headers['sec-fetch-site'] || req.headers['sec-fetch-site'] === 'same-origin');
}
